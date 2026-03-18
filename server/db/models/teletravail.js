import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const TeletravailData = sequelizeCon.define(
    'TeletravailData',
    {
        id: {
            type:         DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull:    false,
            primaryKey:   true,
        },
        file_name: {
            type:      DataTypes.STRING(255),
            allowNull: false,
        },
        file_size: {
            type:      DataTypes.INTEGER,
            allowNull: true,
        },
        columns: {
            type:         DataTypes.TEXT('long'),
            allowNull:    false,
            get() {
                try { return JSON.parse(this.getDataValue('columns') || '[]') }
                catch { return [] }
            },
            set(val) {
                this.setDataValue('columns', JSON.stringify(val))
            },
        },
        rows: {
            type:         DataTypes.TEXT('long'),
            allowNull:    false,
            get() {
                try { return JSON.parse(this.getDataValue('rows') || '[]') }
                catch { return [] }
            },
            set(val) {
                this.setDataValue('rows', JSON.stringify(val))
            },
        },
        row_count: {
            type:         DataTypes.INTEGER,
            defaultValue: 0,
        },
        uploaded_by: {
            type:       DataTypes.UUID,
            allowNull:  false,
            references: { model: 'Salarie', key: 'id' },
        },
        sheet_name: {
            type:      DataTypes.STRING(100),
            allowNull: true,
        },
    },
    {
        tableName:  'teletravail',
        timestamps: true,
        createdAt:  'created_at',
        updatedAt:  'updated_at',
    }
);

TeletravailData.associate = (models) => {
    TeletravailData.belongsTo(models.Salarie, {
        foreignKey: 'uploaded_by',
        as:         'uploader',
    });
};

export default TeletravailData;