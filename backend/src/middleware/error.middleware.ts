import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error-handler';
import { logger } from '../config/logger';

export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof AppError) {
    logger.error({
      code: error.code,
      message: error.message,
      details: error.details,
      path: req.path,
      method: req.method,
    }, 'Application error');

    return res.status(500).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  }, 'Unexpected error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    },
  });
}
