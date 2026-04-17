import * as clientService from "../services/clientServices.js";

export const getClients = async (req, res) => {
    try {
        const data = await clientService.getClients(req.query);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createClient = async (req, res) => {
    try {
        const created = await clientService.createClient(req.body);
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
