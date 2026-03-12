import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Notification = sequelizeCon.define(
    'Notification',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        sal_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Salarie', key: 'id' },
        },
        type: {
            type: DataTypes.ENUM(
                'conge_status_change',
                'bulpaie_validated',
                'conge_reminder',
                'bulpaie_reminder',
                'general'
            ),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        // Optional link back to the source record
        ref_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        tableName: 'notification',
        timestamps: true,
        createdAt: 'create_at',
        updatedAt: false,
    }
);

Notification.associate = (models) => {
    Notification.belongsTo(models.Salarie, {
        foreignKey: 'sal_id',
        as: 'salarie',
    });
};

export default Notification;