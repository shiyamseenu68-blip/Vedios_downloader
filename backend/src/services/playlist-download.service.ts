import { downloadService } from './download.service';
import { YtDlpService } from './yt-dlp.service';
import { progressTracker, DownloadProgress } from '../utils/progress-tracker';
import { createZipArchive, cleanupDownloadedFiles } from '../utils/zip-utils';
import { ensureDownloadDir, generateDownloadId, getOutputPath } from '../utils/file-utils';
import { sseManager, SSEEvent } from '../utils/sse';
import { logger } from '../config/logger';
import { AppError } from '../utils/error-handler';
import { promises as fs } from 'fs';
import path from 'path';

export interface PlaylistDownloadOptions {
  url: string;
  quality: string;
  type: 'video' | 'audio';
  videoIds?: string[];
}

export interface PlaylistProgress {
  downloadId: string;
  status: 'pending' | 'downloading' | 'zipping' | 'completed' | 'failed' | 'cancelled';
  totalVideos: number;
  completedVideos: number;
  currentVideoIndex: number;
  currentVideoId?: string;
  currentVideoTitle?: string;
  overallProgress: number;
  speed?: string;
  eta?: string;
  zipProgress?: number;
  error?: string;
  zipPath?: string;
  startTime?: number;
}

class PlaylistDownloadService {
  private activeDownloads: Map<string, any> = new Map();

  generateDownloadId(): string {
    return require('../utils/file-utils').generateDownloadId();
  }

