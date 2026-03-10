import Joi from 'joi';

export const createCongeSchema = Joi.object({
    type_conge: Joi.string()
        .valid('maladie', 'vacance', 'maternite', 'paternite', 'sans_solde', 'exceptionnel', 'formation')
        .default('vacance'),
    date_debut: Joi.date().min('now').required(),
    date_fin: Joi.date().min(Joi.ref('date_debut')).required(),
    commentaire: Joi.string().max(500).optional(),
});

export const updateCongeStatusSchema = Joi.object({
    status: Joi.string()
        .valid('reached', 'accepte', 'refuse')
        .required(),
})

export const listCongesSchema = Joi.object({
    status: Joi.string()
        .valid('soumis', 'reached', 'accepte', 'refuse')
        .optional(),
    type_conge: Joi.string()
        .valid('maladie', 'vacance', 'maternite', 'paternite', 'sans_solde', 'exceptionnel', 'formation')
        .optional(),
    sal_id: Joi.string().uuid().optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().min(Joi.ref('date_from')).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
});

export const calendarSchema = Joi.object({
    date_from: Joi.date().required(),
    date_to: Joi.date().min(Joi.ref('date_from')).required(),
    module_id: Joi.string().uuid().optional(),
});