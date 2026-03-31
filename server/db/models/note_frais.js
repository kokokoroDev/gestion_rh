import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const NoteFrais = sequelizeCon.define(
    "NoteFrais",
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true,
        },
        salarie_id: {
            type:       DataTypes.UUID,
            allowNull:  false,
            references: { model: "salarie", key: "id" },
        },
        month: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        year: {
            type:      DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type:         DataTypes.ENUM("draft", "sent", "reviewed"),
            allowNull:    false,
            defaultValue: "draft",
        },
        sent_at: {
            type:      DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName:  "note_frais",
        timestamps: true,
        createdAt:  "created_at",
        updatedAt:  "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["salarie_id", "month", "year"],
            },
        ],
    }
);

NoteFrais.associate = (models) => {
    NoteFrais.belongsTo(models.Salarie, {
        foreignKey: "salarie_id",
        as:         "salarie",
    });
    NoteFrais.hasMany(models.NoteFraisLine, {
        foreignKey: "note_frais_id",
        as:         "lines",
        onDelete:   "CASCADE",
    });
};

export default NoteFrais;
