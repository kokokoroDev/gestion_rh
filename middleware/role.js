export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.salarie) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const salarieRole = req.salarie.role;
    if (!allowedRoles.includes(salarieRole)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    next();
  };
};