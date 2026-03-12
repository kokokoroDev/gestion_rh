import 'dotenv/config';
import http    from 'http';
import express from 'express';
import mainRouter from './routes/index.js';
import { test, testandsync } from './db/index.js';
import startPaieCron   from './cron/paie.cron.js';
import startCongeCrons from './cron/conge.cron.js';
import startBulpaieReminderCron from './cron/notification.cron.js';
import { initSocket }  from './socket.js';

// ── Start all cron jobs ──────────────────────────────────────────────────────
startPaieCron();           // 1st of month 06:00 — generate drafted bulletins
startCongeCrons();         // 1st of month 05:00 — add 1.5 to mon_cong
                           // Mon–Fri  08:00 — alert managers/RH about stale congés
startBulpaieReminderCron();// Every Monday 09:00 — alert RH about unvalidated bulletins

const app    = express();
const server = http.createServer(app);

// ── Attach socket.io (must come before routes if they need io) ───────────────
initSocket(server);

app.use(express.json());
app.use('/api', mainRouter);

app.get('/migrate', async (req, res) => {
    await testandsync();
    return res.status(200).json('done');
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});