  async startPlaylistDownload(options: PlaylistDownloadOptions, providedDownloadId?: string): Promise<string> {
    const downloadId = providedDownloadId || this.generateDownloadId();
    const ytDlpService = new YtDlpService();
    const startTime = Date.now();

    logger.info({ downloadId, url: options.url }, 'Starting playlist download');

    try {
      // Analyze playlist to get video list
      const playlist = await ytDlpService.analyzePlaylist(options.url);
      
      // Filter videos based on selection
      const videosToDownload = options.videoIds && options.videoIds.length > 0
        ? playlist.videos.filter(v => options.videoIds!.includes(v.id))
        : playlist.videos;

      if (videosToDownload.length === 0) {
        throw new AppError('NO_VIDEOS', 'No videos to download');
      }

      logger.info({ 
        downloadId, 
        totalVideos: videosToDownload.length,
        selectedVideos: options.videoIds?.length || 'all'
      }, 'Videos to download determined');

      // Initialize progress tracker
      this.initializePlaylistProgress(downloadId, videosToDownload.length, startTime);

      // Download videos sequentially
      const downloadedFiles: string[] = [];
      const extension = options.type === 'audio' ? 'mp3' : 'mp4';

      for (let i = 0; i < videosToDownload.length; i++) {
        const video = videosToDownload[i];
        const videoDownloadId = `${downloadId}_video_${i}`;

        this.updatePlaylistProgress(downloadId, {
          currentVideoIndex: i,
          currentVideoId: video.id,
          currentVideoTitle: video.title,
          overallProgress: (i / videosToDownload.length) * 100,
        });

        try {
          const videoDownloadOptions = {
            url: video.webpage_url,
            quality: options.quality,
            type: options.type,
          };

          const actualVideoDownloadId = await downloadService.startDownload(videoDownloadOptions);
          
          // Get the downloaded file path using the actual downloadId returned by download service
          const videoProgress = await downloadService.getDownloadProgress(actualVideoDownloadId);
          
          if (videoProgress?.filePath) {
            // Check if file actually exists
            const fileExists = await fs.access(videoProgress.filePath).then(() => true).catch(() => false);
            
            if (fileExists) {
              downloadedFiles.push(videoProgress.filePath);
            } else {
              logger.error({ downloadId, filePath: videoProgress.filePath }, 'File path returned but file does not exist');
            }
          } else {
            logger.warn({ downloadId, actualVideoDownloadId }, 'No file path found in download progress');
          }

          // Calculate ETA and speed
          const elapsedMs = Date.now() - startTime;
          const avgTimePerVideo = elapsedMs / (i + 1);
          const remainingVideos = videosToDownload.length - (i + 1);
          const etaMs = avgTimePerVideo * remainingVideos;
          const eta = this.formatTime(etaMs);

          this.updatePlaylistProgress(downloadId, {
            completedVideos: i + 1,
            overallProgress: ((i + 1) / videosToDownload.length) * 100,
            eta,
            speed: `${((i + 1) / (elapsedMs / 1000)).toFixed(2)} videos/s`,
          });

          logger.info({ 
            downloadId, 
            videoId: video.id,
            completed: i + 1,
            total: videosToDownload.length,
            eta
          }, 'Video download completed');
        } catch (error) {
          logger.error({ 
            downloadId, 
            videoId: video.id, 
            error 
          }, 'Video download failed');
          
          // Continue with next video instead of failing entire playlist
          this.updatePlaylistProgress(downloadId, {
            completedVideos: i + 1,
            overallProgress: ((i + 1) / videosToDownload.length) * 100,
          });
        }
      }

      // Create ZIP archive with progress tracking
      this.updatePlaylistProgress(downloadId, {
        status: 'zipping',
        overallProgress: 95,
        zipProgress: 0,
      });

      const downloadDir = await ensureDownloadDir();
      const zipPath = path.join(downloadDir, `${downloadId}_playlist.zip`);

      logger.info({ downloadId, fileCount: downloadedFiles.length }, 'Creating ZIP archive');
      
      if (downloadedFiles.length === 0) {
        logger.warn({ downloadId }, 'No files to add to ZIP archive');
      }

      await this.createZipWithProgress(downloadedFiles, zipPath, playlist.title, downloadId);

      // Cleanup individual files
      await cleanupDownloadedFiles(downloadedFiles);

      this.updatePlaylistProgress(downloadId, {
        status: 'completed',
        overallProgress: 100,
        zipProgress: 100,
        zipPath,
      });

      // Close SSE connections
      sseManager.closeAll(downloadId);

      logger.info({ downloadId, zipPath }, 'Playlist download completed');

      return downloadId;
    } catch (error) {
      logger.error({ downloadId, error }, 'Playlist download failed');
      
      // Automatic cleanup for failed downloads
      await this.cleanupFailedDownload(downloadId);
      
      this.updatePlaylistProgress(downloadId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Close SSE connections
      sseManager.closeAll(downloadId);
      
      throw error;
    }
  }

  private async createZipWithProgress(
    files: string[],
    outputPath: string,
    playlistTitle: string,
    downloadId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const archiver = require('archiver');
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info({ bytes: archive.pointer(), path: outputPath }, 'ZIP archive created');
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

      archive.on('progress', (progress: any) => {
        const zipProgress = progress.entries.total > 0 
          ? (progress.entries.processed / progress.entries.total) * 100 
          : 0;
        
        this.updatePlaylistProgress(downloadId, {
          zipProgress: Math.round(zipProgress),
        });
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

  private async cleanupFailedDownload(downloadId: string): Promise<void> {
    try {
      const progress = await this.getPlaylistProgress(downloadId);
      if (progress?.zipPath) {
        await fs.unlink(progress.zipPath).catch(() => {});
        logger.info({ downloadId, zipPath: progress.zipPath }, 'Cleaned up failed download ZIP');
      }
    } catch (error) {
      logger.warn({ downloadId, error }, 'Failed to cleanup failed download');
    }
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private initializePlaylistProgress(downloadId: string, totalVideos: number, startTime: number): void {
    progressTracker.createDownload(downloadId);
    progressTracker.updateProgress(downloadId, {
      status: 'downloading',
      progress: 0,
      totalVideos,
      completedVideos: 0,
      currentVideoIndex: 0,
      startTime,
    } as any);
  }

  private updatePlaylistProgress(downloadId: string, updates: Partial<PlaylistProgress>): void {
    const current = progressTracker.getProgress(downloadId);
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
    } as any;

    progressTracker.updateProgress(downloadId, updated);

    // Send SSE event
    sseManager.sendEvent(downloadId, {
      downloadId,
      status: updated.status,
      currentVideo: updated.currentVideoTitle || updated.currentVideoId,
      completedVideos: updated.completedVideos || 0,
      totalVideos: updated.totalVideos || 0,
      percentage: updated.overallProgress || 0,
      speed: updated.speed,
      eta: updated.eta,
      zipProgress: updated.zipProgress,
      error: updated.error,
    });
  }

  async getPlaylistProgress(downloadId: string): Promise<PlaylistProgress | undefined> {
    const progress = progressTracker.getProgress(downloadId);
    if (!progress) return undefined;

    return {
      downloadId: progress.downloadId,
      status: progress.status as any,
      totalVideos: (progress as any).totalVideos || 0,
      completedVideos: (progress as any).completedVideos || 0,
      currentVideoIndex: (progress as any).currentVideoIndex || 0,
      currentVideoId: (progress as any).currentVideoId,
      currentVideoTitle: (progress as any).currentVideoTitle,
      overallProgress: progress.progress,
      speed: (progress as any).speed,
      eta: (progress as any).eta,
      zipProgress: (progress as any).zipProgress,
      error: progress.error,
      zipPath: (progress as any).zipPath,
      startTime: (progress as any).startTime,
    };
  }

  cancelPlaylistDownload(downloadId: string): void {
    logger.info({ downloadId }, 'Cancelling playlist download');
    progressTracker.cancelDownload(downloadId);
    sseManager.closeAll(downloadId);
  }

  async servePlaylistZip(downloadId: string): Promise<string> {
    logger.info({ downloadId }, 'servePlaylistZip called');
    
    const progress = await this.getPlaylistProgress(downloadId);
    logger.info({ downloadId, progress }, 'Progress retrieved');
    
    if (!progress || !progress.zipPath) {
      logger.error({ downloadId, progress, hasZipPath: !!progress?.zipPath }, 'Playlist download not found or zipPath missing');
      throw new AppError('FILE_NOT_FOUND', 'Playlist download not found or not completed');
    }

    logger.info({ downloadId, zipPath: progress.zipPath }, 'zipPath found, checking file existence');

    const fileExists = await fs.access(progress.zipPath).then(() => true).catch(() => false);
    if (!fileExists) {
      logger.error({ downloadId, zipPath: progress.zipPath }, 'ZIP file does not exist on disk');
      throw new AppError('FILE_NOT_FOUND', 'ZIP file no longer exists');
    }

    logger.info({ downloadId, zipPath: progress.zipPath }, 'ZIP file exists, returning path');
    return progress.zipPath;
  }
}

export const playlistDownloadService = new PlaylistDownloadService();
