import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { DOWNLOAD_DIR, FILE_EXPIRY_MS, CLEANUP_INTERVAL_MS } from '../config/constants';
import { progressTracker } from '../utils/progress-tracker';

export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  start(): void {
    if (this.cleanupInterval) {
      logger.warn('Cleanup service already running');
      return;
    }

    logger.info('Starting cleanup service');
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, CLEANUP_INTERVAL_MS);

    // Run initial cleanup
    this.performCleanup();
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cleanup service stopped');
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      const downloadDir = path.join(process.cwd(), DOWNLOAD_DIR);
      const now = Date.now();

      try {
        await fs.access(downloadDir);
      } catch {
        logger.debug('Download directory does not exist, skipping cleanup');
        return;
      }

      const files = await fs.readdir(downloadDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(downloadDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > FILE_EXPIRY_MS) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
            logger.debug({ filePath, age: fileAge }, 'Deleted expired file');
          } catch (error) {
            logger.error({ filePath, error }, 'Failed to delete file');
          }
        }
      }

      if (deletedCount > 0) {
        logger.info({ deletedCount }, 'Cleanup completed');
      }

      // Clean up completed downloads from progress tracker
      this.cleanupProgressTracker();
    } catch (error) {
      logger.error({ error }, 'Cleanup failed');
    }
  }

  private cleanupProgressTracker(): void {
    const allProgress = progressTracker.getAllProgress();
    const now = Date.now();

    for (const progress of allProgress) {
      const age = now - (progress.endTime || progress.startTime);
      
      // Remove completed/failed/cancelled downloads older than expiry time
      if (
        (progress.status === 'completed' || 
         progress.status === 'failed' || 
         progress.status === 'cancelled') &&
        age > FILE_EXPIRY_MS
      ) {
        progressTracker.removeDownload(progress.downloadId);
        logger.debug({ downloadId: progress.downloadId }, 'Removed expired download from tracker');
      }
    }
  }

  async cleanupDownload(downloadId: string): Promise<void> {
    const progress = progressTracker.getProgress(downloadId);
    
    if (progress && progress.filePath) {
      try {
        await fs.unlink(progress.filePath);
        logger.info({ downloadId, filePath: progress.filePath }, 'Deleted download file');
      } catch (error) {
        logger.error({ downloadId, filePath: progress.filePath, error }, 'Failed to delete download file');
      }
    }

    progressTracker.removeDownload(downloadId);
  }
}

export const cleanupService = new CleanupService();
