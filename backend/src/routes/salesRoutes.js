import express from 'express';
import * as saleController from '../controllers/saleController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, saleController.getSales);
router.get('/today', authenticateToken, saleController.getTodaysSales);
router.get('/:id', authenticateToken, saleController.getSaleById);
router.post('/', authenticateToken, authorizeRole(['admin', 'manager', 'cashier']), saleController.createSale);
router.put('/:id/cancel', authenticateToken, authorizeRole(['admin', 'manager']), saleController.cancelSale);

export default router;