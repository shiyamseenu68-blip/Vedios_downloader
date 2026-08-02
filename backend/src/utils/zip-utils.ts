import archiver from 'archiver';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../config/logger';

export async function createZipArchive(
  files: string[],
  outputPath: string,
  playlistTitle: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = require('fs').createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      logger.info({ 
        bytes: archive.pointer(),
        path: outputPath 
      }, 'ZIP archive created');
      resolve();
    });

    output.on('error', (err: Error) => {
      logger.error({ error: err.message, path: outputPath }, 'ZIP output error');
      reject(err);
    });

    archive.on('error', (err: Error) => {
      logger.error({ error: err.message }, 'Archive error');
      reject(err);
    });

    archive.pipe(output);

    // Add files to archive with sanitized names
    files.forEach((filePath, index) => {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: `${index + 1}_${fileName}` });
    });

    archive.finalize();
  });
}

export async function cleanupDownloadedFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      logger.debug({ filePath }, 'Deleted downloaded file');
    } catch (error) {
      logger.warn({ filePath, error }, 'Failed to delete downloaded file');
    }
  }
}
