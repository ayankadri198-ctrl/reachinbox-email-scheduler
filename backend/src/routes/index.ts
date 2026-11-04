import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { emailRoutes } from './email.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/dashboard', dashboardRoutes);

export const apiRouter = router;

