import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles }   from '../middleware/role.js';
import { validate }     from '../middleware/validate.js';
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
    allowRoles('rh', 'manager', 'team_lead'),
    validate(listSalariesSchema, 'query'),
    salarieController.getAllSalaries
);

router.get('/team', allowRoles('manager' , 'team_lead'), salarieController.getManagerTeam);

router.get('/:id', allowRoles('rh', 'manager' , 'team_lead'), salarieController.getSalarieById);

router.post(
    '/',
    allowRoles('rh', 'manager'),
    validate(createSalarieSchema),
    salarieController.createSalarie
);

router.put(
    '/:id',
    allowRoles('rh'),
    validate(updateSalarieSchema),
    salarieController.updateSalarie
);

router.delete(
    '/:id/roles/:roleModuleId',
    allowRoles('rh'),
    salarieController.deleteRoleModule
);

router.delete('/:id', allowRoles('rh'), salarieController.deleteSalarie);

export default router;