import { Op } from "sequelize";
import { isRH, isManager, getPrimaryRole } from "./role.js";

export const countWorkingDays = (start, end) => {
    let count = 0;
    const current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
};

export const overlapCondition = (date_debut, date_fin) => ({
    date_debut: { [Op.lte]: date_fin },
    date_fin:   { [Op.gte]: date_debut },
});

/**
 * Builds the Conge-level WHERE clause.
 * Module scoping for managers is handled in the service via a SalarieRoleModule JOIN —
 * Conge has no module_id column so it cannot be done here.
 */
export const buildAccessWhere = (salarieInfo, extraFilters = {}) => {
    const { id: sal_id } = salarieInfo;
    const primaryRole    = getPrimaryRole(salarieInfo);
    const where          = {};

    if (primaryRole === 'fonctionnaire') {
        where.sal_id = sal_id;
    } else if (isRH(salarieInfo)) {
        if (extraFilters.sal_id) {
            where.sal_id = extraFilters.sal_id;
        } else {
            where.status = extraFilters.status || 'reached';
        }
    }

    if (extraFilters.status && !isRH(salarieInfo))                             where.status     = extraFilters.status;
    if (extraFilters.status && isRH(salarieInfo) && extraFilters.sal_id)       where.status     = extraFilters.status;
    if (extraFilters.type_conge)                                                where.type_conge = extraFilters.type_conge;
    if (extraFilters.sal_id && isManager(salarieInfo) && !isRH(salarieInfo))   where.sal_id     = extraFilters.sal_id;

    if (extraFilters.date_from || extraFilters.date_to) {
        where.date_debut = {};
        if (extraFilters.date_from) where.date_debut[Op.gte] = extraFilters.date_from;
        if (extraFilters.date_to)   where.date_debut[Op.lte] = extraFilters.date_to;
    }

    return where;
};