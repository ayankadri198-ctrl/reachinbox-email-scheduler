import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { successResponse } from '../utils/api-response.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      successResponse(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      successResponse(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await authService.getMe(userId);
      successResponse(res, user, 'User profile retrieved', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

