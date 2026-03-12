import models from '../db/models/index.js';
import { emitToUser } from '../socket.js';

const { Notification, Salarie } = models;

// ─── Core creator (used internally by other services & crons) ────────────────

/**
 * @param {string}  sal_id
 * @param {'conge_status_change'|'bulpaie_validated'|'conge_reminder'|'bulpaie_reminder'|'general'} type
 * @param {string}  title
 * @param {string}  message
 * @param {string|null} ref_id  – optional UUID of the related record
 */
export const createNotification = async (sal_id, type, title, message, ref_id = null) => {
    const notif = await Notification.create({ sal_id, type, title, message, ref_id });
    
    // Emit the notification to the user via socket.io
    emitToUser(sal_id, 'notification:new', {
        id: notif.id,
        type,
        title,
        message,
        ref_id,
        is_read: notif.is_read,
        create_at: notif.create_at,
    });
    
    return notif;
};

/**
 * Bulk-create one notification per RH user (useful for system-wide alerts).
 */
export const notifyAllRH = async (type, title, message, ref_id = null) => {
    const rhUsers = await Salarie.findAll({
        where: { role: 'rh', status: 'active' },
        attributes: ['id'],
    });

    return Promise.all(
        rhUsers.map(rh => createNotification(rh.id, type, title, message, ref_id))
    );
};

// ─── Query helpers ────────────────────────────────────────────────────────────

export const getNotifications = async (sal_id, filters = {}) => {
    const { is_read, type, limit = 20, offset = 0 } = filters;

    const where = { sal_id };
    if (is_read !== undefined) where.is_read = is_read === 'true' || is_read === true;
    if (type)    where.type = type;

    const result = await Notification.findAndCountAll({
        where,
        order: [['create_at', 'DESC']],
        limit:  parseInt(limit),
        offset: parseInt(offset),
    });

    return { total: result.count, data: result.rows };
};

export const getUnreadCount = async (sal_id) => {
    const count = await Notification.count({ where: { sal_id, is_read: false } });
    return { unread: count };
};

export const markAsRead = async (id, sal_id) => {
    const notif = await Notification.findOne({ where: { id, sal_id } });
    if (!notif) throw new Error('Notification non trouvée');
    await notif.update({ is_read: true });
    return notif;
};

export const markAllAsRead = async (sal_id) => {
    const [updated] = await Notification.update(
        { is_read: true },
        { where: { sal_id, is_read: false } }
    );
    return { updated };
};

export const deleteNotification = async (id, sal_id) => {
    const notif = await Notification.findOne({ where: { id, sal_id } });
    if (!notif) throw new Error('Notification non trouvée');
    await notif.destroy();
    return true;
};