import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorHandlerMiddleware } from './middleware/error.middleware';
import routes from './routes';
import { logger } from './config/logger';
import { YtDlpService } from './services/yt-dlp.service';
import { cleanupService } from './services/cleanup.service';

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
  
  // Log startup environment details
  logger.info({ 
    cwd: process.cwd(),
    platform: process.platform,
    nodeEnv: config.nodeEnv,
    port: config.port
  }, 'Server startup environment');

  // Check if yt-dlp binary exists in current directory
  const fs = require('fs');
  const path = require('path');
  const ytDlpBinary = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const ytDlpPath = path.join(process.cwd(), ytDlpBinary);
  
  logger.info({ 
    ytDlpBinary,
    ytDlpPath,
    exists: fs.existsSync(ytDlpPath)
  }, 'Checking for yt-dlp binary at startup');

  if (fs.existsSync(ytDlpPath)) {
    logger.info({ ytDlpPath }, '✓ yt-dlp binary found at startup');
  } else {
    logger.error({ ytDlpPath }, '✗ yt-dlp binary NOT found at startup - this will cause failures');
  }
  
  const ytDlpService = new YtDlpService();
  try {
    const version = await ytDlpService.getVersion();
    logger.info({ version }, 'yt-dlp initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize yt-dlp');
    throw error;
  }

  // Start cleanup service
  cleanupService.start();
  logger.info('Cleanup service started');

  app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
  });
}
