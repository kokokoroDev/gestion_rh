import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles }   from '../middleware/role.js';
import { validate }     from '../middleware/validate.js';
import {
    createDocumentRequestSchema,
    updateDocumentRequestStatusSchema,
    listDocumentRequestsSchema,
} from '../validations/documentrequest.js';
import * as docController from '../controllers/documentRequestController.js';

const router = Router();

router.use(authenticate);

// ── Any authenticated user ────────────────────────────────────────────────────
router.get(
    '/',
    validate(listDocumentRequestsSchema, 'query'),
    docController.getDocumentRequests
);

router.post(
    '/',
    validate(createDocumentRequestSchema),
    docController.createDocumentRequest
);

router.get('/:id', docController.getDocumentRequestById);

// Download the file uploaded by RH (owner + RH)
router.get('/:id/file', docController.downloadDocumentFile);

// ── RH only ───────────────────────────────────────────────────────────────────

// Update status (traite / refuse)
router.patch(
    '/:id/status',
    allowRoles('rh'),
    validate(updateDocumentRequestStatusSchema),
    docController.updateDocumentRequestStatus
);

// Upload the response document file
// NOTE: multer is applied inside the controller via handleUpload() so we
//       do NOT attach any multer middleware here — the raw multipart body
//       is parsed inside uploadDocumentFile.
router.post(
    '/:id/file',
    allowRoles('rh'),
    docController.uploadDocumentFile
);

// ── Owner only ────────────────────────────────────────────────────────────────
router.delete('/:id', docController.cancelDocumentRequest);

export default router;