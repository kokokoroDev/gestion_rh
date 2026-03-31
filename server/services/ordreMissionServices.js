import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import models from "../db/models/index.js";

const { OrdreMission, Salarie, Client, SalarieRoleModule, Role, Module } = models;

const salarieInclude = {
    model:      Salarie,
    as:         "salarie",
    attributes: ["id", "prenom", "nom", "cin", "email"],
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

const clientInclude = {
    model:      Client,
    as:         "client",
    attributes: ["id", "name"],
};

const getFunctionAndModule = (salarie) => {
    const roleModules = salarie?.roleModules ?? [];
    const roleNames = roleModules.map((item) => item.roleRef?.name).filter(Boolean);

    let functionLabel = "Fonctionnaire";
    if (roleNames.includes("rh")) functionLabel = "RH";
    else if (roleNames.includes("manager")) functionLabel = "Manager";
    else if (roleNames.includes("team_lead")) functionLabel = "Team Lead";

    const moduleLabel = roleModules.find((item) => item.module?.libelle)?.module?.libelle ?? "";

    return { functionLabel, moduleLabel };
};

const formatDateFr = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
};

const safeText = (value) => (value && value.toString().trim() ? value.toString().trim() : "");

const drawSectionTitle = (doc, y, label) => {
    doc.roundedRect(68, y, 250, 16, 0).fillOpacity(0.35).fill("#B7BCD8").fillOpacity(1);
    doc
        .fillColor("#162D7C")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(label, 76, y + 3);
};

const drawLineField = (doc, y, label, value, x = 72, valueX = 190, lineTo = 525) => {
    doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10.5)
        .text(label, x, y);
    doc
        .font("Helvetica-Bold")
        .text(safeText(value), valueX, y, { width: lineTo - valueX });
    doc.moveTo(valueX, y + 13).lineTo(lineTo, y + 13).stroke("#4A4A4A");
};

export const createOrdreMission = async (data, salarieInfo) => {
    const required = [
        "direction_depart",
        "date_mission",
        "heure_depart",
        "heure_fin",
        "nature_mission",        "destination_label",
    ];

    for (const key of required) {
        if (!data?.[key]?.toString().trim()) throw new Error(`Champ requis: ${key}`);
    }

    if (data.client_id) {
        const client = await Client.findByPk(data.client_id);
        if (!client) throw new Error("Client introuvable");
    }

    const created = await OrdreMission.create({
        salarie_id:        salarieInfo.id,
        client_id:         data.client_id || null,
        direction_depart:  data.direction_depart.trim(),
        date_mission:      data.date_mission,
        heure_depart:      data.heure_depart,
        heure_fin:         data.heure_fin,
        nature_mission:    data.nature_mission.trim(),
        vehicule:          data.vehicule?.trim() || null,
        destination_label: data.destination_label.trim(),
    });

    return created.reload({ include: [salarieInclude, clientInclude] });
};

export const getMyOrdresMission = async (salarieInfo) => {
    return OrdreMission.findAll({
        where: { salarie_id: salarieInfo.id },
        include: [clientInclude],
        order: [["created_at", "DESC"]],
    });
};

export const getOrdreMissionById = async (id, salarieInfo) => {
    const ordre = await OrdreMission.findByPk(id, { include: [salarieInclude, clientInclude] });
    if (!ordre) throw new Error("Ordre de mission introuvable");

    const isOwner = ordre.salarie_id === salarieInfo.id;
    const isRH = (salarieInfo.roles ?? []).some((item) => item.role === "rh");
    if (!isOwner && !isRH) throw new Error("Acces refuse");
    return ordre;
};

export const generateOrdreMissionPdf = async (id, salarieInfo) => {
    const ordre = await getOrdreMissionById(id, salarieInfo);
    const { functionLabel, moduleLabel } = getFunctionAndModule(ordre.salarie);

    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.on("data", (chunk) => chunks.push(chunk));

    const logoPath = path.resolve("storage", "branding", "skatys-logo.png");

    doc.lineWidth(1);
    doc.rect(36, 36, 523, 760).stroke("#3B3B3B");
    doc.rect(36, 36, 160, 74).stroke("#3B3B3B");
    doc.rect(196, 36, 223, 74).stroke("#3B3B3B");
    doc.rect(419, 36, 140, 74).stroke("#3B3B3B");

    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 42, 40, { fit: [148, 64] });
    }

    doc
        .fillColor("#162D7C")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("Ordre de Mission", 196, 66, { width: 223, align: "center" });

    doc
        .fillColor("#162D7C")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Reference :", 430, 54)
        .text("Page :", 430, 78);
    doc
        .font("Helvetica")
        .text("01", 500, 54)
        .text("1", 500, 78);

    drawSectionTitle(doc, 128, "I- Identification Personnelle :");

    const nom = safeText(ordre.salarie?.nom);
    const prenom = safeText(ordre.salarie?.prenom);
    const fonctionFull = moduleLabel ? `${functionLabel} ${moduleLabel}` : functionLabel;

    drawLineField(doc, 162, "Nom & Prenom :", `${nom} ${prenom}`);
    drawLineField(doc, 188, "Fonction :", fonctionFull);
    drawLineField(doc, 214, "Direction/Depart :", ordre.direction_depart);

    drawSectionTitle(doc, 248, "II- Details de la Mission :");

    drawLineField(doc, 282, "Date Mission :", formatDateFr(ordre.date_mission));
    drawLineField(doc, 308, "Heure Depart :", ordre.heure_depart, 72, 190, 320);
    drawLineField(doc, 308, "Heure Fin :", ordre.heure_fin, 340, 420, 525);
    drawLineField(doc, 334, "Destination :", ordre.destination_label);
    drawLineField(doc, 360, "Vehicule :", ordre.vehicule);

    doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10.5)
        .text("Nature de la Mission :", 72, 390);
    doc.rect(72, 408, 453, 74).stroke("#3B3B3B");
    doc
        .font("Helvetica")
        .fontSize(10)
        .text(safeText(ordre.nature_mission), 84, 420, { width: 430, align: "left" });

    drawSectionTitle(doc, 514, "III- Cadre Reserve a RH :");

    doc.rect(72, 544, 453, 78).stroke("#3B3B3B");
    doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10)
        .text("Heures Sortie :", 92, 566);
    doc.moveTo(170, 579).lineTo(500, 579).stroke("#3B3B3B");
    doc.text("Heures Entree :", 92, 600);
    doc.moveTo(170, 613).lineTo(500, 613).stroke("#3B3B3B");

    const signY = 648;
    const signWidth = 108;
    const signLabels = [
        "Date et Visa Demandeur",
        "Date et Visa Resp. Hierarchique",
        "Date et Visa Manager",
        "Date et Visa DRH",
    ];

    signLabels.forEach((label, index) => {
        const x = 72 + (index * 113);
        doc
            .font("Helvetica")
            .fontSize(8)
            .fillColor("#162D7C")
            .text(label, x, signY, { width: signWidth, align: "center" });
        doc.rect(x, 676, signWidth, 84).stroke("#3B3B3B");
    });

    doc.end();

    const buffer = await new Promise((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return { buffer, fileName: `ordre_mission_${ordre.id}.pdf` };
};
