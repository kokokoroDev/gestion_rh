import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles }   from '../middleware/role.js';
import * as noteController from '../controllers/noteServiceController.js';

const router = Router();
router.use(authenticate);

// All authenticated users can list and download
router.get('/',           noteController.getNoteServices);
router.get('/:id',        noteController.getNoteServiceById);
router.get('/:id/download', noteController.downloadNoteService);

// RH only — upload and delete
router.post('/',   allowRoles('rh'), noteController.createNoteService);
router.delete('/:id', allowRoles('rh'), noteController.deleteNoteService);

export default router;