import cron from 'node-cron';
import { Op } from 'sequelize';
import models from '../db/models/index.js';
import { createNotification, notifyAllRH } from '../services/notificationServices.js';

const { Salarie, Conge } = models;


const startMonthlyCongeCron = () => {
    cron.schedule('0 5 1 * *', async () => {
        console.log('[CRON] Démarrage mise à jour soldes congés (+1.5)…');

        try {
            const [updatedCount] = await Salarie.update(
                { mon_cong: models.sequelizeCon.literal('mon_cong + 1.5') },
                { where: { status: 'active' } }
            );

            console.log(`[CRON] ✅ Soldes congés mis à jour pour ${updatedCount} salarié(s)`);
        } catch (err) {
            console.error('[CRON] ❌ Échec mise à jour soldes congés:', err.message);
        }
    }, { timezone: 'Africa/Casablanca' });

    console.log('[CRON] Planificateur soldes congés actif (1er de chaque mois à 05:00)');
};


const STALE_HOURS = 72;

const startStaleCongeCron = () => {
    cron.schedule('0 8 * * 1-5', async () => {
        console.log('[CRON] Vérification des congés en attente…');

        try {
            const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

            const staleConges = await Conge.findAll({
                where: {
                    status: { [Op.in]: ['soumis', 'reached'] },
                    create_at: { [Op.lt]: cutoff },
                },
                include: [{
                    model: Salarie,
                    as: 'salarie',
                    attributes: ['id', 'prenom', 'nom', 'module_id', 'role'],
                }],
            });

            if (staleConges.length === 0) return;

            console.log(`[CRON] ${staleConges.length} congé(s) en attente depuis plus de 72h`);

            for (const conge of staleConges) {
                const sal = conge.salarie;
                const days = Math.floor((Date.now() - new Date(conge.create_at)) / 86_400_000);
                const who = `${sal.prenom} ${sal.nom}`;

                if (conge.status === 'soumis' && sal.module_id) {
                    const manager = await Salarie.findOne({
                        where: { module_id: sal.module_id, role: 'manager', status: 'active' },
                        attributes: ['id'],
                    });
                    if (manager) {
                        await createNotification(
                            manager.id,
                            'conge_reminder',
                            'Demande de congé en attente',
                            `La demande de ${who} est en attente depuis ${days} jour(s). Veuillez la traiter.`,
                            conge.id
                        );
                    }
                }

                if (conge.status === 'reached') {
                    await notifyAllRH(
                        'conge_reminder',
                        'Congé transmis non traité',
                        `La demande de ${who} a été transmise par le manager il y a ${days} jour(s). Veuillez la valider ou la refuser.`,
                        conge.id
                    );
                }
            }
        } catch (err) {
            console.error('[CRON] ❌ Erreur vérification congés en attente:', err.message);
        }
    }, { timezone: 'Africa/Casablanca' });

    console.log('[CRON] Planificateur rappels congés actif (lun-ven à 08:00)');
};

const startCongeCrons = () => {
    startMonthlyCongeCron();
    startStaleCongeCron();
};

export default startCongeCrons;