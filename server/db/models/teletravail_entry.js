import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const TeletravailEntry = sequelizeCon.define(
    'TeletravailEntry',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        schedule_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'teletravail_schedules', key: 'id' },
            onDelete: 'CASCADE',
        },
        salarie_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Salarie', key: 'id' },
            onDelete: 'CASCADE',
        },
        day_of_week: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 0, max: 6 },
        },
        is_teletravail: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
        },
    },
    {
        tableName: 'teletravail_entries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['schedule_id', 'salarie_id', 'day_of_week'],
            },
        ],
    }
);

TeletravailEntry.associate = (models) => {
    TeletravailEntry.belongsTo(models.TeletravailSchedule, { foreignKey: 'schedule_id', as: 'schedule' });
    TeletravailEntry.belongsTo(models.Salarie, { foreignKey: 'salarie_id', as: 'salarie' });
};

export default TeletravailEntry;