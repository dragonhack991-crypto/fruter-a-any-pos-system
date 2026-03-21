import express from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { validateSale, validatePagination, handleValidationErrors } from '../utils/validation.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/sales
 * Listar todas las ventas con paginación
 */
router.get(
  '/',
  validatePagination,
  handleValidationErrors,
  saleController.getSales
);

/**
 * GET /api/sales/today
 * Obtener ventas de hoy con resumen
 * IMPORTANTE: Esta ruta debe ir ANTES de la ruta /:id
 */
router.get(
  '/today',
  saleController.getTodaysSales
);

/**
 * GET /api/sales/:id
 * Obtener detalle de una venta específica
 */
router.get(
  '/:id',
  saleController.getSaleById
);

/**
 * POST /api/sales
 * Crear nueva venta (solo admin, manager, cashier)
 */
router.post(
  '/',
  authorizeRole(['admin', 'manager', 'cashier']),
  validateSale,
  handleValidationErrors,
  saleController.createSale
);

/**
 * DELETE /api/sales/:id
 * Cancelar venta (solo admin, manager)
 */
router.delete(
  '/:id',
  authorizeRole(['admin', 'manager']),
  saleController.cancelSale
);

export default router;