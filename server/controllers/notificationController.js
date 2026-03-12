import * as notifService from '../services/notificationServices.js';

export const getNotifications = async (req, res) => {
    try {
        const result = await notifService.getNotifications(req.salarie.id, req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const result = await notifService.getUnreadCount(req.salarie.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const notif = await notifService.markAsRead(req.params.id, req.salarie.id);
        res.json(notif);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const result = await notifService.markAllAsRead(req.salarie.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        await notifService.deleteNotification(req.params.id, req.salarie.id);
        res.status(204).send();
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};