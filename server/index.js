import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mainRouter from './routes/index.js';
import { testandsync } from './db/index.js';
import { setupSocketHandlers } from './middleware/socket.js';
import startPaieCron  from './cron/paie.cron.js';
import startCongeCrons from './cron/conge.cron.js';

const app        = express();
const httpServer = createServer(app);


export const io = new Server(httpServer, {
    cors: {
        origin:      process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    },
});
setupSocketHandlers(io);

// ── Express ──────────────────────────────────────────────────────────────────
app.use(express.json());
app.use('/api', mainRouter);

app.get('/migrate', async (req, res) => {
    await testandsync();
    return res.status(200).json('done');
});

// ── Cron jobs ────────────────────────────────────────────────────────────────
startPaieCron();    // 1st of month 06:00 — generate drafted bulletins
startCongeCrons();  // 1st of month 05:00 — +1.5 balance; Mon–Fri 08:00 — stale-congé alerts

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(3000, () => {
    console.log('Server listening on port 3000');
});