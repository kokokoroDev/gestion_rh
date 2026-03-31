import sequelizeCon from "./config/sequelize.js";
import models from "./models/index.js";

const MODULE_LABELS = [
    "TECHNIQUE",
    "MM",
    "SD",
    "PP/PM",
    "FI/CO",
    "BASIS",
    "BI",
];

const cleanupOrphanOrdreMissionClients = async () => {
    const [ordreMissionTables] = await sequelizeCon.query("SHOW TABLES LIKE 'ordre_mission'");
    const [clientTables] = await sequelizeCon.query("SHOW TABLES LIKE 'client'");

    if (!ordreMissionTables.length || !clientTables.length) {
        return;
    }

    const [, metadata] = await sequelizeCon.query(`
        UPDATE ordre_mission om
        LEFT JOIN client c ON c.id = om.client_id
        SET om.client_id = NULL
        WHERE om.client_id IS NOT NULL
          AND c.id IS NULL
    `);

    const affectedRows = metadata?.affectedRows ?? 0;
    if (affectedRows > 0) {
        console.log(`cleaned ${affectedRows} orphan ordre_mission client reference(s)`);
    }
};

const seedDefaultModules = async () => {
    const [moduleTables] = await sequelizeCon.query("SHOW TABLES LIKE 'module'");
    if (!moduleTables.length) {
        return;
    }

    for (const libelle of MODULE_LABELS) {
        await models.Module.findOrCreate({
            where: { libelle },
            defaults: { libelle, description: null },
        });
    }
};

export const test = async () => {
    try {
        await sequelizeCon.authenticate();
        console.log('connected successfully')

    } catch (error) {
        console.log('Not connected', error)
    }
}

export const testandsync = async () => {
    try {
        await cleanupOrphanOrdreMissionClients();
        await sequelizeCon.sync({ alter: true })
        await seedDefaultModules();
        console.log('db is synced')
    } catch (error) {
        console.log(error)
        console.log('not synced')
    }
}

