import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as moduleController from '../controllers/moduleController.js';
import { validate } from '../middleware/validate.js';
import {moduleSchema , updateModuleSchema} from '../validations/module.js';
import { allowRoles } from '../middleware/role.js';


const router = Router();

// router.use(authenticate);

router.get('/', moduleController.getAllModules);
router.get('/:id', moduleController.getModuleById);

router.post('/' , validate(moduleSchema), moduleController.createModule);
router.put('/:id' , validate(updateModuleSchema), moduleController.updateModule);
router.delete('/:id' , moduleController.deleteModule);

export default router;