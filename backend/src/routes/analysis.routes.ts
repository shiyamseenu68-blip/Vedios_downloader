import { Router } from 'express';
import { YtDlpService } from '../services/yt-dlp.service';
import { analyzeUrlSchema } from '../utils/validators';
import { handleError } from '../utils/error-handler';
import { logger } from '../config/logger';

const router = Router();
const ytDlpService = new YtDlpService();

router.post('/analyze', async (req, res, next) => {
  try {
    const { url } = analyzeUrlSchema.parse(req.body);
    
    logger.info({ url }, 'Analysis request received');

    const result = await ytDlpService.analyzeUrl(url);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(handleError(error, 'POST /api/analyze'));
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export default router;
