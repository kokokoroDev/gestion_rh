import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createCongeSchema,
  updateCongeStatusSchema,
  listCongesSchema,
  calendarSchema
} from '../validations/conge.js';
import * as congeController from '../controllers/congeController.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createCongeSchema),
  congeController.soumettreConge
);

router.get(
  '/',
  validate(listCongesSchema, 'query'),
  congeController.getConges
);

router.get('/calendar', validate(calendarSchema, 'query'), congeController.getCalendar);

router.get('/:id', congeController.getCongeById);

router.put(
  '/:id/status',
  allowRoles('manager', 'team_lead', 'rh'),
  validate(updateCongeStatusSchema),
  congeController.updateCongeStatus
);

router.delete(
  '/:id',
  allowRoles('fonctionnaire', 'manager', 'team_lead', 'rh'),
  congeController.cancelConge
);

export default router;