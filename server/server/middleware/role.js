import { hasRole } from '../utils/role.js';

export const allowRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.salarie) {
        return res.status(401).json({ message: 'Non authentifié' });
    }
    const allowed = allowedRoles.some(role => hasRole(req.salarie, role));
    if (!allowed) {
        return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
};