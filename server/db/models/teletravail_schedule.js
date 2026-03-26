import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const TeletravailSchedule = sequelizeCon.define(
    'TeletravailSchedule',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        module_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Module', key: 'id' },
            onDelete: 'CASCADE',
        },
        week_start: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Salarie', key: 'id' },
        },
    },
    {
        tableName: 'teletravail_schedules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['module_id', 'week_start'],
            },
        ],
    }
);

TeletravailSchedule.associate = (models) => {
    TeletravailSchedule.belongsTo(models.Module, { foreignKey: 'module_id', as: 'module' });
    TeletravailSchedule.belongsTo(models.Salarie, { foreignKey: 'created_by', as: 'creator' });
    TeletravailSchedule.hasMany(models.TeletravailEntry, { foreignKey: 'schedule_id', as: 'entries' });
};

export default TeletravailSchedule;