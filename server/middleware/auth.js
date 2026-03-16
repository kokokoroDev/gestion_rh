import { verifyToken } from '../utils/auth.js';

// req.salarie shape after this middleware: { id, roles: [{ role, module_id }] }
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token manquant ou invalide' });
        }

        const token   = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        req.salarie = {
            id:    decoded.id,
            roles: decoded.roles ?? [],
        };

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
};