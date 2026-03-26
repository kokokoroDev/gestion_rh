import { verifyToken } from '../utils/auth.js';
import models from '../db/models/index.js';
import { buildRolesPayload, isRH, isManager, getPrimaryRole } from '../utils/role.js';

const { Salarie, SalarieRoleModule, Role } = models;

// ─── Reusable include that hydrates role names ────────────────────────────────
const roleModulesInclude = {
    model: SalarieRoleModule,
    as: 'roleModules',
    include: [{ model: Role, as: 'roleRef', attributes: ['name'] }],
};

// ─── Auth middleware ──────────────────────────────────────────────────────────

/**
 * Verifies the JWT from the socket handshake, confirms the user is still
 * active, then attaches { id, roles } to socket.salarie.
 *
 * We re-query role assignments on every new socket connection so that any
 * role changes made since the token was issued are immediately reflected
 * in room assignments.
 */
export const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication token required'));

        const decoded = verifyToken(token);

        // Lightweight active-user check + current role fetch.
        const salarie = await Salarie.findByPk(decoded.id, {
            attributes: ['id', 'status'],
            include: [roleModulesInclude],
        });

        if (!salarie || salarie.status === 'inactive') {
            return next(new Error('User not found or inactive'));
        }

        socket.salarie = {
            id: salarie.id,
            roles: buildRolesPayload(salarie.roleModules),
        };

        next();
    } catch (error) {
        next(new Error(`Authentication failed: ${error.message}`));
    }
};

// ─── Room middleware ──────────────────────────────────────────────────────────

/**
 * Assigns the socket to the appropriate rooms based on the user's roles.
 *
 * Every user joins their personal room `salarie-{id}`.
 * Managers additionally join `manager-{id}` (used for targeted manager alerts).
 * RH users join both `rh-{id}` and the broadcast room `rh-all`.
 *
 * Because a salarie can now hold multiple roles (e.g. manager of two modules
 * AND a fonctionnaire in a third), all applicable rooms are joined.
 */
export const socketRoomMiddleware = (socket, next) => {
    try {
        const { id, roles } = socket.salarie;

        // Personal room — every user gets one.
        socket.join(`salarie-${id}`);

        // Role-specific rooms — iterate all assignments.
        const joinedManagerRoom = false;
        let hasTeamLead = false
        let hasManager = false;
        let hasRH = false;

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
            (hasManager ? `, manager-${id}` : '') +
            (hasTeamLead ? `, team_lead-${id}` : '') +
            (hasRH ? `, rh-${id}, rh-all` : '')
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
// These are imported by utils/notification.js and the cron jobs.

export const notifySalarie = (io, sal_id, data) =>
    io.to(`salarie-${sal_id}`).emit('notification-received', data);

export const notifyManager = (io, manager_id, data) =>
    io.to(`manager-${manager_id}`).emit('notification-received', data);

export const notifyTeamLead = (io, lead_id, data) =>
    io.to(`manager-${lead_id}`).emit('notification-received', data);

export const notifyRH = (io, rh_id, data) =>
    io.to(`rh-${rh_id}`).emit('notification-received', data);

export const broadcastToAllRH = (io, data) =>
    io.to('rh-all').emit('notification-received', data);