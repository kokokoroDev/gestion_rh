import models from "../db/models/index.js";
import { Op } from "sequelize";
import { comparePassword, generateToken, hashPassword, verifyToken } from "../utils/auth.js";
import { sanitizeSalarie } from "../utils/sanitize.js";

const { Salarie, Module } = models

export const login = async (email, password) => {
    const salarie = await Salarie.findOne({
        where: { email }, include: [
            { model: Module, as: 'module', attributes: { exclude: 'description' } }
        ]
    });
    if (!salarie) throw new Error('Email ou mot de passe incorrect');

    if (salarie.status === 'inactive') throw new Error('Votre compte est innactive')

    const valid = await comparePassword(password, salarie.password);
    if (!valid) throw new Error('Email ou mot de passe incorrect');

    const token = generateToken({ id: salarie.id, role: salarie.role , module_id : salarie.module_id});

    const salarieData = sanitizeSalarie(salarie)

    return { salarie: salarieData, token };
};

export const refreshToken = async (oldToken) => {
    try {
        const decoded = verifyToken(oldToken);

        const salarie = await Salarie.findByPk(decoded.id);
        if (!salarie || salarie.status === 'inactive') throw new Error('Utilisateur invalide');

        return generateToken({ id: salarie.id, role: salarie.role , module_id : salarie.module_id });
    } catch (error) {
        console.error('Refresh token error:', error);
        throw new Error('Token invalide ou expiré');
    }
};

export const register = async (salarieData) => {

    const { email, cin, password } = salarieData;

    const existentCount = await Salarie.count({
        where: {
            [Op.or]: [{ email }, { cin }]
        },
        
    });
    if (existentCount > 0) throw new Error('Ce compte existe déjà')
    if(salarieData?.module_id){
        const existentModuleCount = await Module.count({
            where : {
               'id' : salarieData.module_id
            }
        })
    
        if(existentModuleCount < 1) throw new Error('Entrer un module existent')
    }

    const hashedPassword = await hashPassword(password);

    const salarie = await Salarie.create({
        ...salarieData,
        password: hashedPassword,
        role: salarieData.role || 'fonctionnaire'
    });

    const salarieWithModule = await Salarie.findByPk(salarie.id, {
        include: [{ model: Module, as: 'module', attributes: { exclude: ['description'] } }]
    });

    const token = generateToken({ id: salarie.id, role: salarie.role , module_id : salarie.module_id });

    const salarieJson = sanitizeSalarie(salarieWithModule)

    return { salarie: salarieJson, token };

};

export const changePassword = async (salarieId, oldPassword, newPassword) => {
    const salarie = await Salarie.findByPk(salarieId);
    if (!salarie) throw new Error('Utilisateur non trouvé');

    const valid = await comparePassword(oldPassword, salarie.password);
    if (!valid) throw new Error('Ancien mot de passe incorrect');

    const hashedNew = await hashPassword(newPassword);
    salarie.password = hashedNew;
    await salarie.save();
};