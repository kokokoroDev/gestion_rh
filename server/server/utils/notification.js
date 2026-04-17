import models from "../db/models/index.js";
import { notifyManager, notifyRH, notifySalarie, notifyTeamLead } from "../socket.js";

const { Notification } = models;

/**
 * Persists a Notification row and immediately pushes it to the correct socket room.
 *
 * @param {import('socket.io').Server} io
 * @param {string}  sal_id  — recipient's UUID
 * @param {'rh'|'manager'|'team_lead'|'fonctionnaire'} to — determines room
 * @param {{ type, title, message, related_entity_id?, related_entity_type? }} notificationData
 */
export const createAndNotify = async (io, sal_id, to, notificationData) => {
    const notification = await Notification.create({
        sal_id,
        type:                notificationData.type,
        title:               notificationData.title,
        message:             notificationData.message,
        related_entity_id:   notificationData.related_entity_id   ?? null,
        related_entity_type: notificationData.related_entity_type ?? null,
    });

    const payload = {
        id:                  notification.id,
        type:                notification.type,
        title:               notification.title,
        message:             notification.message,
        is_read:             false,
        related_entity_id:   notification.related_entity_id,
        related_entity_type: notification.related_entity_type,
        created_at:          notification.created_at,
    };

    if (to === 'rh') {
        notifyRH(io, sal_id, payload);
    } else if (to === 'manager') {
        notifyManager(io, sal_id, payload);
    } else if (to === 'team_lead') {
        notifyTeamLead(io, sal_id, payload);
    } else {
        notifySalarie(io, sal_id, payload);
    }

    return notification;
};