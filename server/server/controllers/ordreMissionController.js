import * as ordreMissionService from "../services/ordreMissionServices.js";

export const createOrdreMission = async (req, res) => {
    try {
        const created = await ordreMissionService.createOrdreMission(req.body, req.salarie);
        res.status(201).json(created);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyOrdresMission = async (req, res) => {
    try {
        const data = await ordreMissionService.getMyOrdresMission(req.salarie);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadOrdreMissionPdf = async (req, res) => {
    try {
        const { buffer, fileName } = await ordreMissionService.generateOrdreMissionPdf(req.params.id, req.salarie);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        const code = error.message.includes("refusé") ? 403 : 404;
        res.status(code).json({ message: error.message });
    }
};
