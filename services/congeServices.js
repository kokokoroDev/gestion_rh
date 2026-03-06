// import models from "../db/models";
// import { validateSalarie } from "../validations/auth.js";
// const { Conge, Salarie, CongeMessage } = models

// export const sommetreConge = async (data) => {
//     try {
//         const { sal_id, date_debut, date_fin } = data
//         if (!(await validateSalarie(sal_id))) throw new Error('Salarié non trouvé');

//         const debut = new Date(date_debut)
//         const fin = new Date(date_fin)
//         if (isNaN(debut) || isNaN(fin)) {
//             throw new Error('Dates invalides');
//         }

//         if (fin < debut) {
//             throw new Error('La date de fin doit être postérieure à la date de début');
//         }

//         const overlapping = await Conge.findOne({
//             where: {
//                 sal_id,
//                 statut: { [Op.ne]: 'refuse' },
//                 [Op.and]: [
//                     { date_debut: { [Op.lte]: date_fin } },
//                     { date_fin: { [Op.gte]: date_debut } }
//                 ]
//             }
//         });
//         if (overlapping) {
//             throw new Error('Une demande de congé existe déjà sur cette période');
//         }

//         const joursDemandes = nbJoursOuvrables(debut, fin);
//         const salarie = await Salarie.findByPk(sal_id);
//         if (salarie.mon_cong < joursDemandes) {
//             throw new Error('Solde de congés insuffisant');
//         }

//         try {
//             const conge = await Conge.create({
//                 ...data,
//                 statut: 'soumis'
//             });
//             return conge;
//         } catch (error) {
//             if (error.name === 'SequelizeUniqueConstraintError') {
//                 throw new Error('Cette demande de congé existe déjà');
//             }
//             throw error;
//         }
//     } catch {
//         return false
//     }
// }  