import { DataTypes } from 'sequelize';
import sequelizeCon from '../config/sequelize.js';

const Notification = sequelizeCon.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    sal_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Salarie',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    type: {
        type: DataTypes.ENUM(
            'leave_request_submitted',
            'leave_request_approved',
            'leave_request_rejected',
            'payslip_uploaded',
            'payslip_generated',
            'document_expiring_soon',
            'system_alert'
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
    related_entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    related_entity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
}, {
    tableName: 'notification',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['sal_id'],
        },
        {
            fields: ['is_read'],
        },
        {
            fields: ['sal_id', 'is_read'],
        },
    ],
});

Notification.associate = (models) => {
    Notification.belongsTo(models.Salarie, {
        foreignKey: 'sal_id',
        as: 'salarie',
    })
};

export default Notification;