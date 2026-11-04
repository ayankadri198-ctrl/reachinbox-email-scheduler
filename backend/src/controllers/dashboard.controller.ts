import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service.js';
import { successResponse } from '../utils/api-response.js';

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await emailService.getDashboardStats(userId);
      successResponse(res, stats, 'Dashboard statistics retrieved', 200);
    } catch (error) {
      next(error);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const activity = await emailService.getDashboardActivity(userId, Math.min(days, 30));
      successResponse(res, activity, 'Dashboard activity chart data retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

