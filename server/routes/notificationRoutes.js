import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);

router.put('/', notificationController.readAll);

router.put('/:id', notificationController.markRead);

router.delete('/:id', notificationController.deleteNotification);

export default router;
