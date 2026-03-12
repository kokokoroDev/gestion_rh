import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notifController from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/',            notifController.getNotifications);

router.get('/unread-count', notifController.getUnreadCount);

router.patch('/read-all',  notifController.markAllAsRead);

router.patch('/:id/read',  notifController.markAsRead);

router.delete('/:id',      notifController.deleteNotification);

export default router;