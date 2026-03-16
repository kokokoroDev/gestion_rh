/**
 * Returns a safe, serialisable representation of a Salarie for API responses.
 *
 * Stripped fields:
 *   - password     — never exposed
 *   - deleted_at   — Sequelize paranoid bookkeeping
 *   - date_fin     — internal HR field
 *   - date_debut   — internal HR field
 *
 * Preserved:
 *   - roleModules  — callers need this to know what the authenticated user can do.
 *                    Each entry: { role_id, module_id, roleRef: { name }, module: { id, libelle } }
 */
export const sanitizeSalarie = (salarie) => {
    const json = salarie.toJSON ? salarie.toJSON() : { ...salarie };
    delete json.password;
    delete json.deleted_at;
    delete json.date_fin;
    delete json.date_debut;
    return json;
};  