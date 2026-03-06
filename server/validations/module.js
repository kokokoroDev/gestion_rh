import Joi from "joi";

export const moduleSchema = Joi.object({
  libelle: Joi.string().length(2).uppercase().required(),
  description: Joi.string().allow('').optional()
});

export const updateModuleSchema = Joi.object({
  libelle: Joi.string().length(2).uppercase().optional(),
  description: Joi.string().allow('').optional()
}).min(1);