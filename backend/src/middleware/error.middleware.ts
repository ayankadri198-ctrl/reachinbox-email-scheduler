import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { Logger } from '../utils/logger.js';
import { errorResponse } from '../utils/api-response.js';

const logger = new Logger('ErrorHandler');

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Error on ${req.method} ${req.url}: ${err.message}`, err);

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      errorResponse(
        res,
        `A record with this ${target.join(', ') || 'field'} already exists.`,
        409
      );
      return;
    }
    if (err.code === 'P2025') {
      errorResponse(res, 'The requested record was not found.', 404);
      return;
    }
  }

  // Fallback for general errors
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error');

  errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};

