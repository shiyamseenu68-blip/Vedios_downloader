import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorHandlerMiddleware } from './middleware/error.middleware';
import routes from './routes';
import { logger } from './config/logger';
import { YtDlpService } from './services/yt-dlp.service';

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());

  app.use(routes);

  app.use(errorHandlerMiddleware);

  return app;
}

export async function startServer() {
  const app = createApp();
  
  const ytDlpService = new YtDlpService();
  try {
    const version = await ytDlpService.getVersion();
    logger.info({ version }, 'yt-dlp initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize yt-dlp');
    throw error;
  }

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
  });
}
