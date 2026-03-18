import * as teletravailService from '../services/teletravailServices.js';
import { handleTeletravailUpload } from '../utils/uploadTeletravail.js';

export const uploadTeletravail = async (req, res) => {
    try {
        await handleTeletravailUpload(req, res);
        const data = await teletravailService.uploadTeletravail(req.file, req.salarie);
        res.status(201).json(data);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const getTeletravail = async (req, res) => {
    try {
        const data = await teletravailService.getTeletravail();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteTeletravail = async (req, res) => {
    try {
        await teletravailService.deleteTeletravail(req.salarie);
        res.status(204).send();
    } catch (err) {
        const code = err.message.includes('refusé') ? 403 : 400;
        res.status(code).json({ message: err.message });
    }
};