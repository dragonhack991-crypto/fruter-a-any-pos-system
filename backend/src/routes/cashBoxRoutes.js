import express from 'express';
import { openCashBox, closeCashBox, getActiveCashBox, getCashBoxHistory } from '../controllers/cashBoxController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.get('/active', getActiveCashBox);
router.get('/history', authorizeRole(['admin', 'manager']), getCashBoxHistory);
router.post('/open', authorizeRole(['admin', 'manager', 'cashier']), openCashBox);
router.post('/close', authorizeRole(['admin', 'manager', 'cashier']), closeCashBox);

export default router;