import cron from 'node-cron';
import { Op } from 'sequelize';
import models from '../db/models/index.js';
import { createAndNotify } from '../utils/notification.js';
import { io } from '../index.js';

const { Salarie, SalarieRoleModule, Role, Conge } = models;

// ─── Monthly balance credit (+1.5 per employee) ───────────────────────────────

const startMonthlyCongeCron = () => {
    cron.schedule('0 5 1 * *', async () => {
        console.log('[CRON] Mise à jour soldes congés (+1.5)…');
        try {
            const [updatedCount] = await Salarie.update(
                { mon_cong: models.sequelizeCon.literal('mon_cong + 1.5') },
                { where: { status: 'active' } }
            );
            console.log(`[CRON] ✅ Soldes mis à jour pour ${updatedCount} salarié(s)`);
        } catch (err) {
            console.error('[CRON] ❌ Échec soldes congés:', err.message);
        }
    }, { timezone: 'Africa/Casablanca' });

    console.log('[CRON] Soldes congés actif (1er du mois à 05:00)');
};

// ─── Stale-congé reminder (Mon–Fri 08:00) ────────────────────────────────────

const STALE_HOURS = 72;

const startStaleCongeCron = () => {
    cron.schedule('0 8 * * 1-5', async () => {
        console.log('[CRON] Vérification des congés en attente…');
        try {
            const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

            const staleConges = await Conge.findAll({
                where: {
                    status:    { [Op.in]: ['soumis', 'reached'] },
                    created_at: { [Op.lt]: cutoff },
                },
                include: [{
                    model:      Salarie,
                    as:         'salarie',
                    attributes: ['id', 'prenom', 'nom', 'status'],
                    include: [{
                        model:      SalarieRoleModule,
                        as:         'roleModules',
                        attributes: ['role_id', 'module_id'],
                    }],
                }],
            });

            if (!staleConges.length) return;
            console.log(`[CRON] ${staleConges.length} congé(s) en attente depuis plus de 72h`);

            const managerRoleRow = await Role.findOne({ where: { name: 'manager' } });
            const rhRoleRow      = await Role.findOne({ where: { name: 'rh'      } });

            for (const conge of staleConges) {
                const sal  = conge.salarie;
                const days = Math.floor((Date.now() - new Date(conge.created_at)) / 86_400_000);
                const who  = `${sal.prenom} ${sal.nom}`;

                // Still with manager — remind the manager(s) of the employee's modules.
                if (conge.status === 'soumis' && managerRoleRow) {
                    const employeeModuleIds = sal.roleModules.map(r => r.module_id).filter(Boolean);
                    if (employeeModuleIds.length > 0) {
                        const managerRows = await SalarieRoleModule.findAll({
                            where: {
                                role_id:   managerRoleRow.id,
                                module_id: { [Op.in]: employeeModuleIds },
                            },
                            include: [{
                                model:      Salarie,
                                as:         'salarie',
                                where:      { status: 'active' },
                                attributes: ['id'],
                                required:   true,
                            }],
                        });
                        for (const mr of managerRows) {
                            await createAndNotify(io, mr.sal_id, 'manager', {
                                type:    'system_alert',
                                title:   'Demande de congé en attente',
                                message: `La demande de ${who} est en attente depuis ${days} jour(s). Veuillez la traiter.`,
                                related_entity_id:   conge.id,
                                related_entity_type: 'conge',
                            }).catch(() => {});
                        }
                    }
                }

                // Forwarded to RH but not yet processed — remind all RH.
                if (conge.status === 'reached' && rhRoleRow) {
                    const rhRows = await SalarieRoleModule.findAll({
                        where:   { role_id: rhRoleRow.id },
                        include: [{ model: Salarie, as: 'salarie', where: { status: 'active' }, attributes: ['id'] }],
                    });
                    const uniqueRH = [...new Map(rhRows.map(r => [r.sal_id, r])).values()];
                    for (const rh of uniqueRH) {
                        await createAndNotify(io, rh.sal_id, 'rh', {
                            type:    'system_alert',
                            title:   'Congé transmis non traité',
                            message: `La demande de ${who} est transmise depuis ${days} jour(s). Veuillez la valider ou la refuser.`,
                            related_entity_id:   conge.id,
                            related_entity_type: 'conge',
                        }).catch(() => {});
                    }
                }
            }
        } catch (err) {
            console.error('[CRON] ❌ Erreur vérification congés:', err.message);
        }
    }, { timezone: 'Africa/Casablanca' });

    console.log('[CRON] Rappels congés actif (lun-ven à 08:00)');
};

const startCongeCrons = () => {
    startMonthlyCongeCron();
    startStaleCongeCron();
};

export default startCongeCrons;