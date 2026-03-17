import express from 'express';
import * as inventoryController from '../controllers/inventoryController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, inventoryController.getInventory);
router.get('/low-stock', authenticateToken, inventoryController.getLowStockProducts);
router.put('/:product_id', authenticateToken, authorizeRole(['admin', 'manager']), inventoryController.updateInventory);

export default router;