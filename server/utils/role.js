
export const hasRole = (salarieInfo, role) =>
    (salarieInfo?.roles ?? []).some(r => r.role === role);

export const isRH      = (s) => hasRole(s, 'rh');
export const isManager = (s) => hasRole(s, 'manager');

export const getPrimaryRole = (salarieInfo) => {
    if (isRH(salarieInfo))      return 'rh';
    if (isManager(salarieInfo)) return 'manager';
    return 'fonctionnaire';
};

/** All module_ids where the user is a manager (never null). */
export const getManagerModuleIds = (salarieInfo) =>
    (salarieInfo?.roles ?? [])
        .filter(r => r.role === 'manager' && r.module_id)
        .map(r => r.module_id);

/** All module_ids where the user is a fonctionnaire (never null). */
export const getFonctionnaireModuleIds = (salarieInfo) =>
    (salarieInfo?.roles ?? [])
        .filter(r => r.role === 'fonctionnaire' && r.module_id)
        .map(r => r.module_id);

/** Every distinct module_id the user is assigned to, regardless of role. */
export const getAllModuleIds = (salarieInfo) =>
    [...new Set(
        (salarieInfo?.roles ?? []).map(r => r.module_id).filter(Boolean)
    )];

/** Is this user a manager specifically for the given moduleId? */
export const isManagerOf = (salarieInfo, moduleId) =>
    (salarieInfo?.roles ?? []).some(
        r => r.role === 'manager' && r.module_id === moduleId
    );

/**
 * Build the compact roles payload stored in the JWT and in req/socket.salarie.
 * Expects SalarieRoleModule rows with their 'roleRef' include already loaded.
 */
export const buildRolesPayload = (roleModules = []) =>
    roleModules.map(rm => ({
        role:      rm.roleRef?.name ?? null,
        module_id: rm.module_id     ?? null,
    })).filter(r => r.role !== null);