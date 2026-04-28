import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase
} from '../controllers/purchaseController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizeRole(['admin', 'manager']), getPurchases);
router.get('/:id', authorizeRole(['admin', 'manager']), getPurchaseById);
router.post('/', authorizeRole(['admin', 'manager']), createPurchase);
router.put('/:id', authorizeRole(['admin', 'manager']), updatePurchase);
router.delete('/:id', authorizeRole(['admin', 'manager']), deletePurchase);

export default router;