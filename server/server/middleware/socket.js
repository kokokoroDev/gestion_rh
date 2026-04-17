import { verifyToken } from '../utils/auth.js';
import models from '../db/models/index.js';

const { Salarie } = models;

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyToken(token);
    const salarie = await Salarie.findByPk(decoded.id);

    if (!salarie || salarie.status === 'inactive') {
      return next(new Error('User not found or inactive'));
    }

    socket.salarie = {
      id: salarie.id,
      role: salarie.role,
      module_id: salarie.module_id
    };

    next();
  } catch (error) {
    next(new Error(`Authentication failed: ${error.message}`));
  }
};

export const socketRoomMiddleware = (socket, next) => {
  try {
    const { id, role } = socket.salarie;

    socket.join(`salarie-${id}`);
    console.log(`✓ Joined salarie-${id}`);

    if (role === 'manager') {
      socket.join(`manager-${id}`);
      console.log(`✓ Joined manager-${id}`);
    }

    if (role === 'rh') {
      socket.join(`rh-${id}`);
      socket.join('rh-all');
      console.log(`✓ Joined rh-${id} and rh-all`);
    }

    next();
  } catch (error) {
    next(new Error(`Room assignment failed: ${error.message}`));
  }
};

export const setupSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);
  io.use(socketRoomMiddleware);

  io.on('connection', (socket) => {
    const { id, role } = socket.salarie;
    console.log(`${role.toUpperCase()} connected:`, `[${socket.id}]`);

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${id} [${socket.id}]`);
    });
  });
};

export const notifySalarie = (io, sal_id, notificationData) => {
  io.to(`salarie-${sal_id}`).emit('notification-received', notificationData);
};

export const notifyManager = (io, manager_id, notificationData) => {
  io.to(`manager-${manager_id}`).emit('notification-received', notificationData);
};

export const notifyRH = (io, rh_id, notificationData) => {
  io.to(`rh-${rh_id}`).emit('notification-received', notificationData);
};

export const broadcastToAllRH = (io, notificationData) => {
  io.to('rh-all').emit('notification-received', notificationData);
};
