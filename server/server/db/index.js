import sequelizeCon from "./config/sequelize.js";
import models from "./models/index.js";
import { hashPassword } from "../utils/auth.js";

const MODULE_LABELS = [
    "TECHNIQUE",
    "MM",
    "SD",
    "PP/PM",
    "FI/CO",
    "BASIS",
    "BI",
];

const ROLE_NAMES = ["rh", "manager", "team_lead", "fonctionnaire"];

const DEFAULT_ADMIN = {
    cin: process.env.SEED_ADMIN_CIN || "RH000001",
    prenom: process.env.SEED_ADMIN_PRENOM || "Admin",
    nom: process.env.SEED_ADMIN_NOM || "RH",
    email: process.env.SEED_ADMIN_EMAIL || "rh.admin@skatys.local",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
};

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

const seedDefaultRoles = async () => {
    const [roleTables] = await sequelizeCon.query("SHOW TABLES LIKE 'role'");
    if (!roleTables.length) {
        return;
    }

    for (const name of ROLE_NAMES) {
        await models.Role.findOrCreate({
            where: { name },
            defaults: { name },
        });
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

const seedDefaultAdmin = async () => {
    const [salarieTables] = await sequelizeCon.query("SHOW TABLES LIKE 'salarie'");
    const [roleModuleTables] = await sequelizeCon.query("SHOW TABLES LIKE 'salarie_role_module'");

    if (!salarieTables.length || !roleModuleTables.length) {
        return;
    }

    const rhRole = await models.Role.findOne({ where: { name: "rh" } });
    if (!rhRole) {
        return;
    }

    let admin = await models.Salarie.findOne({
        where: { email: DEFAULT_ADMIN.email },
    });

    if (!admin) {
        admin = await models.Salarie.findOne({
            where: { cin: DEFAULT_ADMIN.cin },
        });
    }

    if (!admin) {
        admin = await models.Salarie.create({
            cin: DEFAULT_ADMIN.cin,
            prenom: DEFAULT_ADMIN.prenom,
            nom: DEFAULT_ADMIN.nom,
            email: DEFAULT_ADMIN.email,
            password: await hashPassword(DEFAULT_ADMIN.password),
            status: "active",
        });

        console.log(`seeded default RH admin account (${DEFAULT_ADMIN.email})`);
    }

    await models.SalarieRoleModule.findOrCreate({
        where: {
            sal_id: admin.id,
            role_id: rhRole.id,
            module_id: null,
        },
        defaults: {
            sal_id: admin.id,
            role_id: rhRole.id,
            module_id: null,
        },
    });
};

const prepareLegacyTeletravailMigration = async () => {
    const [entryTables] = await sequelizeCon.query("SHOW TABLES LIKE 'teletravail_entries'");
    const [scheduleTables] = await sequelizeCon.query("SHOW TABLES LIKE 'teletravail_schedules'");
    const [participantTables] = await sequelizeCon.query("SHOW TABLES LIKE 'teletravail_participants'");
    const [salarieTables] = await sequelizeCon.query("SHOW TABLES LIKE 'salarie'");

    if (!entryTables.length || !scheduleTables.length || !salarieTables.length) {
        return;
    }

    if (!participantTables.length) {
        await models.TeletravailParticipant.sync();
    }

    const [entryColumns] = await sequelizeCon.query("SHOW COLUMNS FROM teletravail_entries");
    const hasParticipantId = entryColumns.some((column) => column.Field === "participant_id");

    if (!hasParticipantId) {
        await sequelizeCon.query(`
            ALTER TABLE teletravail_entries
            ADD COLUMN participant_id CHAR(36) BINARY NULL AFTER schedule_id
        `);
    }

    await sequelizeCon.query(`
        DELETE te
        FROM teletravail_entries te
        LEFT JOIN teletravail_schedules ts ON ts.id = te.schedule_id
        WHERE ts.id IS NULL
    `);

    const [entryColumnsAfterAdd] = await sequelizeCon.query("SHOW COLUMNS FROM teletravail_entries");
    const hasLegacySalarieId = entryColumnsAfterAdd.some((column) => column.Field === "salarie_id");

    if (!hasLegacySalarieId) {
        return;
    }

    await sequelizeCon.query(`
        DELETE te
        FROM teletravail_entries te
        LEFT JOIN salarie s ON s.id = te.salarie_id
        WHERE te.salarie_id IS NOT NULL
          AND s.id IS NULL
    `);

    await sequelizeCon.query(`
        INSERT INTO teletravail_participants (
            id,
            module_id,
            salarie_id,
            prenom,
            nom,
            email,
            source_type,
            status,
            created_by,
            created_at,
            updated_at
        )
        SELECT
            UUID(),
            ts.module_id,
            s.id,
            s.prenom,
            s.nom,
            s.email,
            'salarie',
            'active',
            COALESCE(ts.created_by, s.id),
            NOW(),
            NOW()
        FROM teletravail_entries te
        INNER JOIN teletravail_schedules ts ON ts.id = te.schedule_id
        INNER JOIN salarie s ON s.id = te.salarie_id
        LEFT JOIN teletravail_participants tp
            ON tp.module_id = ts.module_id
           AND tp.salarie_id = s.id
        WHERE te.salarie_id IS NOT NULL
          AND tp.id IS NULL
    `);

    await sequelizeCon.query(`
        UPDATE teletravail_entries te
        INNER JOIN teletravail_schedules ts ON ts.id = te.schedule_id
        INNER JOIN teletravail_participants tp
            ON tp.module_id = ts.module_id
           AND tp.salarie_id = te.salarie_id
        SET te.participant_id = tp.id
        WHERE te.salarie_id IS NOT NULL
          AND te.participant_id IS NULL
    `);

    await sequelizeCon.query(`
        DELETE te1
        FROM teletravail_entries te1
        INNER JOIN teletravail_entries te2
            ON te1.schedule_id = te2.schedule_id
           AND te1.day_of_week = te2.day_of_week
           AND te1.participant_id <=> te2.participant_id
           AND te1.id > te2.id
        WHERE te1.participant_id IS NOT NULL
    `);

    await sequelizeCon.query(`
        DELETE FROM teletravail_entries
        WHERE participant_id IS NULL
    `);

    const [entryConstraints] = await sequelizeCon.query(`
        SELECT
            CONSTRAINT_NAME,
            COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'teletravail_entries'
          AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const legacyForeignKeys = [...new Set(
        entryConstraints
            .filter((constraint) => constraint.COLUMN_NAME === "salarie_id")
            .map((constraint) => constraint.CONSTRAINT_NAME)
    )];

    for (const constraintName of legacyForeignKeys) {
        await sequelizeCon.query(`
            ALTER TABLE teletravail_entries
            DROP FOREIGN KEY \`${constraintName}\`
        `);
    }

    const [entryIndexes] = await sequelizeCon.query("SHOW INDEX FROM teletravail_entries");
    const existingIndexNames = [...new Set(entryIndexes.map((index) => index.Key_name))];

    if (!existingIndexNames.includes("idx_teletravail_entries_schedule_id")) {
        await sequelizeCon.query(`
            ALTER TABLE teletravail_entries
            ADD INDEX idx_teletravail_entries_schedule_id (schedule_id)
        `);
    }

    const legacyIndexNames = [...new Set(
        entryIndexes
            .filter((index) => String(index.Key_name || "").includes("salarie_id"))
            .map((index) => index.Key_name)
    )];

    for (const indexName of legacyIndexNames) {
        await sequelizeCon.query(`
            ALTER TABLE teletravail_entries
            DROP INDEX \`${indexName}\`
        `);
    }
};

export const test = async () => {
    try {
        await sequelizeCon.authenticate();
        console.log("connected successfully");
    } catch (error) {
        console.log("Not connected", error);
        throw error;
    }
};

export const testandsync = async () => {
    try {
        await sequelizeCon.authenticate();
        await cleanupOrphanOrdreMissionClients();
        await prepareLegacyTeletravailMigration();
        await sequelizeCon.sync({ alter: true });
        await seedDefaultRoles();
        await seedDefaultModules();
        await seedDefaultAdmin();
        console.log("db is synced");
    } catch (error) {
        console.log(error);
        console.log("not synced");
        throw error;
    }
};
