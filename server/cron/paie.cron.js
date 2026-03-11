import cron from 'node-cron';
import { generateMonthlyBulpaies } from '../services/bulpaieServices.js';

/**
 * Runs on the 1st of every month at 06:00.
 * Generates drafted bulletins for all active salaries.
 * Idempotent — skips any bulletin that already exists for the month
 * (so it never overlaps with manually triggered generations).
 */
const startPaieCron = () => {
    cron.schedule('0 6 1 * *', async () => {
        const now   = new Date();
        const month = now.getMonth() + 1;
        const year  = now.getFullYear();

        console.log(`[CRON] Démarrage génération bulletins ${month}/${year}…`);

        try {
            const result = await generateMonthlyBulpaies(month, year);
            console.log(
                `[CRON] ✅ Terminé — générés: ${result.generated}, ` +
                `ignorés: ${result.skipped_count}, erreurs: ${result.error_count}`
            );
            if (result.error_count > 0) {
                console.warn('[CRON] Erreurs:', JSON.stringify(result.errors, null, 2));
            }
            if (result.skipped_count > 0) {
                console.info('[CRON] Ignorés:', JSON.stringify(result.skipped, null, 2));
            }
        } catch (err) {
            console.error('[CRON] ❌ Échec génération bulletins:', err.message);
        }
    }, {
        timezone: 'Africa/Casablanca',
    });

    console.log('[CRON] Planificateur bulletins de paie actif (1er de chaque mois à 06:00)');
};

export default startPaieCron;
