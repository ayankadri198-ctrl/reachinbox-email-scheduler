import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service.js';
import { successResponse } from '../utils/api-response.js';
import { EmailStatus } from '@prisma/client';

export class EmailController {
  async schedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const email = await emailService.scheduleEmail(userId, req.body);
      successResponse(res, email, 'Email scheduled successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = req.query as any;
      const result = await emailService.getEmails(userId, query);
      successResponse(res, result.items, 'Emails retrieved successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = {
        ...(req.query as any),
        status: EmailStatus.SCHEDULED,
      };
      const result = await emailService.getEmails(userId, query);
      successResponse(res, result.items, 'Scheduled emails retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = {
        ...(req.query as any),
        status: EmailStatus.SENT,
        sortBy: (req.query as any).sortBy || 'sentAt',
      };
      const result = await emailService.getEmails(userId, query);
      successResponse(res, result.items, 'Sent emails retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getFailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = {
        ...(req.query as any),
        status: EmailStatus.FAILED,
      };
      const result = await emailService.getEmails(userId, query);
      successResponse(res, result.items, 'Failed emails retrieved', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const email = await emailService.getEmailById(userId, id);
      successResponse(res, email, 'Email details retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updated = await emailService.updateEmail(userId, id, req.body);
      successResponse(res, updated, 'Email rescheduled and updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const cancelled = await emailService.cancelEmail(userId, id);
      successResponse(res, cancelled, 'Email schedule cancelled successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const retried = await emailService.retryEmail(userId, id);
      successResponse(res, retried, 'Email queued for retry delivery', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const emailController = new EmailController();

