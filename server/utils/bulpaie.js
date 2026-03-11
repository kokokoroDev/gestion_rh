import models from "../db/models/index.js";

const {Module , Salarie } = models

/**
 * Given a month (1–12) and year, return the previous month and year.
 */
export const prevMonthYear = (month, year) => {
    if (month === 1) return { month: 12, year: year - 1 };
    return { month: month - 1, year };
};



export const computeNet = (salaire_brut, prime = 0, deduction = 0) => {
    const net = parseFloat(salaire_brut) + parseFloat(prime || 0) - parseFloat(deduction || 0);
    if (net < 0) throw new Error('Le salaire net ne peut pas être négatif');
    return parseFloat(net.toFixed(2));
};

export const buildSalarieInclude = () => ({
    model: Salarie,
    as: 'salarie',
    attributes: ['id', 'prenom', 'nom', 'cin', 'module_id', 'date_debut'],
    include: [{ model: Module, as: 'module', attributes: ['id', 'libelle'] }],
});

export const checkAccess = (bulpaie, salarieInfo) => {
    const { role, id: callerId, module_id } = salarieInfo;
    if (role === 'rh') return;

    if (bulpaie.sal_id !== callerId) {
        throw new Error('Accès refusé');
    }
};