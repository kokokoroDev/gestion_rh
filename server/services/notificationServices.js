import models from "../db/models/index.js";

const { Notification, Salarie } = models;

export const listNotifications = async (sal_id) => {
    if (!sal_id) throw new Error('ID salarié requis');

    const salarie = await Salarie.findByPk(sal_id, { attributes: ['id'] });
    if (!salarie) throw new Error('Salarié non trouvé');

    const notifications = await Notification.findAll({
        where: { sal_id },
        order: [['created_at', 'DESC']],
    });

    return { total: notifications.length, notifications };
};

export const deleteNotification = async (id, sal_id) => {
    if (!id) throw new Error('ID notification requis');

    // Scope to sal_id so users can only delete their own notifications.
    const notification = await Notification.findOne({ where: { id, sal_id } });
    if (!notification) throw new Error('Notification non trouvée');

    await notification.destroy();
    return { success: true, message: 'Notification supprimée' };
};

export const markRead = async (id, sal_id) => {
    if (!id) throw new Error('ID notification requis');

    const notification = await Notification.findOne({ where: { id, sal_id } });
    if (!notification) throw new Error('Notification non trouvée');

    await notification.update({ is_read: true });
    return { success: true, message: 'Notification marquée comme lue' };
};

export const readAll = async (sal_id) => {
    if (!sal_id) throw new Error('ID salarié requis');

    const salarie = await Salarie.findByPk(sal_id, { attributes: ['id'] });
    if (!salarie) throw new Error('Salarié non trouvé');

    const [count] = await Notification.update(
        { is_read: true },
        { where: { sal_id, is_read: false } }
    );

    return { success: true, message: `${count} notification(s) marquée(s) comme lue(s)` };
};