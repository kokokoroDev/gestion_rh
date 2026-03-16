import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const SalarieRoleModule = sequelizeCon.define('SalarieRoleModule', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    sal_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'salarie',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'role',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    module_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'module',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'salarie_role_module',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['sal_id', 'role_id', 'module_id']
        }
    ]
});

export default SalarieRoleModule;