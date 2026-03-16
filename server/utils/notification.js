import models from "../db/models/index.js";
import { notifyManager, notifyRH, notifySalarie } from "../middleware/socket.js"
const { Notification } = models;

export const createAndNotify = async (io, sal_id, to, notificationData) => {
    const notification = await Notification.create({
        sal_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        related_entity_id: notificationData.related_entity_id || null,
        related_entity_type: notificationData.related_entity_type || null,
    });
    console.log(notification)

    const data = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        is_read: false,
        created_at: notification.created_at
    }

    if (to === 'rh') {
        notifyRH(io, sal_id, data);
    } else if (to === 'manager') {
        notifyManager(io, sal_id, data)
    } else if (to === 'fonctionnaire') {
        notifySalarie(io, sal_id, data)
    }
    console.log('sent to :', to)
    return notification;
};