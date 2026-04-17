import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Module = sequelizeCon.define(
    'Module',
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true
        },
        libelle: {
            type:      DataTypes.STRING(50),
            allowNull: false,
        },
        description: {
            type:      DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName:  'module',
        timestamps: true,
        createdAt:  'created_at',
        updatedAt:  'updated_at',
    }
);

Module.associate = (models) => {

    Module.hasMany(models.SalarieRoleModule, {
        foreignKey: 'module_id',
        as:         'roleAssignments',
    });
};

export default Module;
