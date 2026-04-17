import models from "../db/models/index.js";
import { Op } from "sequelize";
import { comparePassword, generateToken, hashPassword, verifyToken } from "../utils/auth.js";
import { sanitizeSalarie } from "../utils/sanitize.js";
import { buildRolesPayload } from "../utils/role.js";

const { Salarie, SalarieRoleModule, Role, Module } = models;

// Include that pulls role names for JWT building.
const roleModulesInclude = {
    model:   SalarieRoleModule,
    as:      'roleModules',
    include: [
        { model: Role,   as: 'roleRef', attributes: ['name']     },
        { model: Module, as: 'module',  attributes: ['id', 'libelle'] },
    ],
};

export const login = async (email, password) => {
    const salarie = await Salarie.findOne({
        where:   { email },
        include: [roleModulesInclude],
    });

    if (!salarie)                      throw new Error('Email ou mot de passe incorrect');
    if (salarie.status === 'inactive') throw new Error('Votre compte est inactif');

    const valid = await comparePassword(password, salarie.password);
    if (!valid) throw new Error('Email ou mot de passe incorrect');

    const roles = buildRolesPayload(salarie.roleModules);
    const token = generateToken({ id: salarie.id, roles });

    return { salarie: sanitizeSalarie(salarie), token };
};

export const refreshToken = async (oldToken) => {
    try {
        const decoded = verifyToken(oldToken);

        const salarie = await Salarie.findByPk(decoded.id, {
            attributes: ['id', 'status'],
            include:    [{ model: SalarieRoleModule, as: 'roleModules',
                           include: [{ model: Role, as: 'roleRef', attributes: ['name'] }] }],
        });
        if (!salarie || salarie.status === 'inactive') {
            throw new Error('Utilisateur invalide');
        }

        const roles = buildRolesPayload(salarie.roleModules);
        return generateToken({ id: salarie.id, roles });
    } catch {
        throw new Error('Token invalide ou expiré');
    }
};

export const register = async (salarieData) => {
    const { email, cin, password } = salarieData;

    const existentCount = await Salarie.count({
        where: { [Op.or]: [{ email }, { cin }] },
    });
    if (existentCount > 0) throw new Error('Ce compte existe déjà');

    // Validate module if provided, but public registration is always fonctionnaire.
    let moduleId = salarieData.module_id ?? null;
    if (moduleId) {
        const moduleExists = await Module.count({ where: { id: moduleId } });
        if (moduleExists < 1) throw new Error('Entrer un module existant');
    }

    const hashedPassword = await hashPassword(password);

    const salarie = await Salarie.create({
        cin:      salarieData.cin,
        prenom:   salarieData.prenom,
        nom:      salarieData.nom,
        email:    salarieData.email,
        password: hashedPassword,
    });

    // Find the fonctionnaire Role row.
    const fonctionnaireRole = await Role.findOne({ where: { name: 'fonctionnaire' } });
    if (!fonctionnaireRole) throw new Error('Rôle "fonctionnaire" introuvable — vérifiez les données de référence');

    await SalarieRoleModule.create({
        sal_id:    salarie.id,
        role_id:   fonctionnaireRole.id,
        module_id: moduleId,
    });

    const salarieWithRoles = await Salarie.findByPk(salarie.id, {
        include: [roleModulesInclude],
    });

    const roles = buildRolesPayload(salarieWithRoles.roleModules);
    const token = generateToken({ id: salarie.id, roles });

    return { salarie: sanitizeSalarie(salarieWithRoles), token };
};

export const changePassword = async (salarieId, oldPassword, newPassword) => {
    const salarie = await Salarie.findByPk(salarieId);
    if (!salarie) throw new Error('Utilisateur non trouvé');

    const valid = await comparePassword(oldPassword, salarie.password);
    if (!valid) throw new Error('Ancien mot de passe incorrect');

    salarie.password = await hashPassword(newPassword);
    await salarie.save();
};