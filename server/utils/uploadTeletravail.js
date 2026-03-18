import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.resolve('storage/teletravail_tmp');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'text/plain',
];
const ALLOWED_EXTS = ['.xls', '.xlsx', '.csv'];
const MAX_MB = 10;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `teletravail_${uuidv4()}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) et CSV sont acceptés'), false);
    }
};

export const teletravailUploadMiddleware = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_MB * 1024 * 1024 },
}).single('file');

export const handleTeletravailUpload = (req, res) =>
    new Promise((resolve, reject) => {
        teletravailUploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                reject(new Error(err.code === 'LIMIT_FILE_SIZE'
                    ? `Fichier trop volumineux — limite ${MAX_MB} Mo`
                    : err.message));
            } else if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });