import models from "../db/models/index.js";
import { isRH } from "./role.js";

const { Module, Salarie, SalarieRoleModule, Role } = models;

export const prevMonthYear = (month, year) => {
    if (month === 1) return { month: 12, year: year - 1 };
    return { month: month - 1, year };
};

export const computeNet = (salaire_brut, prime = 0, deduction = 0) => {
    const net = parseFloat(salaire_brut) + parseFloat(prime || 0) - parseFloat(deduction || 0);
    if (net < 0) throw new Error('Le salaire net ne peut pas être négatif');
    return parseFloat(net.toFixed(2));
};

/** Salarie include for bulpaie queries — resolves module via roleModules. */
export const buildSalarieInclude = () => ({
    model:      Salarie,
    as:         'salarie',
    attributes: ['id', 'prenom', 'nom', 'cin', 'date_debut'],
    include: [{
        model:      SalarieRoleModule,
        as:         'roleModules',
        attributes: ['module_id'],
        include: [{
            model:      Module,
            as:         'module',
            attributes: ['id', 'libelle'],
        }],
    }],
});

/**
 * RH can see any bulletin.
 * Everyone else can only see their own.
 * (Managers do not have cross-team access to payslips — that is RH-only.)
 */
export const checkAccess = (bulpaie, salarieInfo) => {
    if (isRH(salarieInfo)) return;
    if (bulpaie.sal_id !== salarieInfo.id) throw new Error('Accès refusé');
};