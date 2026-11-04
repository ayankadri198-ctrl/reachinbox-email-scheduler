import { Router } from 'express';
import { emailController } from '../controllers/email.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  scheduleEmailSchema,
  updateEmailSchema,
  emailQuerySchema,
} from '../validators/email.validator.js';

const router = Router();

// Protect all email endpoints with JWT authentication
router.use(authenticateJwt);

// Specific routes first to prevent collision with /:id
router.get('/scheduled', validateQuery(emailQuerySchema), (req, res, next) =>
  emailController.getScheduled(req, res, next)
);

router.get('/sent', validateQuery(emailQuerySchema), (req, res, next) =>
  emailController.getSent(req, res, next)
);

router.get('/failed', validateQuery(emailQuerySchema), (req, res, next) =>
  emailController.getFailed(req, res, next)
);

// General CRUD and actions
router.post('/schedule', validateBody(scheduleEmailSchema), (req, res, next) =>
  emailController.schedule(req, res, next)
);

router.get('/', validateQuery(emailQuerySchema), (req, res, next) =>
  emailController.getEmails(req, res, next)
);

router.get('/:id', (req, res, next) =>
  emailController.getEmailById(req, res, next)
);

router.put('/:id', validateBody(updateEmailSchema), (req, res, next) =>
  emailController.update(req, res, next)
);

router.delete('/:id/cancel', (req, res, next) =>
  emailController.cancel(req, res, next)
);

router.post('/:id/retry', (req, res, next) =>
  emailController.retry(req, res, next)
);

export const emailRoutes = router;

