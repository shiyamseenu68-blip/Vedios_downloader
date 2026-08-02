import { Router } from 'express';
import analysisRoutes from './analysis.routes';
import downloadRoutes from './download.routes';
import playlistRoutes from './playlist.routes';

const router = Router();

router.use('/api', analysisRoutes);
router.use('/api', downloadRoutes);
router.use('/api', playlistRoutes);

export default router;
