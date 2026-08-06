import { Router } from 'express';
import { downloadService } from '../services/download.service';
import { cleanupService } from '../services/cleanup.service';
import { downloadRequestSchema } from '../utils/validators';
import { handleError } from '../utils/error-handler';
import { logger } from '../config/logger';

const router = Router();

// Health check endpoint with cookie status
router.get('/health', async (req, res, next) => {
  try {
    const cookieStatus = downloadService.getCookieStatus();
    res.json({
      success: true,
      status: 'healthy',
      cookieStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(handleError(error, 'GET /api/health'));
  }
});

router.post('/download', async (req, res, next) => {
  try {
    const { url, quality, type } = downloadRequestSchema.parse(req.body);
    
    logger.info({ url, quality, type }, 'Download request received');

    const downloadId = await downloadService.startDownload({ url, quality, type });
    
    const cookieStatus = downloadService.getCookieStatus();
    
    res.json({
      success: true,
      downloadId,
      message: 'Download started',
      cookieStatus,
    });
  } catch (error) {
    const handledError = handleError(error, 'POST /api/download');
    res.status(500).json({
      error: {
        code: handledError.code,
        message: handledError.message,
        stderr: (handledError as any).stderr || null,
        cookieStatus: downloadService.getCookieStatus(),
      },
    });
  }
});

router.get('/progress/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    const progress = await downloadService.getDownloadProgress(downloadId);
    
    if (!progress) {
      return res.status(404).json({
        error: {
          code: 'DOWNLOAD_NOT_FOUND',
          message: 'Download not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(handleError(error, 'GET /api/progress/:downloadId'));
  }
});

router.delete('/download/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    logger.info({ downloadId }, 'Cancel download request received');
    
    downloadService.cancelDownload(downloadId);
    await cleanupService.cleanupDownload(downloadId);
    
    res.json({
      success: true,
      message: 'Download cancelled',
    });
  } catch (error) {
    next(handleError(error, 'DELETE /api/download/:downloadId'));
  }
});

router.get('/file/:downloadId', async (req, res, next) => {
  try {
    const { downloadId } = req.params;
    
    const filePath = await downloadService.serveFile(downloadId);
    
    const progress = await downloadService.getDownloadProgress(downloadId);
    const extension = progress?.filePath?.split('.').pop() || 'mp4';
    
    res.download(filePath, `download_${downloadId}.${extension}`);
  } catch (error) {
    next(handleError(error, 'GET /api/file/:downloadId'));
  }
});

export default router;
