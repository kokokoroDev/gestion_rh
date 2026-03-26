import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Role = sequelizeCon.define('Role', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.ENUM('rh', 'manager', 'team_lead' , 'fonctionnaire'),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'role',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Role;