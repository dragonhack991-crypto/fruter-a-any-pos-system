import express from 'express';
import { openCashBox, closeCashBox, getActiveCashBox, getCashBoxHistory } from '../controllers/cashBoxController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/cashbox/active
 * Obtener caja activa del usuario actual
 */
router.get('/active', getActiveCashBox);

/**
 * GET /api/cashbox/history
 * Historial de sesiones de caja (solo admin y manager)
 */
router.get('/history', authorizeRole(['admin', 'manager']), getCashBoxHistory);

/**
 * POST /api/cashbox/open
 * Abrir nueva caja (admin, manager, cashier)
 */
router.post('/open', authorizeRole(['admin', 'manager', 'cashier']), openCashBox);

/**
 * POST /api/cashbox/close
 * Cerrar caja activa (admin, manager, cashier)
 */
router.post('/close', authorizeRole(['admin', 'manager', 'cashier']), closeCashBox);

export default router;