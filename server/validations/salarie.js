import Joi from 'joi';

export const createSalarieSchema = Joi.object({
  cin: Joi.string().length(8).required(),
  prenom: Joi.string().max(25).required(),
  nom: Joi.string().max(25).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  date_debut: Joi.date().optional(),
  date_fin: Joi.date().min(Joi.ref('date_debut')).optional(),
  mon_cong: Joi.number().precision(1).min(0).optional(),
  role: Joi.string().valid('rh', 'manager', 'fonctionnaire').default('fonctionnaire'),
  module_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
  changeManager: Joi.boolean().optional().default(false),
  assignments: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('rh', 'manager', 'fonctionnaire').required(),
      module_id: Joi.string().uuid().allow(null).optional(),
      changeManager: Joi.boolean().when('role', {
        is: 'manager',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
    })
  ).optional()
});

export const updateSalarieSchema = Joi.object({
  cin: Joi.string().length(8).optional(),
  prenom: Joi.string().max(25).optional(),
  nom: Joi.string().max(25).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  date_debut: Joi.date().optional(),
  date_fin: Joi.date().min(Joi.ref('date_debut')).optional(),
  mon_cong: Joi.number().precision(1).min(0).optional(),
  role: Joi.string().valid('rh', 'manager', 'fonctionnaire').optional(),
  module_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  changeManager: Joi.boolean().optional().default(false),
  assignments: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('rh', 'manager', 'fonctionnaire').required(),
      module_id: Joi.string().uuid().allow(null).optional(),
      changeManager: Joi.boolean().when('role', {
        is: 'manager',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
    })
  ).optional()
}).min(1);



export const listSalariesSchema = Joi.object({
  module_id: Joi.string().uuid().optional(),
  role: Joi.string().valid('rh', 'manager', 'fonctionnaire').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  search: Joi.string().max(50).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
});