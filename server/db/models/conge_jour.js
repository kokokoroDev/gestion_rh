import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const CongeDay = sequelizeCon.define('CongeDay', {
    id: {
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    conge_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'conge', key: 'id' },
        onDelete: 'CASCADE',
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    is_half_day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    half_period: {
        type: DataTypes.ENUM('morning', 'afternoon'),
        allowNull: true,
    },
}, {
    tableName: 'conge_day',
    timestamps: false,
    indexes: [
        { fields: ['conge_id'] },
        { unique: true, fields: ['conge_id', 'date'] },
    ],
});

CongeDay.associate = (models) => {
    CongeDay.belongsTo(models.Conge, {
        foreignKey: 'conge_id',
        as: 'conge',
        onDelete: 'CASCADE',
    });
};

export default CongeDay;