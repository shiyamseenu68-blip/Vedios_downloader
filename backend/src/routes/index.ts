import { Router } from 'express';
import analysisRoutes from './analysis.routes';
import downloadRoutes from './download.routes';

const router = Router();

router.use('/api', analysisRoutes);
router.use('/api', downloadRoutes);

export default router;
