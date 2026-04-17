import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const DocumentRequest = sequelizeCon.define(
    'DocumentRequest',
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
            references: { model: 'Salarie', key: 'id' },
        },
        demande: {
            type: DataTypes.ENUM('att_travail', 'att_salaire', 'bulletin_paie'),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('en_attente', 'traite', 'refuse'),
            defaultValue: 'en_attente',
            allowNull: false
        },
        commentaire: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        reponse: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName: 'document_request',
        timestamps: true,
        underscored: true
    }
);

DocumentRequest.associate = (models) => {
    DocumentRequest.belongsTo(models.Salarie, {
        foreignKey: 'sal_id',
        as: 'salarie'
    });
    DocumentRequest.hasMany(models.DocumentResponses, {
        foreignKey: 'req_id',
        as: 'responses',
        onDelete: 'CASCADE'
    });
};

export default DocumentRequest;