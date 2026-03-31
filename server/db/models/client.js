import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Client = sequelizeCon.define(
    "Client",
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true,
        },
        name: {
            type:      DataTypes.STRING(120),
            allowNull: false,
            unique:    true,
        },
        is_active: {
            type:         DataTypes.BOOLEAN,
            allowNull:    false,
            defaultValue: true,
        },
    },
    {
        tableName:  "client",
        timestamps: true,
        createdAt:  "created_at",
        updatedAt:  "updated_at",
    }
);

Client.associate = (models) => {
    Client.hasMany(models.OrdreMission, {
        foreignKey: "client_id",
        as:         "ordresMission",
        constraints: false,
    });
};

export default Client;
