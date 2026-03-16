import Joi from 'joi';

export const createDocumentRequestSchema = Joi.object({
    demande: Joi.string()
        .valid('att_travail', 'att_salaire', 'bulletin_paie')
        .required(),
    commentaire: Joi.string().max(1000).optional().allow('', null),
});

export const updateDocumentRequestStatusSchema = Joi.object({
    status: Joi.string()
        .valid('traite', 'refuse')
        .required(),
    reponse: Joi.string().max(1000).optional().allow('', null),
});

export const listDocumentRequestsSchema = Joi.object({
    status:  Joi.string().valid('en_attente', 'traite', 'refuse').optional(),
    demande: Joi.string().valid('att_travail', 'att_salaire', 'bulletin_paie').optional(),
    sal_id:  Joi.string().uuid().optional(),
    limit:   Joi.number().integer().min(1).max(100).default(10),
    offset:  Joi.number().integer().min(0).default(0),
});