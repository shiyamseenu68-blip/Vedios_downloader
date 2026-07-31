import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, context?: string) {
  if (error instanceof AppError) {
    logger.error({
      code: error.code,
      message: error.message,
      details: error.details,
      context,
    }, 'Application error');
    return error;
  }

  if (error instanceof Error) {
    logger.error({
      message: error.message,
      stack: error.stack,
      context,
    }, 'Unexpected error');
    return new AppError('INTERNAL_ERROR', error.message);
  }

  logger.error({ error, context }, 'Unknown error');
  return new AppError('UNKNOWN_ERROR', 'An unknown error occurred');
}
