import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const DocumentResponses = sequelizeCon.define(
    'DocumentResponses',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true
        },
        req_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'DocumentRequest', key: 'id' },
        },
        filepath : {
            type : DataTypes.TEXT,
            allowNull : false
        }
    },
    {
        tableName: 'document_response',
        timestamps: true,
        underscored: true
    }
);

DocumentResponses.associate = (models) => {
    DocumentResponses.belongsTo(models.DocumentRequest, {
        foreignKey: 'req_id', 
        as: 'request'
    });
};

export default DocumentResponses;