import { execFile, spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../config/logger';
import { AppError } from '../utils/error-handler';
import { progressTracker, DownloadProgress } from '../utils/progress-tracker';
import { ensureDownloadDir, getOutputPath, generateDownloadId, deleteFile } from '../utils/file-utils';
import { QUALITY_FORMATS } from '../config/constants';

export interface DownloadOptions {
  url: string;
  quality: string;
  type: 'video' | 'audio';
}

export class DownloadService {
  private activeProcesses: Map<string, any> = new Map();

  async startDownload(options: DownloadOptions): Promise<string> {
    const downloadId = generateDownloadId();
    const downloadDir = await ensureDownloadDir();
    
    const extension = options.type === 'audio' ? 'mp3' : 'mp4';
    const outputPath = getOutputPath(downloadId, extension);
    
    progressTracker.createDownload(downloadId);
    
    try {
      await this.executeDownload(downloadId, options, outputPath);
      return downloadId;
    } catch (error) {
      progressTracker.failDownload(downloadId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async executeDownload(
    downloadId: string,
    options: DownloadOptions,
    outputPath: string
  ): Promise<void> {
    const ytDlpPath = this.getYtDlpPath();
    const args = this.buildYtDlpArgs(options, outputPath);

    logger.info({ downloadId, ytDlpPath, command: `${ytDlpPath} ${args.join(' ')}` }, 'Starting download');

    progressTracker.updateProgress(downloadId, { status: 'downloading' });

    return new Promise((resolve, reject) => {
      logger.info({ downloadId, ytDlpPath, args: args.join(' ') }, 'About to spawn yt-dlp process');
      
      // Add ffmpeg, Node.js, and Python to PATH for yt-dlp subprocess
      const ffmpegDir = ffmpegPath ? path.dirname(ffmpegPath) : '/usr/bin';
      const nodeDir = process.execPath ? path.dirname(process.execPath) : '/usr/bin';
      const pythonDir = '/usr/bin';
      
      const env = { 
        ...process.env, 
        PATH: `${ffmpegDir}${path.delimiter}${nodeDir}${path.delimiter}${pythonDir}${path.delimiter}${process.env.PATH}` 
      };
      
      const childProcess = spawn(ytDlpPath, args, { env });
      this.activeProcesses.set(downloadId, childProcess);

      let downloadedBytes = 0;
      let totalBytes = 0;
      let stderrOutput = '';

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderrOutput += output;
        logger.debug({ downloadId, output }, 'yt-dlp stderr');
        this.parseProgress(output, downloadId, (progress) => {
          downloadedBytes = progress.downloadedBytes || downloadedBytes;
          totalBytes = progress.totalBytes || totalBytes;
          
          progressTracker.updateProgress(downloadId, {
            progress: progress.percentage,
            downloadedBytes,
            totalBytes,
            speed: progress.speed,
            eta: progress.eta,
          });
        });
      });

      childProcess.on('close', async (code) => {
        this.activeProcesses.delete(downloadId);
        
        if (code === 0) {
          logger.info({ downloadId, outputPath }, 'Download completed');
          
          // Check if the expected file exists, if not, try to find the actual file
          const expectedFileExists = fsSync.existsSync(outputPath);
          
          if (!expectedFileExists) {
            // Try to find files with similar names (yt-dlp might use different extensions)
            const downloadDir = path.dirname(outputPath);
            const baseName = path.basename(outputPath, path.extname(outputPath));
            try {
              const files = await fs.readdir(downloadDir);
              
              // For audio, look for files that start with the base name
              const matchingFiles = files.filter((f: string) => f.startsWith(baseName));
              
              if (matchingFiles.length > 0) {
                // For audio, prefer files ending with the expected extension, then .mp3, .m4a, .opus, .webm
                let actualPath: string;
                if (options.type === 'audio') {
                  const expectedExt = path.extname(outputPath);
                  const audioExtensions = [expectedExt, '.mp3', '.m4a', '.opus', '.webm'];
                  let foundAudioFile: string | undefined;
                  
                  for (const ext of audioExtensions) {
                    foundAudioFile = matchingFiles.find((f: string) => f.endsWith(ext));
                    if (foundAudioFile) break;
                  }
                  
                  actualPath = foundAudioFile 
                    ? path.join(downloadDir, foundAudioFile)
                    : path.join(downloadDir, matchingFiles[0]);
                } else {
                  actualPath = path.join(downloadDir, matchingFiles[0]);
                }
                progressTracker.completeDownload(downloadId, actualPath);
              } else {
                progressTracker.completeDownload(downloadId, outputPath);
              }
            } catch (err) {
              progressTracker.completeDownload(downloadId, outputPath);
            }
          } else {
            logger.info({ downloadId, outputPath }, 'Expected file exists, using it');
            progressTracker.completeDownload(downloadId, outputPath);
          }
          resolve();
        } else {
          const error: any = new AppError(
            'DOWNLOAD_FAILED',
            `Download failed with exit code ${code}`,
            { exitCode: code, stderr: stderrOutput }
          );
          logger.error({ downloadId, exitCode: code, stderr: stderrOutput }, 'Download failed');
          
          // Include full stderr in error response for frontend debugging
          error.stderr = stderrOutput;
          reject(error);
        }
      });

      childProcess.on('error', (error) => {
        this.activeProcesses.delete(downloadId);
        logger.error({ downloadId, error: error.message }, 'Download process error');
        reject(new AppError('PROCESS_ERROR', error.message));
      });
    });
  }

  private buildYtDlpArgs(options: DownloadOptions, outputPath: string): string[] {
    const args = [
      '-f',
      this.getFormatString(options),
      '-o',
      outputPath,
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    if (options.type === 'audio') {
      args.push('-x', '--audio-format', 'mp3');
    }

    // Add FFmpeg location for audio extraction
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    // Add cookies if file exists
    const cookiePath = this.getCookiePath();
    if (cookiePath) {
      args.push('--cookies', cookiePath);
    }

    args.push(options.url);

    return args;
  }

  private getCookiePath(): string | null {
    const cookiePath = process.env.YOUTUBE_COOKIES_FILE;
    if (cookiePath && fsSync.existsSync(cookiePath)) {
      logger.info({ cookiePath }, 'Using YouTube cookies file');
      return cookiePath;
    }
    return null;
  }

  private getFormatString(options: DownloadOptions): string {
    if (options.type === 'audio') {
      return 'bestaudio/best';
    }
    return QUALITY_FORMATS[options.quality] || QUALITY_FORMATS.best;
  }

  private parseProgress(
    output: string,
    downloadId: string,
    callback: (progress: any) => void
  ): void {
    const downloadMatch = output.match(/(\d+\.?\d*)%/);
    const sizeMatch = output.match(/(\d+\.?\d*[A-Z]+) of (\d+\.?\d*[A-Z]+)/);
    const speedMatch = output.match(/at\s+(\d+\.?\d*[A-Z]+\/s)/);
    const etaMatch = output.match(/ETA\s+(\d+:\d+)/);

    if (downloadMatch) {
      const percentage = parseFloat(downloadMatch[1]);
      callback({
        percentage,
        downloadedBytes: sizeMatch ? this.parseSize(sizeMatch[1]) : undefined,
        totalBytes: sizeMatch ? this.parseSize(sizeMatch[2]) : undefined,
        speed: speedMatch ? speedMatch[1] : undefined,
        eta: etaMatch ? etaMatch[1] : undefined,
      });
    }
  }

  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };
    const match = sizeStr.match(/^(\d+\.?\d*)([A-Z]+)$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      return value * (units[unit] || 1);
    }
    return 0;
  }

  cancelDownload(downloadId: string): void {
    const childProcess = this.activeProcesses.get(downloadId);
    if (childProcess) {
      logger.info({ downloadId }, 'Cancelling download');
      childProcess.kill();
      this.activeProcesses.delete(downloadId);
      progressTracker.cancelDownload(downloadId);
    }
  }

  async getDownloadProgress(downloadId: string): Promise<DownloadProgress | undefined> {
    return progressTracker.getProgress(downloadId);
  }

  async serveFile(downloadId: string): Promise<string> {
    const progress = progressTracker.getProgress(downloadId);
    if (!progress || !progress.filePath) {
      throw new AppError('FILE_NOT_FOUND', 'Download not found or not completed');
    }

    const fileExists = await fs.access(progress.filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      throw new AppError('FILE_NOT_FOUND', 'File no longer exists');
    }

    return progress.filePath;
  }

  private getYtDlpPath(): string {
    const platform = process.platform;
    let binary = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    
    // Check if binary exists in project root (for production deployments)
    const projectRootPath = path.join(process.cwd(), binary);
    logger.info({ 
      platform, 
      binary, 
      projectRootPath, 
      exists: fsSync.existsSync(projectRootPath) 
    }, 'DownloadService: Resolving yt-dlp path');
    
    if (fsSync.existsSync(projectRootPath)) {
      logger.info({ resolvedPath: projectRootPath }, 'DownloadService: Using yt-dlp from project root');
      return projectRootPath;
    }
    
    // Fallback to default path
    logger.warn({ fallbackPath: binary }, 'DownloadService: Using fallback yt-dlp path');
    return binary;
  }
}

export const downloadService = new DownloadService();
