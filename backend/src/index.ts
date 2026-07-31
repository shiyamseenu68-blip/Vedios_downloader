import { startServer } from './app';
import { logger } from './config/logger';

startServer().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
