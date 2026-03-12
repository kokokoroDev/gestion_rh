import { Server } from 'socket.io';
import jwt        from 'jsonwebtoken';

let io;

/**
 * Attach socket.io to the raw http.Server.
 * Must be called once, before app.listen.
 */
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin:      process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true,
        },
    });

    // ── JWT auth middleware ──────────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Unauthorized'));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;   // must match salarie.id in your JWT payload
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    // ── Each user joins a private room ───────────────────────────────────
    io.on('connection', (socket) => {
        socket.join(`user:${socket.userId}`);
        socket.on('disconnect', () => {});
    });

    return io;
};

/**
 * Push an event to one user's private room.
 * Safe to call before socket.io is ready (no-op).
 */
export const emitToUser = (userId, event, data) => {
    if (io) io.to(`user:${userId}`).emit(event, data);
};