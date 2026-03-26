
/** All role name strings for a salarie */
const roleNames = (salarie) =>
    (salarie?.roleModules ?? []).map((rm) => rm.roleRef?.name).filter(Boolean)

/** Does the salarie hold this role in at least one module? */
export const hasRole = (salarie, role) => roleNames(salarie).includes(role)

export const isRH      = (salarie) => hasRole(salarie, 'rh')
export const isManager = (salarie) => hasRole(salarie, 'manager')
export const isTeamlead = (salarie) => hasRole(salarie, 'team_lead')

/**
 * Strongest single role string — used for display and simple branching.
 * Priority: rh > manager > fonctionnaire
 */
export const getPrimaryRole = (salarie) => {
    if (isRH(salarie))      return 'rh'
    if (isManager(salarie)) return 'manager'
    if (isTeamlead(salarie)) return 'team_lead'
    return 'fonctionnaire'
}

/** All distinct module_ids the salarie is assigned to (never null). */
export const getModuleIds = (salarie) =>
    [...new Set(
        (salarie?.roleModules ?? []).map((rm) => rm.module_id).filter(Boolean)
    )]

/** First non-null module_id — convenience shortcut for single-module salaries. */
export const getFirstModuleId = (salarie) =>
    (salarie?.roleModules ?? []).find((rm) => rm.module_id)?.module_id ?? null

/** Unique Module objects { id, libelle } attached to any of the salarie's role rows. */
export const getUniqueModules = (salarie) => {
    const seen = new Map()
    for (const rm of salarie?.roleModules ?? []) {
        if (rm.module?.id && !seen.has(rm.module.id)) seen.set(rm.module.id, rm.module)
    }
    return [...seen.values()]
}