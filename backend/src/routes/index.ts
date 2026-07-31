import { Router } from 'express';
import analysisRoutes from './analysis.routes';

const router = Router();

router.use('/api', analysisRoutes);

export default router;
