import { Router } from 'express';
import {
  getDashboardData,
  scheduleProviderVisit,
  deleteProviderVisit
} from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, getDashboardData);
router.post('/provider-visits', authenticateToken, scheduleProviderVisit);
router.delete('/provider-visits/:id', authenticateToken, deleteProviderVisit);

export default router;
