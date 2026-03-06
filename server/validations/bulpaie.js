import Joi from 'joi';

const currentYear = new Date().getFullYear();

export const createBulpaieSchema = Joi.object({
    sal_id: Joi.string().uuid().required(),
    salaire_brut: Joi.number().precision(2).positive().required(),
    deduction: Joi.number().precision(2).min(0).default(0),
    prime: Joi.number().precision(2).min(0).optional(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(currentYear + 1).required(),
});

export const updateBulpaieSchema = Joi.object({
    salaire_brut: Joi.number().precision(2).positive().optional(),
    deduction: Joi.number().precision(2).min(0).optional(),
    // Allow null to explicitly clear a prime
    prime: Joi.number().precision(2).min(0).allow(null).optional(),
}).min(1);

export const listBulpaiesSchema = Joi.object({
    sal_id: Joi.string().uuid().optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2000).max(currentYear + 1).optional(),
    status: Joi.string().valid('drafted', 'validated').optional(),
    limit: Joi.number().integer().min(1).max(100).default(12),
    offset: Joi.number().integer().min(0).default(0),
});

export const batchValidateSchema = Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2000).max(currentYear + 1).required(),
});
