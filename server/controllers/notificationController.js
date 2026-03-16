import * as notificationService from "../services/notificationServices.js";


export const listNotifications = async (req, res) => {
  try {
    const sal_id = req.salarie.id;
    const result = await notificationService.listNotifications(sal_id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteNotification(id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markRead(id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const readAll = async (req, res) => {
  try {
    const sal_id = req.salarie.id;
    const result = await notificationService.readAll(sal_id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
