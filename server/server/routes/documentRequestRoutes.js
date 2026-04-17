import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { allowRoles } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
    createDocumentRequestSchema,
    updateDocumentRequestStatusSchema,
    listDocumentRequestsSchema,
} from '../validations/documentrequest.js';
import * as docController from '../controllers/documentRequestController.js';

const router = Router();
router.use(authenticate);

// ── Any authenticated user ────────────────────────────────────────────────────
router.get('/', validate(listDocumentRequestsSchema, 'query'), docController.getDocumentRequests);
router.post('/', validate(createDocumentRequestSchema), docController.createDocumentRequest);
router.get('/:id', docController.getDocumentRequestById);

// Download a specific response file (owner + RH)
router.get('/:id/file/:responseId', docController.downloadDocumentFile);

// ── RH only ───────────────────────────────────────────────────────────────────

// Change status (en_attente → traite / refuse) — fires notification
router.patch('/:id/status', allowRoles('rh'), validate(updateDocumentRequestStatusSchema), docController.updateDocumentRequestStatus);

// Update reply text silently (post-treatment)
router.patch('/:id/reponse', allowRoles('rh'), docController.updateReponse);

// Upload one response file (call multiple times for multiple files)
router.post('/:id/file', allowRoles('rh'), docController.uploadDocumentFile);

// Delete a specific response file
router.delete('/:id/file/:responseId', allowRoles('rh'), docController.deleteDocumentFile);

// ── Owner only ────────────────────────────────────────────────────────────────
router.delete('/:id', docController.cancelDocumentRequest);

export default router;