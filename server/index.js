import 'dotenv/config';
import express from 'express';
import mainRouter from './routes/index.js';
import { test, testandsync } from './db/index.js';
import startPaieCron from './cron/paie.cron.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './middleware/socket.js';

startPaieCron()

const app = express();
app.use(express.json());

app.use('/api', mainRouter)

app.get('/migrate', async (req, res) => {
    await testandsync()
    return res.status(200).json('done')
})


const httpServer = createServer(app)

const io = new Server(httpServer)
setupSocketHandlers(io)
export { io }

httpServer.listen(3000, () => {
    console.log('we hear you!')
})