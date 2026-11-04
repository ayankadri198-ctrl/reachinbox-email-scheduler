import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.get('/stats', (req, res, next) => dashboardController.getStats(req, res, next));
router.get('/activity', (req, res, next) => dashboardController.getActivity(req, res, next));

export const dashboardRoutes = router;

