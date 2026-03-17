import sequelizeCon from "../config/sequelize.js";
import { DataTypes } from "sequelize";

const Conge = sequelizeCon.define('Conge', {
    id: {
        primaryKey:   true,
        type:         DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull:    false
    },
    sal_id: {
        type:       DataTypes.UUID,
        allowNull:  false,
        references: { model: 'Salarie', key: 'id' },
    },
    type_conge: {
        type:         DataTypes.ENUM('maladie', 'vacance', 'maternite', 'paternite', 'sans_solde', 'exceptionnel', 'formation'),
        defaultValue: 'vacance'
    },
    date_debut: {
        type:         DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
    },
    date_fin: {
        type:      DataTypes.DATEONLY,
        allowNull: true
    },
    jours: {
        type:         DataTypes.DECIMAL(5, 1),
        allowNull:    false,
        defaultValue: 0,
        comment:      'Computed total working days (0.5 for half-days)',
    },
    status: {
        type:         DataTypes.ENUM('soumis', 'reached', 'accepte', 'refuse'),
        defaultValue: 'soumis'
    },
    commentaire: {
        type:      DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type:         DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull:    false,
    },
},
{
    tableName:  'conge',
    timestamps: false,
});

Conge.associate = (models) => {
    Conge.belongsTo(models.Salarie, {
        foreignKey: 'sal_id',
        as:         'salarie'
    });
    Conge.hasMany(models.CongeDay, {
        foreignKey: 'conge_id',
        as:         'days',
        onDelete:   'CASCADE',
    });
};

export default Conge;