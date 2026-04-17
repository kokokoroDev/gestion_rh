import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const TeletravailParticipant = sequelizeCon.define(
    'TeletravailParticipant',
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
            references: { model: 'module', key: 'id' },
            onDelete: 'CASCADE',
        },
        salarie_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'salarie', key: 'id' },
            onDelete: 'SET NULL',
        },
        prenom: {
            type: DataTypes.STRING(25),
            allowNull: false,
        },
        nom: {
            type: DataTypes.STRING(25),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(75),
            allowNull: true,
        },
        source_type: {
            type: DataTypes.ENUM('manual', 'salarie'),
            allowNull: false,
            defaultValue: 'manual',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'salarie', key: 'id' },
        },
    },
    {
        tableName: 'teletravail_participants',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                fields: ['module_id', 'status'],
            },
            {
                fields: ['module_id', 'salarie_id'],
            },
        ],
    }
);

TeletravailParticipant.associate = (models) => {
    TeletravailParticipant.belongsTo(models.Module, { foreignKey: 'module_id', as: 'module' });
    TeletravailParticipant.belongsTo(models.Salarie, { foreignKey: 'salarie_id', as: 'salarie' });
    TeletravailParticipant.belongsTo(models.Salarie, { foreignKey: 'created_by', as: 'creator' });
    TeletravailParticipant.hasMany(models.TeletravailEntry, { foreignKey: 'participant_id', as: 'entries' });
};

export default TeletravailParticipant;
