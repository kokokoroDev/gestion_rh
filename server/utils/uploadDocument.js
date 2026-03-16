import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.resolve('storage/documents');

// Ensure directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE_MB = 10;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, WEBP, DOC, DOCX'), false);
    }
};

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
}).single('file');

// Wraps multer in a promise so it can be used inside async route handlers
export const handleUpload = (req, res) =>
    new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    reject(new Error(`Fichier trop volumineux — limite ${MAX_SIZE_MB} Mo`));
                } else {
                    reject(new Error(err.message));
                }
            } else if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });

export const UPLOAD_DIR_PATH = UPLOAD_DIR;