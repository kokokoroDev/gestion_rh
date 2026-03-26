import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import * as teletravailController from '../controllers/teletravailController.js';

const router = Router();
router.use(authenticate);

router.get('/', teletravailController.getSchedule);

router.post('/', allowRoles('rh'), teletravailController.createSchedule);

router.put('/entries/:scheduleId/:salarieId/:dayOfWeek', allowRoles('rh'), teletravailController.updateEntry);

router.delete('/:scheduleId', allowRoles('rh'), teletravailController.deleteSchedule);

export default router;