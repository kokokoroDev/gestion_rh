import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import models from "../db/models/index.js";

const { NoteFrais, NoteFraisLine, Salarie, SalarieRoleModule, Role, Module } = models;

const includeLines = {
    model:      NoteFraisLine,
    as:         "lines",
    attributes: ["id", "date", "lieu", "heure_depart", "destination", "montant", "observation"],
};

const includeSalarie = {
    model:      Salarie,
    as:         "salarie",
    attributes: ["id", "prenom", "nom", "email"],
    include: [
        {
            model:      SalarieRoleModule,
            as:         "roleModules",
            attributes: ["id", "module_id"],
            include: [
                { model: Role, as: "roleRef", attributes: ["name"] },
                { model: Module, as: "module", attributes: ["id", "libelle"] },
            ],
        },
    ],
};

const formatDateFr = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
};

const monthLabel = (month, year) =>
    new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));

const safe = (value) => (value === null || value === undefined || value === "" ? "" : String(value));

const getFunctionAndModule = (salarie) => {
    const roleModules = salarie?.roleModules ?? [];
    const roleNames = roleModules.map((item) => item.roleRef?.name).filter(Boolean);

    let functionLabel = "Fonctionnaire";
    if (roleNames.includes("rh")) functionLabel = "RH";
    else if (roleNames.includes("manager")) functionLabel = "Manager";
    else if (roleNames.includes("team_lead")) functionLabel = "Team Lead";

    const moduleLabel = roleModules.find((item) => item.module?.libelle)?.module?.libelle ?? "";

    return {
        functionLabel,
        moduleLabel,
        serviceLabel: moduleLabel ? `${moduleLabel} / ${functionLabel}` : functionLabel,
    };
};

const toMonthYear = (query = {}) => {
    const now = new Date();
    const month = Number(query.month || now.getMonth() + 1);
    const year = Number(query.year || now.getFullYear());
    if (month < 1 || month > 12) throw new Error("Mois invalide");
    if (year < 2000 || year > 2100) throw new Error("Annee invalide");
    return { month, year };
};

