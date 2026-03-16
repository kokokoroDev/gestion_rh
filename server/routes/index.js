import { Router } from 'express';
import authRoutes from './authRoutes.js';
import moduleRouter from './moduleRoutes.js';
import salarieRouter from './salarieRoutes.js';
import congeRouter from './congeRoutes.js';
import bulpaieRouter from './bulpaieRoutes.js';
import notificationRouter from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/mod', moduleRouter);
router.use('/sal', salarieRouter);
router.use('/conge', congeRouter);
router.use('/paie', bulpaieRouter);
router.use('/notif', notificationRouter);

export default router;