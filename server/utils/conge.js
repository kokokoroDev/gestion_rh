import { Op } from "sequelize";

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
  date_fin: { [Op.gte]: date_debut },
});

export const buildAccessWhere = async (salarieInfo, extraFilters = {}) => {
  const { role, id: sal_id } = salarieInfo;
  const where = {};

  if (role === 'fonctionnaire') {
    where.sal_id = sal_id;
  } else if (role === 'rh') {
    where.status = extraFilters.status || 'reached';
  }

  if (extraFilters.status && role !== 'rh') where.status = extraFilters.status;
  if (extraFilters.type_conge) where.type_conge = extraFilters.type_conge;
  if (extraFilters.sal_id && role !== 'fonctionnaire') where.sal_id = extraFilters.sal_id;

  if (extraFilters.date_from || extraFilters.date_to) {
    where.date_debut = {};
    if (extraFilters.date_from) where.date_debut[Op.gte] = extraFilters.date_from;
    if (extraFilters.date_to) where.date_debut[Op.lte] = extraFilters.date_to;
  }

  return where;
};