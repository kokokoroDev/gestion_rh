import { Router }     from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles }   from '../middleware/role.js';
import * as teletravailController from '../controllers/teletravailController.js';

const router = Router();
router.use(authenticate);

// Everyone sees the table
router.get('/', teletravailController.getTeletravail);

// RH only — upload replaces current data
router.post('/',   allowRoles('rh'), teletravailController.uploadTeletravail);
router.delete('/', allowRoles('rh'), teletravailController.deleteTeletravail);

export default router;