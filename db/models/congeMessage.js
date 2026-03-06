import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const CongeMessage = sequelizeCon.define(
    'CongeMessage',
    {
        id: {
            primaryKey: true,
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false
        },
        sal_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Salarie',
                key: 'id'
            },
        },
        cong_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Conge',
                key: 'id'
            },
        },
        commentaire: {
            type: DataTypes.TEXT,
            allowNull: true,
        }
    },
    {
        tableName: 'congeMessage',
        timestamps: true,
        createdAt: 'create_at',
        updatedAt: 'updated_at',
    }
)

CongeMessage.associate = (models) => {
    CongeMessage.belongsTo(models.Conge, {
        foreignKey: 'cong_id',
        as: 'conge'
    })

    CongeMessage.belongsTo(models.Salarie, {
        foreignKey: 'sal_id',
        as: 'salarie'
    })
}

export default CongeMessage