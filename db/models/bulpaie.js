import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Bulpaie = sequelizeCon.define(
    'Bulpaie',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        sal_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Salarie',
                key: 'id'
            }
        },
        salaire_brut: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false
        },
        deduction: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false
        },
        prime: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: true
        },
        salaire_net: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
        },
        month: {
            type: DataTypes.INTEGER,
            defaultValue : () => new Date().getMonth() + 1,
            validate : {
                min : 1,
                max : 12
            }
        },
        year: {
            type: DataTypes.INTEGER,
            defaultValue : () => new Date().getFullYear(),
            validate : {
                min : 2000,
                max : () => new Date().getFullYear() + 1,
            }
        },
        status : {
            type : DataTypes.ENUM('drafted' , 'validated'),
            defaultValue : 'drafted'
        }
    },
    {
        tableName : 'bulpaie',
        timestamps : false,
        indexes : [
            {
                unique : true,
                fields : ['sal_id' , 'month' , 'year']
            }
        ]
    }
) 

Bulpaie.associate = (models) => {
    Bulpaie.belongsTo(models.Salarie , {
        foreignKey : 'sal_id',
        as : 'salarie'
    })
}

export default Bulpaie