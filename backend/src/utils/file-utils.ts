import { promises as fs } from 'fs';
import path from 'path';
import { DOWNLOAD_DIR } from '../config/constants';
import { logger } from '../config/logger';

export async function ensureDownloadDir() {
  const downloadPath = path.join(process.cwd(), DOWNLOAD_DIR);
  try {
    await fs.access(downloadPath);
  } catch {
    await fs.mkdir(downloadPath, { recursive: true });
    logger.info({ path: downloadPath }, 'Created download directory');
  }
  return downloadPath;
}

export function generateDownloadId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getOutputPath(downloadId: string, extension: string): string {
  return path.join(process.cwd(), DOWNLOAD_DIR, `${downloadId}.${extension}`);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.info({ filePath }, 'Deleted file');
  } catch (error) {
    logger.error({ filePath, error }, 'Failed to delete file');
  }
}
