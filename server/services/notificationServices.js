import models from "../db/models/index.js";

const { Notification, Salarie } = models

export const listNotifications = async (sal_id) => {
    try {
        if (!sal_id) throw new Error('ID salarié requis');
        
        const salarie = await Salarie.findByPk(sal_id);
        if (!salarie) throw new Error('Salarié non trouvé');

        const notifications = await Notification.findAll({
            where: { sal_id },
            order: [['created_at', 'DESC']]
        });

        return {
            total: notifications.length,
            notifications
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

export const deleteNotification = async (id) => {
    try {
        if (!id) throw new Error('ID notification requis');
        
        const notification = await Notification.findByPk(id);
        if (!notification) throw new Error('Notification non trouvée');
        
        await notification.destroy();
        return { success: true, message: 'Notification supprimée' };
    } catch (error) {
        throw new Error(error.message);
    }
}

export const markRead = async (id) => {
    try {
        if (!id) throw new Error('ID notification requis');
        
        const notification = await Notification.findByPk(id);
        if (!notification) throw new Error('Notification non trouvée');

        await notification.update({ is_read: true });
        return { success: true, message: 'Notification marquée comme lue' };
    } catch (error) {
        throw new Error(error.message);
    }
}

export const readAll = async (sal_id) => {
    try {
        if (!sal_id) throw new Error('ID salarié requis');
        
        const salarie = await Salarie.findByPk(sal_id);
        if (!salarie) throw new Error('Salarié non trouvé');

        const result = await Notification.update(
            { is_read: true },
            { where: { sal_id } }
        );
        
        return { success: true, message: `${result[0]} notification(s) marquée(s) comme lue(s)` };
    } catch (error) {
        throw new Error(error.message);
    }
}

