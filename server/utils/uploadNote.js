import multer from 'multer';
import path   from 'path';
import fs     from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.resolve('storage/notes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
];

const MAX_SIZE_MB = 20;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    ALLOWED_MIME_TYPES.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, image, Word, Excel, TXT'), false);
};

export const noteUploadMiddleware = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
}).single('file');

export const handleNoteUpload = (req, res) =>
    new Promise((resolve, reject) => {
        noteUploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                reject(new Error(
                    err.code === 'LIMIT_FILE_SIZE'
                        ? `Fichier trop volumineux — limite ${MAX_SIZE_MB} Mo`
                        : err.message
                ));
            } else if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });