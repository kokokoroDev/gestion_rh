import cron from 'node-cron';
import models from '../db/models/index.js';
import { notifyAllRH } from '../services/notificationServices.js';

const { Bulpaie } = models;

/**
 * Runs daily at 09:00.
 * Only alerts RH when today is on or after the 25th of the month AND
 * there are still drafted bulletins for the current month — i.e. bulletins
 * that are actually due and risk not being validated in time.
 */
const startBulpaieReminderCron = () => {
    cron.schedule('0 9 * * *', async () => {
        const now  = new Date();
        const day  = now.getDate();

        if (day < 25) return;

        const month = now.getMonth() + 1;
        const year  = now.getFullYear();

        console.log(`[CRON] Vérification bulletins dus ${month}/${year} (jour ${day})…`);

        try {
            const count = await Bulpaie.count({
                where: { month, year, status: 'drafted' },
            });

            if (count === 0) {
                console.log('[CRON] Tous les bulletins sont validés.');
                return;
            }

            await notifyAllRH(
                'bulpaie_reminder',
                'Bulletins de paie non validés',
                `${count} bulletin(s) de paie pour ${month}/${year} sont encore en brouillon. La fin du mois approche — pensez à les valider.`
            );

            console.log(`[CRON] ✅ Rappel envoyé aux RH — ${count} bulletin(s) en attente`);
        } catch (err) {
            console.error('[CRON] ❌ Erreur rappel bulletins:', err.message);
        }
    }, { timezone: 'Africa/Casablanca' });

    console.log('[CRON] Planificateur rappels bulletins actif (quotidien à 09:00, actif à partir du 25)');
};

export default startBulpaieReminderCron;