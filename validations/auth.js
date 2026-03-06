import Joi from 'joi';

export const registerSchema = Joi.object({
  cin: Joi.string().length(8).required(),
  prenom: Joi.string().max(25).required(),
  nom: Joi.string().max(25).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('rh', 'manager', 'fonctionnaire').optional(),
  module_id: Joi.string().uuid().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

export const refreshTokenSchema = Joi.object({
  token: Joi.string().required(),
});