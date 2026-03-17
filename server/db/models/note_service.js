import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const NoteService = sequelizeCon.define(
    'NoteService',
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true,
        },
        titre: {
            type:      DataTypes.STRING(150),
            allowNull: false,
        },
        description: {
            type:      DataTypes.TEXT,
            allowNull: true,
        },
        file_path: {
            type:      DataTypes.TEXT,
            allowNull: false,
        },
        file_name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        file_size: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        mime_type: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
        uploaded_by: {
            type:       DataTypes.UUID,
            allowNull:  false,
            references: { model: 'Salarie', key: 'id' },
        },
    },
    {
        tableName:  'note_service',
        timestamps: true,
        createdAt:  'created_at',
        updatedAt:  'updated_at',
    }
);

NoteService.associate = (models) => {
    NoteService.belongsTo(models.Salarie, {
        foreignKey: 'uploaded_by',
        as:         'uploader',
    });
};

export default NoteService;