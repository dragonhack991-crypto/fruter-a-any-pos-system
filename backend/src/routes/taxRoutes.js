import express from 'express';
import * as taxController from '../controllers/taxController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateTaxSettings, handleValidationErrors } from '../utils/validation.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/taxes/settings
 * Obtener configuración de impuestos (acceso público autenticado)
 */
router.get('/settings', taxController.getTaxSettings);

/**
 * PUT /api/taxes/settings
 * Actualizar configuración (solo admin)
 */
router.put(
  '/settings',
  authorizeRole(['admin']),
  validateTaxSettings,
  handleValidationErrors,
  taxController.updateTaxSettings
);

/**
 * GET /api/taxes/daily-profit/:date
 * Obtener ganancia del día (formato: YYYY-MM-DD)
 */
router.get(
  '/daily-profit/:date',
  taxController.getDailyProfit
);

/**
 * GET /api/taxes/profit-range
 * Obtener ganancias en rango de fechas
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get(
  '/profit-range',
  taxController.getProfitRange
);

export default router;