import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const MOIS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const COLORS = {
    primary: '#1E3A5F',
    accent:  '#2E75B6',
    lightBg: '#EBF3FB',
    rowAlt:  '#F7FAFD',
    text:    '#1A1A1A',
    muted:   '#6B7280',
    white:   '#FFFFFF',
    success: '#16A34A',
    border:  '#D1D5DB',
};

const STORAGE_DIR = path.resolve('storage/payslips');

const fmt = (n) => parseFloat(n).toLocaleString('fr-MA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const periodLabel = (month, year) => `${MOIS[month - 1]} ${year}`;

const ensureDir = () => fs.mkdirSync(STORAGE_DIR, { recursive: true });

/**
 * Derive the department label from the new roleModules structure.
 * buildSalarieInclude() attaches roleModules[].module so we pick unique labels.
 * Falls back to 'N/A' when no module is assigned.
 */
const resolveModuleLabel = (salarie) => {
    if (!salarie?.roleModules?.length) return 'N/A';
    const labels = [...new Set(
        salarie.roleModules
            .map(rm => rm.module?.libelle)
            .filter(Boolean)
    )];
    return labels.length ? labels.join(', ') : 'N/A';
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────

const hRule = (doc, y, { color = COLORS.border, width = 1 } = {}) => {
    doc.save().moveTo(50, y).lineTo(545, y)
        .lineWidth(width).strokeColor(color).stroke().restore();
};

const fillRect = (doc, x, y, w, h, color) => {
    doc.save().rect(x, y, w, h).fillColor(color).fill().restore();
};

// ─── Layout sections ──────────────────────────────────────────────────────────

const drawHeader = (doc, bulpaie) => {
    const moduleName = resolveModuleLabel(bulpaie.salarie);

    fillRect(doc, 0, 0, 595, 90, COLORS.primary);

    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.white)
        .text('BULLETIN DE PAIE', 50, 22, { align: 'left' });

    doc.font('Helvetica').fontSize(11).fillColor(COLORS.lightBg)
        .text(periodLabel(bulpaie.month, bulpaie.year), 50, 50);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.white)
        .text(`Département : ${moduleName}`, 350, 34, { width: 195, align: 'right' });

    doc.moveDown(0.5);
};

