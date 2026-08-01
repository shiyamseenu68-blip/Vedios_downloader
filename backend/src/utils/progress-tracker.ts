import { EventEmitter } from 'events';

export interface DownloadProgress {
  downloadId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed?: string;
  eta?: string;
  fileSize?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
  filePath?: string;
  startTime: number;
  endTime?: number;
}

export class ProgressTracker extends EventEmitter {
  private downloads: Map<string, DownloadProgress> = new Map();

  createDownload(downloadId: string): DownloadProgress {
    const progress: DownloadProgress = {
      downloadId,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
    };
    this.downloads.set(downloadId, progress);
    this.emit('created', progress);
    return progress;
  }

  updateProgress(downloadId: string, updates: Partial<DownloadProgress>): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      Object.assign(progress, updates);
      this.emit('progress', progress);
    }
  }

  getProgress(downloadId: string): DownloadProgress | undefined {
    return this.downloads.get(downloadId);
  }

  getAllProgress(): DownloadProgress[] {
    return Array.from(this.downloads.values());
  }

  completeDownload(downloadId: string, filePath: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      progress.status = 'completed';
      progress.progress = 100;
      progress.filePath = filePath;
      progress.endTime = Date.now();
      this.emit('completed', progress);
    }
  }

  failDownload(downloadId: string, error: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      progress.status = 'failed';
      progress.error = error;
      progress.endTime = Date.now();
      this.emit('failed', progress);
    }
  }

  cancelDownload(downloadId: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      progress.status = 'cancelled';
      progress.endTime = Date.now();
      this.emit('cancelled', progress);
    }
  }

  removeDownload(downloadId: string): void {
    this.downloads.delete(downloadId);
    this.emit('removed', downloadId);
  }

  clear(): void {
    this.downloads.clear();
    this.emit('cleared');
  }
}

export const progressTracker = new ProgressTracker();
