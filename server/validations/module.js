import Joi from "joi";

export const moduleSchema = Joi.object({
  libelle: Joi.string().trim().max(50).uppercase().required(),
  description: Joi.string().allow('').optional()
});

export const updateModuleSchema = Joi.object({
  libelle: Joi.string().trim().max(50).uppercase().optional(),
  description: Joi.string().allow('').optional()
}).min(1);
