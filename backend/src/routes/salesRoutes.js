import express from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateSale, validateProductId, validatePagination, handleValidationErrors } from '../utils/validation.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/sales - Listar ventas con paginación
router.get(
  '/',
  validatePagination,
  handleValidationErrors,
  saleController.getSales
);

// GET /api/sales/today - Ventas del día
router.get('/today', saleController.getTodaysSales);

// GET /api/sales/:id - Detalle de venta
router.get(
  '/:id',
  validateProductId,
  handleValidationErrors,
  saleController.getSaleById
);

// POST /api/sales - Crear venta
router.post(
  '/',
  validateSale,
  handleValidationErrors,
  saleController.createSale
);

// DELETE /api/sales/:id - Cancelar venta
router.delete(
  '/:id',
  validateProductId,
  handleValidationErrors,
  saleController.cancelSale
);

export default router;