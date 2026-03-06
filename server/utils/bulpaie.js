import models from "../db/models/index.js";

const {Module , Salarie } = models

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