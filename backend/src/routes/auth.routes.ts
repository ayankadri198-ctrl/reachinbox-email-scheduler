import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.get('/me', authenticateJwt, (req, res, next) =>
  authController.getMe(req, res, next)
);

export const authRoutes = router;

