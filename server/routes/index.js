import { Router } from 'express';
import authRoutes            from './authRoutes.js';
import moduleRouter          from './moduleRoutes.js';
import salarieRouter         from './salarieRoutes.js';
import congeRouter           from './congeRoutes.js';
import notificationRouter    from './notificationRoutes.js';
import documentRequestRouter from './documentRequestRoutes.js';
import noteServiceRouter     from './noteServiceRoutes.js';
import teletravailRouter     from './teletravailRoutes.js';
import clientRouter          from './clientRoutes.js';
import ordreMissionRouter    from './ordreMissionRoutes.js';
import noteFraisRouter       from './noteFraisRoutes.js';

const router = Router();

router.use('/auth',        authRoutes);
router.use('/mod',         moduleRouter);
router.use('/sal',         salarieRouter);
router.use('/conge',       congeRouter);
router.use('/notif',       notificationRouter);
router.use('/docs',        documentRequestRouter);
router.use('/notes',       noteServiceRouter);
router.use('/teletravail', teletravailRouter);
router.use('/clients',     clientRouter);
router.use('/ordres-mission', ordreMissionRouter);
router.use('/notes-frais', noteFraisRouter);

export default router;