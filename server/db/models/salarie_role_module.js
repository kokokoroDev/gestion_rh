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
        references: { model: 'Salarie', key: 'id' },
        onDelete: 'CASCADE'
    },
    role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Role', key: 'id' },
        onDelete: 'CASCADE'
    },
    module_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Module', key: 'id' },
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

SalarieRoleModule.associate = (models) => {
    SalarieRoleModule.belongsTo(models.Salarie, { foreignKey: 'sal_id', as: 'salarie' });
    SalarieRoleModule.belongsTo(models.Role, { foreignKey: 'role_id', as: 'roleRef' });
    SalarieRoleModule.belongsTo(models.Module, { foreignKey: 'module_id', as: 'module' });
};

export default SalarieRoleModule;