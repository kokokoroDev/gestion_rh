import { Server } from "socket.io";

export const createConnectionIo = (httpServer) => {
    const io = new Server(httpServer)

    return io
} 