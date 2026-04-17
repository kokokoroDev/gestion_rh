import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const OrdreMission = sequelizeCon.define(
    "OrdreMission",
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
        client_id: {
            type:       DataTypes.UUID,
            allowNull:  true,
        },
        direction_depart: {
            type:      DataTypes.STRING(150),
            allowNull: false,
        },
        date_mission: {
            type:      DataTypes.DATEONLY,
            allowNull: false,
        },
        heure_depart: {
            type:      DataTypes.STRING(5),
            allowNull: false,
        },
        heure_fin: {
            type:      DataTypes.STRING(5),
            allowNull: false,
        },
        nature_mission: {
            type:      DataTypes.TEXT,
            allowNull: false,
        },
        vehicule: {
            type:      DataTypes.STRING(150),
            allowNull: true,
        },
        destination_label: {
            type:      DataTypes.STRING(150),
            allowNull: false,
        },
    },
    {
        tableName:  "ordre_mission",
        timestamps: true,
        createdAt:  "created_at",
        updatedAt:  "updated_at",
    }
);

OrdreMission.associate = (models) => {
    OrdreMission.belongsTo(models.Salarie, {
        foreignKey: "salarie_id",
        as:         "salarie",
    });
    OrdreMission.belongsTo(models.Client, {
        foreignKey: "client_id",
        as:         "client",
        constraints: false,
    });
};

export default OrdreMission;
