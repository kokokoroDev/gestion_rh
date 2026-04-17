import { verifyToken } from './utils/auth.js';
import models from './db/models/index.js';
import { buildRolesPayload, getPrimaryRole } from './utils/role.js';

const { Salarie, SalarieRoleModule, Role } = models;

const roleModulesInclude = {
    model:   SalarieRoleModule,
    as:      'roleModules',
    include: [{ model: Role, as: 'roleRef', attributes: ['name'] }],
};

// ─── Auth middleware ──────────────────────────────────────────────────────────

export const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication token required'));

        const decoded = verifyToken(token);

        const salarie = await Salarie.findByPk(decoded.id, {
            attributes: ['id', 'status'],
            include: [roleModulesInclude],
        });

        if (!salarie || salarie.status === 'inactive') {
            return next(new Error('User not found or inactive'));
        }

        socket.salarie = {
            id:    salarie.id,
            roles: buildRolesPayload(salarie.roleModules),
        };

        next();
    } catch (error) {
        next(new Error(`Authentication failed: ${error.message}`));
    }
};

// ─── Room middleware ──────────────────────────────────────────────────────────

export const socketRoomMiddleware = (socket, next) => {
    try {
        const { id, roles } = socket.salarie;

        socket.join(`salarie-${id}`);

        let hasTeamLead = false;
        let hasManager  = false;
        let hasRH       = false;

        for (const { role } of roles) {
            if (role === 'team_lead' && !hasTeamLead) {
                socket.join(`team_lead-${id}`);
                hasTeamLead = true;
            }
            if (role === 'manager' && !hasManager) {
                socket.join(`manager-${id}`);
                hasManager = true;
            }
            if (role === 'rh' && !hasRH) {
                socket.join(`rh-${id}`);
                socket.join('rh-all');
                hasRH = true;
            }
        }

        const primary = getPrimaryRole(socket.salarie);
        console.log(
            `✓ ${primary.toUpperCase()} connected [${id}] — rooms: salarie-${id}` +
            (hasTeamLead ? `, team_lead-${id}` : '') +
            (hasManager  ? `, manager-${id}`   : '') +
            (hasRH       ? `, rh-${id}, rh-all` : '')
        );

        next();
    } catch (error) {
        next(new Error(`Room assignment failed: ${error.message}`));
    }
};

// ─── Main setup ───────────────────────────────────────────────────────────────

export const setupSocketHandlers = (io) => {
    io.use(socketAuthMiddleware);
    io.use(socketRoomMiddleware);

    io.on('connection', (socket) => {
        const primary = getPrimaryRole(socket.salarie);
        console.log(`${primary.toUpperCase()} connected: [${socket.id}]`);

        socket.on('ping', () => socket.emit('pong'));

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.salarie.id} [${socket.id}]`);
        });
    });
};

// ─── Targeted emit helpers ────────────────────────────────────────────────────

export const notifySalarie  = (io, sal_id, data)  => io.to(`salarie-${sal_id}`).emit('notification-received', data);
export const notifyManager  = (io, mgr_id, data)  => io.to(`manager-${mgr_id}`).emit('notification-received', data);
export const notifyTeamLead = (io, lead_id, data) => io.to(`team_lead-${lead_id}`).emit('notification-received', data);
export const notifyRH       = (io, rh_id, data)   => io.to(`rh-${rh_id}`).emit('notification-received', data);
export const broadcastToAllRH = (io, data)         => io.to('rh-all').emit('notification-received', data);