const drawEmployeeSection = (doc, bulpaie) => {
    const { salarie } = bulpaie;
    const nom          = salarie ? `${salarie.prenom} ${salarie.nom}` : '—';
    const cin          = salarie?.cin ?? '—';
    const dateEmbauche = salarie?.date_debut
        ? new Date(salarie.date_debut).toLocaleDateString('fr-MA')
        : '—';

    const y = 105;
    fillRect(doc, 50, y, 495, 24, COLORS.lightBg);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
        .text('INFORMATIONS DU SALARIÉ', 58, y + 7);
    hRule(doc, y + 24, { color: COLORS.accent, width: 1 });

    const col1x = 58, col2x = 310, lineH = 18;
    let infoY = y + 32;

    const field = (label, value, x, fy) => {
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(label, x, fy, { width: 80 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text).text(value, x + 85, fy);
    };

    field('Nom & Prénom', nom,          col1x, infoY);
    field('Période',      periodLabel(bulpaie.month, bulpaie.year), col2x, infoY);
    infoY += lineH;

    field('CIN',              cin,          col1x, infoY);
    field("Date d'embauche",  dateEmbauche, col2x, infoY);
    infoY += lineH;

    field('Réf. bulletin', bulpaie.id.split('-')[0].toUpperCase(), col1x, infoY);
    field('Statut',        'VALIDÉ',                               col2x, infoY);

    return infoY + lineH + 12;
};

const drawPayTable = (doc, bulpaie, startY) => {
    const tableX = 50, tableW = 495, col1W = 300, col2W = 195;

    fillRect(doc, tableX, startY, tableW, 24, COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white)
        .text('RUBRIQUE',        tableX + 10,        startY + 8, { width: col1W - 10 })
        .text('MONTANT (MAD)',   tableX + col1W + 10, startY + 8, { width: col2W - 20, align: 'right' });

    const rows = [
        { label: 'Salaire de base (brut)', value: fmt(bulpaie.salaire_brut),        type: 'gain'      },
        ...(bulpaie.prime
            ? [{ label: 'Prime',           value: `+ ${fmt(bulpaie.prime)}`,         type: 'gain'      }]
            : []),
        { label: 'Déductions / Retenues',  value: `- ${fmt(bulpaie.deduction)}`,     type: 'deduction' },
    ];

    let rowY = startY + 24;
    rows.forEach((row, i) => {
        const bg = i % 2 === 0 ? COLORS.white : COLORS.rowAlt;
        fillRect(doc, tableX, rowY, tableW, 22, bg);
        if (row.type === 'gain') fillRect(doc, tableX, rowY, 3, 22, COLORS.accent);

        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
            .text(row.label, tableX + 12, rowY + 7, { width: col1W - 12 });

        const amtColor = row.type === 'deduction' ? '#DC2626' : COLORS.text;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(amtColor)
            .text(row.value, tableX + col1W + 10, rowY + 7, { width: col2W - 20, align: 'right' });

        doc.save().moveTo(tableX, rowY + 22).lineTo(tableX + tableW, rowY + 22)
            .lineWidth(0.5).strokeColor(COLORS.border).stroke().restore();

        rowY += 22;
    });

    const netY = rowY + 6;
    fillRect(doc, tableX, netY, tableW, 32, COLORS.primary);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.white)
        .text('SALAIRE NET À PAYER', tableX + 12, netY + 10, { width: col1W - 12 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#93C5FD')
        .text(`${fmt(bulpaie.salaire_net)} MAD`, tableX + col1W + 10, netY + 9, {
            width: col2W - 20, align: 'right',
        });

    return netY + 32 + 20;
};

const drawValidationStamp = (doc, nextY) => {
    doc.save().rect(350, nextY, 195, 52).lineWidth(1.2).dash(4, { space: 3 })
        .strokeColor(COLORS.success).stroke().restore();

    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.success)
        .text('✓  VALIDÉ', 360, nextY + 8, { width: 175, align: 'center' });

    const validatedAt = new Date().toLocaleDateString('fr-MA', {
        day: '2-digit', month: 'long', year: 'numeric',
    });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`Émis le ${validatedAt}`, 360, nextY + 32, { width: 175, align: 'center' });
};

const drawFooter = (doc) => {
    const footerY = 760;
    hRule(doc, footerY, { color: COLORS.accent, width: 0.5 });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
        .text(
            'Ce bulletin de paie est émis automatiquement par le système RH. '
            + 'Conservez-le comme justificatif de rémunération.',
            50, footerY + 6, { width: 495, align: 'center' }
        );
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const generatePayslipPDF = (bulpaie) => new Promise((resolve, reject) => {
    try {
        ensureDir();

        const filename = `bulletin_${bulpaie.id}.pdf`;
        const absPath  = path.join(STORAGE_DIR, filename);
        const relPath  = path.join('storage', 'payslips', filename);

        const doc = new PDFDocument({
            size:    'A4',
            margins: { top: 0, right: 0, bottom: 40, left: 0 },
            info: {
                Title:   `Bulletin de paie — ${periodLabel(bulpaie.month, bulpaie.year)}`,
                Author:  'Système RH',
                Subject: `Bulletin ${bulpaie.id}`,
            },
        });

        const stream = fs.createWriteStream(absPath);
        doc.pipe(stream);

        drawHeader(doc, bulpaie);
        const afterEmployee = drawEmployeeSection(doc, bulpaie);
        const afterTable    = drawPayTable(doc, bulpaie, afterEmployee);
        drawValidationStamp(doc, afterTable);
        drawFooter(doc);

        doc.end();
        stream.on('finish', () => resolve(relPath));
        stream.on('error',  reject);
    } catch (err) {
        reject(err);
    }
});