import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createSalarieSchema,
  updateSalarieSchema,
  listSalariesSchema,
} from '../validations/salarie.js';
import * as salarieController from '../controllers/salarieController.js';

const router = Router();


router.use(authenticate);


router.get(
  '/',
  allowRoles('rh', 'manager'),
  validate(listSalariesSchema, 'query'),
  salarieController.getAllSalaries
);

router.get('/team', allowRoles('manager'), salarieController.getAllSalaries);


router.get('/:id', allowRoles('rh', 'manager'), salarieController.getSalarieById);

router.post(
  '/',
  allowRoles('rh','manager'),
  validate(createSalarieSchema),
  salarieController.createSalarie
);

router.put(
  '/:id',
  allowRoles('rh'),
  validate(updateSalarieSchema),
  salarieController.updateSalarie
);

router.delete('/:id', allowRoles('rh'), salarieController.deleteSalarie);

export default router;