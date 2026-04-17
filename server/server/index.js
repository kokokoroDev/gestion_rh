import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mainRouter from "./routes/index.js";
import { testandsync } from "./db/index.js";
import { setupSocketHandlers } from "./middleware/socket.js";
import startCongeCrons from "./cron/conge.cron.js";

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_DB_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 30);
const DB_RETRY_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 2000);

let isReady = false;

export const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    },
});

setupSocketHandlers(io);

app.use(express.json());
app.use("/api", mainRouter);

app.get("/health", (req, res) => {
    if (!isReady) {
        return res.status(503).json({ status: "starting" });
    }

    return res.status(200).json({ status: "ok" });
});

app.get("/migrate", async (req, res) => {
    await testandsync();
    return res.status(200).json("done");
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startServer = async () => {
    for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
        try {
            await testandsync();
            isReady = true;
            startCongeCrons();
            httpServer.listen(PORT, HOST, () => {
                console.log(`Server listening on ${HOST}:${PORT}`);
            });
            return;
        } catch (error) {
            console.error(`Database bootstrap attempt ${attempt}/${MAX_DB_RETRIES} failed.`);

            if (attempt === MAX_DB_RETRIES) {
                process.exit(1);
            }

            await sleep(DB_RETRY_DELAY_MS);
        }
    }
};

startServer();
