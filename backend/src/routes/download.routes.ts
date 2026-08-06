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

// Diagnostic endpoint for cookie and system verification
router.get('/diagnose', async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { execSync } = require('child_process');
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      cookieStatus: downloadService.getCookieStatus(),
      system: {},
      ytDlp: {},
      tests: {}
    };

    // System information
    diagnostics.system.platform = process.platform;
    diagnostics.system.arch = process.arch;
    diagnostics.system.nodeVersion = process.version;
    diagnostics.system.cwd = process.cwd();
    diagnostics.system.path = process.env.PATH;

    // Cookie file verification
    const cookieEnvPath = process.env.YOUTUBE_COOKIES_FILE;
    if (cookieEnvPath) {
      diagnostics.system.cookieEnvVar = cookieEnvPath;
      const cookieExists = fs.existsSync(cookieEnvPath);
      diagnostics.system.cookieFileExists = cookieExists;
      
      if (cookieExists) {
        try {
          const stats = fs.statSync(cookieEnvPath);
          diagnostics.system.cookieFileSize = stats.size;
          diagnostics.system.cookieFileLines = fs.readFileSync(cookieEnvPath, 'utf8').split('\n').length;
          diagnostics.system.cookieSample = fs.readFileSync(cookieEnvPath, 'utf8').substring(0, 200);
        } catch (error) {
          diagnostics.system.cookieError = (error as Error).message;
        }
      }
    } else {
      diagnostics.system.cookieEnvVar = 'NOT_SET';
    }

    // Check for cookies.txt in current directory
    const localCookiesPath = path.join(process.cwd(), 'cookies.txt');
    diagnostics.system.localCookiesExists = fs.existsSync(localCookiesPath);
    if (diagnostics.system.localCookiesExists) {
      try {
        const stats = fs.statSync(localCookiesPath);
        diagnostics.system.localCookiesSize = stats.size;
        diagnostics.system.localCookiesLines = fs.readFileSync(localCookiesPath, 'utf8').split('\n').length;
      } catch (error) {
        diagnostics.system.localCookiesError = (error as Error).message;
      }
    }

    // yt-dlp binary check
    const ytDlpPaths = [
      path.join(process.cwd(), 'yt-dlp'),
      path.join(process.cwd(), 'yt-dlp.exe'),
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp'
    ];

    let ytDlpFound = false;
    for (const ytDlpBinaryPath of ytDlpPaths) {
      if (fs.existsSync(ytDlpBinaryPath)) {
        diagnostics.ytDlp.path = ytDlpBinaryPath;
        diagnostics.ytDlp.exists = true;
        ytDlpFound = true;
        try {
          const version = execSync(`"${ytDlpBinaryPath}" --version`, { encoding: 'utf8' });
          diagnostics.ytDlp.version = version.trim();
        } catch (error) {
          diagnostics.ytDlp.versionError = (error as Error).message;
        }
        break;
      }
    }

    if (!ytDlpFound) {
      diagnostics.ytDlp.exists = false;
      diagnostics.ytDlp.path = 'NOT_FOUND';
    }

    // Test yt-dlp with cookies
    if (cookieEnvPath && fs.existsSync(cookieEnvPath)) {
      try {
        const testArgs = [
          '--cookies', cookieEnvPath,
          '--impersonate', 'chrome',
          '--dump-json',
          '--no-playlist',
          'https://www.youtube.com/watch?v=ip8o5hDFLhI'
        ];
        
        if (diagnostics.ytDlp.exists) {
          try {
            const testOutput = execSync(`"${diagnostics.ytDlp.path}" ${testArgs.join(' ')}`, { 
              encoding: 'utf8',
              timeout: 30000,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            diagnostics.tests.cookiesTest = 'SUCCESS';
            diagnostics.tests.cookiesOutput = testOutput.substring(0, 500);
          } catch (error: any) {
            diagnostics.tests.cookiesTest = 'FAILED';
            diagnostics.tests.cookiesError = error.message;
            diagnostics.tests.cookiesStderr = error.stderr ? error.stderr.substring(0, 500) : 'No stderr';
          }
        }
      } catch (error) {
        diagnostics.tests.cookiesTest = 'SKIPPED';
        diagnostics.tests.cookiesSkipReason = (error as Error).message;
      }
    } else {
      diagnostics.tests.cookiesTest = 'SKIPPED';
      diagnostics.tests.cookiesSkipReason = 'Cookie file not available';
    }

    // Test yt-dlp without cookies (impersonate only)
    if (diagnostics.ytDlp.exists) {
      try {
        const testArgs = [
          '--impersonate', 'chrome',
          '--extractor-args', 'youtube:player_client=android',
          '--dump-json',
          '--no-playlist',
          'https://www.youtube.com/watch?v=ip8o5hDFLhI'
        ];
        
        try {
          const testOutput = execSync(`"${diagnostics.ytDlp.path}" ${testArgs.join(' ')}`, { 
            encoding: 'utf8',
            timeout: 30000,
            stdio: ['ignore', 'pipe', 'pipe']
          });
          diagnostics.tests.impersonateTest = 'SUCCESS';
          diagnostics.tests.impersonateOutput = testOutput.substring(0, 500);
        } catch (error: any) {
          diagnostics.tests.impersonateTest = 'FAILED';
          diagnostics.tests.impersonateError = error.message;
          diagnostics.tests.impersonateStderr = error.stderr ? error.stderr.substring(0, 500) : 'No stderr';
        }
      } catch (error) {
        diagnostics.tests.impersonateTest = 'SKIPPED';
        diagnostics.tests.impersonateSkipReason = (error as Error).message;
      }
    }

    res.json({
      success: true,
      diagnostics
    });
  } catch (error) {
    next(handleError(error, 'GET /api/diagnose'));
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