const drawCell = (doc, x, y, width, height, text, options = {}) => {
    doc.rect(x, y, width, height).stroke("#404040");
    doc
        .font(options.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(options.fontSize || 9)
        .fillColor(options.color || "#000000")
        .text(text, x + 4, y + 5, {
            width: width - 8,
            height: height - 8,
            align: options.align || "left",
        });
};

export const getOrCreateMyNote = async (query, salarieInfo) => {
    const { month, year } = toMonthYear(query);
    const [note] = await NoteFrais.findOrCreate({
        where: { salarie_id: salarieInfo.id, month, year },
        defaults: { salarie_id: salarieInfo.id, month, year, status: "draft" },
    });
    return note.reload({ include: [includeLines] });
};

export const saveMyNoteLines = async (query, salarieInfo, lines = []) => {
    const note = await getOrCreateMyNote(query, salarieInfo);
    if (note.status === "reviewed") throw new Error("Cette note est deja traitee par RH");

    await NoteFraisLine.destroy({ where: { note_frais_id: note.id } });
    const cleaned = (Array.isArray(lines) ? lines : []).filter((line) => line?.date && line?.lieu && line?.destination);

    if (cleaned.length > 0) {
        await NoteFraisLine.bulkCreate(
            cleaned.map((line) => ({
                note_frais_id: note.id,
                date:          line.date,
                lieu:          line.lieu,
                heure_depart:  line.heure_depart || "00:00",
                destination:   line.destination,
                montant:       Number(line.montant || 0),
                observation:   line.observation || null,
            }))
        );
    }

    if (note.status !== "draft") {
        note.status = "draft";
        note.sent_at = null;
        await note.save();
    }

    return note.reload({ include: [includeLines] });
};

export const sendMyNoteToRh = async (id, salarieInfo) => {
    const note = await NoteFrais.findByPk(id, { include: [includeLines] });
    if (!note) throw new Error("Note de frais introuvable");
    if (note.salarie_id !== salarieInfo.id) throw new Error("Acces refuse");
    if (note.status === "reviewed") throw new Error("Cette note est deja traitee");
    if (!note.lines?.length) throw new Error("Ajoutez au moins une ligne avant l'envoi a RH");

    note.status = "sent";
    note.sent_at = new Date();
    await note.save();
    return note;
};

export const getRhInbox = async (query = {}) => {
    const where = { status: "sent" };
    if (query.status && ["sent", "reviewed", "draft"].includes(query.status)) where.status = query.status;

    return NoteFrais.findAll({
        where,
        include: [includeSalarie, includeLines],
        order: [["updated_at", "DESC"]],
    });
};

export const markAsReviewed = async (id) => {
    const note = await NoteFrais.findByPk(id);
    if (!note) throw new Error("Note de frais introuvable");
    note.status = "reviewed";
    await note.save();
    return note;
};

export const generateMyNotePdf = async (id, salarieInfo) => {
    const note = await NoteFrais.findByPk(id, { include: [includeSalarie, includeLines] });
    if (!note) throw new Error("Note de frais introuvable");

    const isOwner = note.salarie_id === salarieInfo.id;
    const isRH = (salarieInfo.roles ?? []).some((item) => item.role === "rh");
    if (!isOwner && !isRH) throw new Error("Acces refuse");

    const { serviceLabel } = getFunctionAndModule(note.salarie);

    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.on("data", (chunk) => chunks.push(chunk));

    const logoPath = path.resolve("storage", "branding", "skatys-logo.png");
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 26, { fit: [175, 58] });
    }

    doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#000000")
        .text("Fiche de deplacements du personnel", 210, 48, { width: 315, align: "center" });

    drawCell(doc, 40, 94, 78, 26, "Nom :", { bold: true });
    drawCell(doc, 118, 94, 128, 26, safe(note.salarie?.nom));
    drawCell(doc, 246, 94, 78, 26, "Prenom :", { bold: true });
    drawCell(doc, 324, 94, 128, 26, safe(note.salarie?.prenom));
    drawCell(doc, 452, 94, 73, 26, "Mois :", { bold: true });
    drawCell(doc, 525, 94, 50, 26, safe(monthLabel(note.month, note.year)), { fontSize: 8 });

    drawCell(doc, 40, 120, 78, 26, "Service :", { bold: true });
    drawCell(doc, 118, 120, 457, 26, serviceLabel);

    const tableX = 40;
    const widths = [62, 94, 68, 94, 66, 131];
    const headers = ["Date", "Lieu Depart", "Heure Depart", "Destination", "Montant", "Observations"];
    let y = 166;

    let cursor = tableX;
    headers.forEach((header, index) => {
        drawCell(doc, cursor, y, widths[index], 30, header, { bold: true, align: "center" });
        cursor += widths[index];
    });

    y += 30;
    let total = 0;

    for (const line of note.lines || []) {
        if (y > 640) {
            doc.addPage();
            y = 60;
            cursor = tableX;
            headers.forEach((header, index) => {
                drawCell(doc, cursor, y, widths[index], 30, header, { bold: true, align: "center" });
                cursor += widths[index];
            });
            y += 30;
        }

        const values = [
            formatDateFr(line.date),
            safe(line.lieu),
            safe(line.heure_depart),
            safe(line.destination),
            Number(line.montant || 0).toFixed(2),
            safe(line.observation),
        ];

        cursor = tableX;
        values.forEach((value, index) => {
            drawCell(doc, cursor, y, widths[index], 28, value, { fontSize: 8.5 });
            cursor += widths[index];
        });

        total += Number(line.montant || 0);
        y += 28;
    }

    drawCell(doc, 40, y + 10, 280, 28, "Total", { bold: true });
    drawCell(doc, 320, y + 10, 255, 28, `${total.toFixed(2)} MAD`, { bold: true, align: "right" });

    const visaY = Math.max(y + 62, 698);
    const visaWidth = 129;
    const visaLabels = [
        "Date et Visa Demandeur",
        "Date et Visa Resp. Hierarchique",
        "Date et Visa Manager",
        "Date et Visa DRH",
    ];

    visaLabels.forEach((label, index) => {
        const x = 40 + (index * 134);
        drawCell(doc, x, visaY, visaWidth, 24, label, { bold: true, align: "center", fontSize: 8 });
        doc.rect(x, visaY + 24, visaWidth, 62).stroke("#404040");
    });

    doc.end();

    const buffer = await new Promise((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return { buffer, fileName: `note_frais_${note.month}_${note.year}.pdf` };
};
