import * as docService from '../services/documentRequestServices.js';
import { handleUpload } from '../utils/uploadDocument.js';

export const createDocumentRequest = async (req, res) => {
    try {
        const request = await docService.createDocumentRequest(req.body, req.salarie.id);
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const getDocumentRequests = async (req, res) => {
    try {
        const result = await docService.getDocumentRequests(req.query, req.salarie);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getDocumentRequestById = async (req, res) => {
    try {
        const request = await docService.getDocumentRequestById(req.params.id, req.salarie);
        res.json(request);
    } catch (err) {
        const code = err.message === 'Accès refusé' ? 403 : 404;
        res.status(code).json({ message: err.message });
    }
};

export const updateDocumentRequestStatus = async (req, res) => {
    try {
        const request = await docService.updateDocumentRequestStatus(
            req.params.id, req.body, req.salarie
        );
        res.json(request);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * POST /docs/:id/file
 * Accepts multipart/form-data with a single field named "file".
 * RH only.
 */
export const uploadDocumentFile = async (req, res) => {
    try {
        // Run multer, then pass req.file to the service
        await handleUpload(req, res);
        const request = await docService.uploadDocumentFile(req.params.id, req.file, req.salarie);
        res.json(request);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/**
 * GET /docs/:id/file
 * Streams the uploaded file back to the caller.
 * Accessible by the request owner and by RH.
 */
export const downloadDocumentFile = async (req, res) => {
    try {
        const { absPath, fileName } = await docService.getDocumentFilePath(req.params.id, req.salarie);
        res.download(absPath, fileName);
    } catch (err) {
        const code = err.message === 'Accès refusé' ? 403 : 404;
        res.status(code).json({ message: err.message });
    }
};

export const cancelDocumentRequest = async (req, res) => {
    try {
        await docService.cancelDocumentRequest(req.params.id, req.salarie.id);
        res.status(204).send();
    } catch (err) {
        const code = err.message === 'Accès refusé' ? 403 : 400;
        res.status(code).json({ message: err.message });
    }
};