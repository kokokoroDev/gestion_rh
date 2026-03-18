import path    from 'path';
import fs      from 'fs';
import XLSX    from 'xlsx';
import models  from '../db/models/index.js';
import { isRH } from '../utils/role.js';

const { TeletravailData, Salarie } = models;

const uploaderInclude = {
    model:      Salarie,
    as:         'uploader',
    attributes: ['id', 'prenom', 'nom'],
};

const parseExcel = (filePath) => {
    const workbook  = XLSX.readFile(filePath, { cellDates: true, dateNF: 'dd/mm/yyyy' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Le fichier Excel ne contient aucune feuille');

    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!raw.length) throw new Error('La feuille est vide');

    const rawHeaders = raw[0].map(h => String(h ?? '').trim());
    const lastNonEmpty = rawHeaders.reduce((acc, h, i) => h !== '' ? i : acc, -1);
    if (lastNonEmpty === -1) throw new Error("La première ligne d'en-tête est vide");

    const columns = rawHeaders.slice(0, lastNonEmpty + 1);

    const rows = raw.slice(1)
        .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
        .map(row =>
            columns.reduce((obj, col, i) => {
                obj[col] = String(row[i] ?? '').trim();
                return obj;
            }, {})
        );

    return { columns, rows, sheetName };
};

export const uploadTeletravail = async (file, salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    if (!file)               throw new Error('Aucun fichier fourni');

    const { columns, rows, sheetName } = parseExcel(file.path);

    try { fs.unlinkSync(file.path); } catch { /* ok */ }

    await TeletravailData.destroy({ where: {} });

    const record = await TeletravailData.create({
        file_name:   file.originalname,
        file_size:   file.size,
        columns,
        rows,
        row_count:   rows.length,
        sheet_name:  sheetName,
        uploaded_by: salarieInfo.id,
    });

    return record.reload({ include: [uploaderInclude] });
};

export const getTeletravail = async () => {
    const record = await TeletravailData.findOne({
        include: [uploaderInclude],
        order:   [['created_at', 'DESC']],
    });
    return record ?? null;
};

export const deleteTeletravail = async (salarieInfo) => {
    if (!isRH(salarieInfo)) throw new Error('Accès refusé — RH uniquement');
    await TeletravailData.destroy({ where: {} });
    return true;
};