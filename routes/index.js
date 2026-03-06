import { Router } from 'express';
import authRoutes from './authRoutes.js'
import moduleRouter from './moduleRoutes.js';
import salarieRouter from './salarieRoutes.js';

const router = Router();


router.use('/auth', authRoutes);
router.use('/mod', moduleRouter)
router.use('/sal' , salarieRouter)


export default router