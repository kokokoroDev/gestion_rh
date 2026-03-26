import { Router } from 'express';
import authRoutes            from './authRoutes.js';
import moduleRouter          from './moduleRoutes.js';
import salarieRouter         from './salarieRoutes.js';
import congeRouter           from './congeRoutes.js';
import notificationRouter    from './notificationRoutes.js';
import documentRequestRouter from './documentRequestRoutes.js';
import noteServiceRouter     from './noteServiceRoutes.js';
import teletravailRouter     from './teletravailRoutes.js';

const router = Router();

router.use('/auth',        authRoutes);
router.use('/mod',         moduleRouter);
router.use('/sal',         salarieRouter);
router.use('/conge',       congeRouter);
router.use('/notif',       notificationRouter);
router.use('/docs',        documentRequestRouter);
router.use('/notes',       noteServiceRouter);
router.use('/teletravail', teletravailRouter);

export default router;