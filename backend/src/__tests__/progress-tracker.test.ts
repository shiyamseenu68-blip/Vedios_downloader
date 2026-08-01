import { ProgressTracker, DownloadProgress } from '../utils/progress-tracker';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  afterEach(() => {
    tracker.clear();
  });

  describe('createDownload', () => {
    it('should create a new download with pending status', () => {
      const downloadId = 'test-123';
      const progress = tracker.createDownload(downloadId);

      expect(progress.downloadId).toBe(downloadId);
      expect(progress.status).toBe('pending');
      expect(progress.progress).toBe(0);
      expect(progress.startTime).toBeDefined();
    });
  });

  describe('updateProgress', () => {
    it('should update download progress', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      tracker.updateProgress(downloadId, { progress: 50, status: 'downloading' });

      const progress = tracker.getProgress(downloadId);
      expect(progress?.progress).toBe(50);
      expect(progress?.status).toBe('downloading');
    });

    it('should not update non-existent download', () => {
      tracker.updateProgress('non-existent', { progress: 50 });

      const progress = tracker.getProgress('non-existent');
      expect(progress).toBeUndefined();
    });
  });

  describe('getProgress', () => {
    it('should return progress for existing download', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      const progress = tracker.getProgress(downloadId);
      expect(progress).toBeDefined();
      expect(progress?.downloadId).toBe(downloadId);
    });

    it('should return undefined for non-existent download', () => {
      const progress = tracker.getProgress('non-existent');
      expect(progress).toBeUndefined();
    });
  });

  describe('completeDownload', () => {
    it('should mark download as completed', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      tracker.completeDownload(downloadId, '/path/to/file.mp4');

      const progress = tracker.getProgress(downloadId);
      expect(progress?.status).toBe('completed');
      expect(progress?.progress).toBe(100);
      expect(progress?.filePath).toBe('/path/to/file.mp4');
      expect(progress?.endTime).toBeDefined();
    });
  });

  describe('failDownload', () => {
    it('should mark download as failed', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      tracker.failDownload(downloadId, 'Download failed');

      const progress = tracker.getProgress(downloadId);
      expect(progress?.status).toBe('failed');
      expect(progress?.error).toBe('Download failed');
      expect(progress?.endTime).toBeDefined();
    });
  });

  describe('cancelDownload', () => {
    it('should mark download as cancelled', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      tracker.cancelDownload(downloadId);

      const progress = tracker.getProgress(downloadId);
      expect(progress?.status).toBe('cancelled');
      expect(progress?.endTime).toBeDefined();
    });
  });

  describe('removeDownload', () => {
    it('should remove download from tracker', () => {
      const downloadId = 'test-123';
      tracker.createDownload(downloadId);

      tracker.removeDownload(downloadId);

      const progress = tracker.getProgress(downloadId);
      expect(progress).toBeUndefined();
    });
  });

  describe('getAllProgress', () => {
    it('should return all downloads', () => {
      tracker.createDownload('test-1');
      tracker.createDownload('test-2');
      tracker.createDownload('test-3');

      const allProgress = tracker.getAllProgress();
      expect(allProgress).toHaveLength(3);
    });
  });
});
