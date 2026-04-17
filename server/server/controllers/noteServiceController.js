import * as noteService from '../services/noteserviceServices.js';
import { handleNoteUpload } from '../utils/uploadNote.js';

export const createNoteService = async (req, res) => {
    try {
        await handleNoteUpload(req, res);
        const note = await noteService.createNoteService(req.body, req.file, req.salarie);
        res.status(201).json(note);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const getNoteServices = async (req, res) => {
    try {
        const result = await noteService.getNoteServices(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getNoteServiceById = async (req, res) => {
    try {
        const note = await noteService.getNoteServiceById(req.params.id);
        res.json(note);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const downloadNoteService = async (req, res) => {
    try {
        const { absPath, fileName } = await noteService.getNoteServiceFilePath(req.params.id);
        res.download(absPath, fileName);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const deleteNoteService = async (req, res) => {
    try {
        await noteService.deleteNoteService(req.params.id, req.salarie);
        res.status(204).send();
    } catch (err) {
        const code = err.message.includes('refusé') ? 403 : 400;
        res.status(code).json({ message: err.message });
    }
};