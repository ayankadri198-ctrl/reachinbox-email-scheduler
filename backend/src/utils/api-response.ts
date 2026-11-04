import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const successResponse = <T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(payload);
};

export const errorResponse = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  errors?: any
): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(payload);
};

