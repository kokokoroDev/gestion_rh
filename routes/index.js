import { Router } from 'express';
import authRoutes from './authRoutes.js';
import moduleRouter from './moduleRoutes.js';
import salarieRouter from './salarieRoutes.js';
import congeRouter from './congeRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/mod', moduleRouter);
router.use('/sal', salarieRouter);
router.use('/conge', congeRouter);

export default router;