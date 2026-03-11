import { Router } from 'express';
import {
    generateBulpaies,
    createBulpaie,
    updateBulpaie,
    validateBulpaie,
    validateBulpaieBatch,
    deleteBulpaie,
    getBulpaies,
    getBulpaieById,
    downloadBulpaie,
} from '../controllers/bulpaieController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/generate', generateBulpaies);

router.post('/validate-batch', validateBulpaieBatch);

router.get('/',          getBulpaies);
router.post('/',         createBulpaie);
router.get('/:id',       getBulpaieById);
router.put('/:id',       updateBulpaie);
router.delete('/:id',    deleteBulpaie);

router.patch('/:id/validate',  validateBulpaie);
router.get('/:id/download',    downloadBulpaie);

export default router;