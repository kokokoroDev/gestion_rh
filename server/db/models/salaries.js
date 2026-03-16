import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Salarie = sequelizeCon.define('Salarie', {
    id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
    },
    cin: {
        type: DataTypes.CHAR(8),
        allowNull: false,
        unique: true
    },
    prenom: {
        type: DataTypes.STRING(25),
        allowNull: false
    },
    nom: {
        type: DataTypes.STRING(25),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(75),
        allowNull: false,
        unique: true
    },
    date_debut: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
    },
    date_fin: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    mon_cong: {
        type: DataTypes.DECIMAL(4,1),
        defaultValue: 0.0
    },
    salaire_base: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: true,
        defaultValue: 4000.00
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6,100]
        }
    }
}, {
    tableName: 'salarie',
    timestamps: true,
    createdAt: 'created_at',
    deletedAt: 'deleted_at',
    updatedAt: 'updated_at',
    paranoid: true
});

Salarie.associate = (models) => {
    Salarie.belongsToMany(models.Role, {
        through: models.SalarieRoleModule,
        foreignKey: 'salarie_id',
        otherKey: 'role_id',
        as: 'roles'
    });

    Salarie.belongsToMany(models.Module, {
        through: models.SalarieRoleModule,
        foreignKey: 'salarie_id',
        otherKey: 'module_id',
        as: 'modules'
    });

    Salarie.hasMany(models.SalarieRoleModule, {
        foreignKey: 'salarie_id',
        as: 'roleModules'
    });

    Salarie.hasMany(models.Conge, {
        foreignKey: 'sal_id',
        as: 'conges'
    });
    Salarie.hasMany(models.Bulpaie, {
        foreignKey: 'sal_id',
        as: 'bulletins'
    });
};

export default Salarie;