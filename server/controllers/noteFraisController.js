import * as noteFraisService from "../services/noteFraisServices.js";

export const getMyNote = async (req, res) => {
    try {
        const note = await noteFraisService.getOrCreateMyNote(req.query, req.salarie);
        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const saveMyNote = async (req, res) => {
    try {
        const note = await noteFraisService.saveMyNoteLines(req.query, req.salarie, req.body?.lines);
        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const sendMyNoteToRh = async (req, res) => {
    try {
        const note = await noteFraisService.sendMyNoteToRh(req.params.id, req.salarie);
        res.json(note);
    } catch (error) {
        const code = error.message.includes("refusé") ? 403 : 400;
        res.status(code).json({ message: error.message });
    }
};

export const getRhInbox = async (req, res) => {
    try {
        const data = await noteFraisService.getRhInbox(req.query);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsReviewed = async (req, res) => {
    try {
        const note = await noteFraisService.markAsReviewed(req.params.id);
        res.json(note);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const downloadMyNotePdf = async (req, res) => {
    try {
        const { buffer, fileName } = await noteFraisService.generateMyNotePdf(req.params.id, req.salarie);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        const code = error.message.includes("refusé") ? 403 : 404;
        res.status(code).json({ message: error.message });
    }
};
