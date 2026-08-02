import { Router } from 'express';
import { YtDlpService } from '../services/yt-dlp.service';
import { playlistDownloadService } from '../services/playlist-download.service';
import { analyzePlaylistSchema, playlistDownloadSchema } from '../utils/validators';
import { sseManager } from '../utils/sse';
import { handleError } from '../utils/error-handler';
import { logger } from '../config/logger';

const router = Router();
const ytDlpService = new YtDlpService();

router.post('/analyze-playlist', async (req, res, next) => {
  try {
    const { url } = analyzePlaylistSchema.parse(req.body);
    
    logger.info({ url }, 'Playlist analysis request received');

    const result = await ytDlpService.analyzePlaylist(url);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(handleError(error, 'POST /api/analyze-playlist'));
  }
});

router.post('/download-playlist', async (req, res, next) => {
  try {
    const options = playlistDownloadSchema.parse(req.body);
    
    logger.info({ url: options.url, type: options.type, quality: options.quality }, 'Playlist download request received');

    // Generate downloadId first
    const downloadId = playlistDownloadService.generateDownloadId();
    
    // Start download in background without awaiting
    playlistDownloadService.startPlaylistDownload(options, downloadId).catch(error => {
      logger.error({ downloadId, error }, 'Background download failed');
    });
    
    // Return immediately with downloadId
    res.json({
      success: true,
      downloadId,
      message: 'Playlist download started',
    });
  } catch (error) {
    next(handleError(error, 'POST /api/download-playlist'));
  }
});

router.get('/playlist-events/:downloadId', (req, res) => {
  const { downloadId } = req.params;
  
  logger.info({ downloadId }, 'SSE connection established');
  
  sseManager.addClient(downloadId, res);
});

router.get('/playlist-progress/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    const progress = await playlistDownloadService.getPlaylistProgress(downloadId);
    
    if (!progress) {
      return res.status(404).json({
        error: {
          code: 'DOWNLOAD_NOT_FOUND',
          message: 'Playlist download not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(handleError(error, 'GET /api/playlist-progress/:downloadId'));
  }
});

router.delete('/playlist-download/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    logger.info({ downloadId }, 'Cancel playlist download request received');
    
    playlistDownloadService.cancelPlaylistDownload(downloadId);
    
    res.json({
      success: true,
      message: 'Playlist download cancelled',
    });
  } catch (error) {
    next(handleError(error, 'DELETE /api/playlist-download/:downloadId'));
  }
});

router.get('/playlist-file/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    logger.info({ downloadId }, 'Playlist file download request received');
    
    const filePath = await playlistDownloadService.servePlaylistZip(downloadId);
    
    logger.info({ downloadId, filePath }, 'File path retrieved, sending file');
    
    res.download(filePath, `playlist_${downloadId}.zip`);
    
    logger.info({ downloadId }, 'File download response sent');
  } catch (error) {
    logger.error({ error }, 'Failed to serve playlist file');
    next(handleError(error, 'GET /api/playlist-file/:downloadId'));
  }
});

export default router;
