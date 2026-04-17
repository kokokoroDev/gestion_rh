import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const NoteFraisLine = sequelizeCon.define(
    "NoteFraisLine",
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true,
        },
        note_frais_id: {
            type:       DataTypes.UUID,
            allowNull:  false,
            references: { model: "note_frais", key: "id" },
        },
        date: {
            type:      DataTypes.DATEONLY,
            allowNull: false,
        },
        lieu: {
            type:      DataTypes.STRING(150),
            allowNull: false,
        },
        heure_depart: {
            type:      DataTypes.STRING(5),
            allowNull: false,
        },
        destination: {
            type:      DataTypes.STRING(150),
            allowNull: false,
        },
        montant: {
            type:      DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        observation: {
            type:      DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName:  "note_frais_line",
        timestamps: true,
        createdAt:  "created_at",
        updatedAt:  "updated_at",
    }
);

NoteFraisLine.associate = (models) => {
    NoteFraisLine.belongsTo(models.NoteFrais, {
        foreignKey: "note_frais_id",
        as:         "noteFrais",
    });
};

export default NoteFraisLine;
