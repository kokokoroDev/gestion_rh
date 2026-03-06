import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
    createBulpaieSchema,
    updateBulpaieSchema,
    listBulpaiesSchema,
    batchValidateSchema,
    masseSalarialeSchema,
} from '../validations/bulpaie.js';
import * as bulpaieController from '../controllers/bulpaieController.js';

const router = Router();
router.use(authenticate);

router.post(
    '/batch-validate',
    allowRoles('rh'),
    validate(batchValidateSchema),
    bulpaieController.validateBatch
);

router.post(
    '/',
    allowRoles('rh'),
    validate(createBulpaieSchema),
    bulpaieController.createBulpaie
);

// GET  /api/paie          → list payslips
//   • fonctionnaire/manager : own payslips only
//   • rh                    : all payslips, filterable by sal_id / month / year / status
router.get(
    '/',
    validate(listBulpaiesSchema, 'query'),
    bulpaieController.getBulpaies
);

// GET    /api/paie/:id            → get payslip detail (access enforced in service)
router.get('/:id', bulpaieController.getBulpaieById);

// PUT    /api/paie/:id            → edit a drafted payslip (RH only; blocked if validated)
router.put(
    '/:id',
    allowRoles('rh'),
    validate(updateBulpaieSchema),
    bulpaieController.updateBulpaie
);

// PATCH  /api/paie/:id/validate   → validate one payslip → generates PDF → locks record
router.patch(
    '/:id/validate',
    allowRoles('rh'),
    bulpaieController.validateBulpaie
);

// GET    /api/paie/:id/download   → stream PDF to client (all roles, own records only)
router.get('/:id/download', bulpaieController.downloadBulpaie);

// DELETE /api/paie/:id            → delete a drafted payslip (RH only; blocked if validated)
router.delete(
    '/:id',
    allowRoles('rh'),
    bulpaieController.deleteBulpaie
);

export default router;