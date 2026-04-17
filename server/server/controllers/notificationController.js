import * as notificationService from "../services/notificationServices.js";

export const listNotifications = async (req, res) => {
    try {
        const result = await notificationService.listNotifications(req.salarie.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        // Pass sal_id so the service enforces ownership — users can only delete
        // their own notifications.
        const result = await notificationService.deleteNotification(
            req.params.id,
            req.salarie.id
        );
        res.json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const markRead = async (req, res) => {
    try {
        const result = await notificationService.markRead(
            req.params.id,
            req.salarie.id
        );
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const readAll = async (req, res) => {
    try {
        const result = await notificationService.readAll(req.salarie.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};