import express from 'express';
import * as adjController from '../controllers/inventoryAdjustmentController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateInventoryAdjustment, handleValidationErrors } from '../utils/validation.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/inventory/current
 * Obtener inventario actual
 */
router.get('/current', adjController.getCurrentInventory);

/**
 * GET /api/inventory/adjustments
 * Historial de ajustes (solo admin)
 */
router.get(
  '/adjustments',
  authorizeRole(['admin']),
  adjController.getAdjustmentHistory
);

/**
 * GET /api/inventory/adjustments/:id
 * Obtener detalle de ajuste (solo admin)
 */
router.get(
  '/adjustments/:id',
  authorizeRole(['admin']),
  adjController.getAdjustmentById
);

/**
 * POST /api/inventory/adjustments
 * Crear ajuste (solo admin)
 */
router.post(
  '/adjustments',
  authorizeRole(['admin']),
  validateInventoryAdjustment,
  handleValidationErrors,
  adjController.createAdjustment
);

export default router;