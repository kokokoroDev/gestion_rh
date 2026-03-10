import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as moduleController from '../controllers/moduleController.js';
import { validate } from '../middleware/validate.js';
import {moduleSchema , updateModuleSchema} from '../validations/module.js';
import { allowRoles } from '../middleware/role.js';


const router = Router();

router.use(authenticate);

router.get('/', moduleController.getAllModules);
router.get('/:id', moduleController.getModuleById);
router.get('/man/:id' , moduleController.checkManager);

router.post('/' , allowRoles('rh') , validate(moduleSchema), moduleController.createModule);
router.put('/:id' , allowRoles('rh') , validate(updateModuleSchema), moduleController.updateModule);
router.delete('/:id' , allowRoles('rh') , moduleController.deleteModule);


export default router;