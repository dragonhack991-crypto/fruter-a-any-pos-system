import express from 'express';
import db from '../config/database.js';
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

// GET /providers/list must come BEFORE /:id to avoid being caught by the dynamic route
router.get('/providers/list', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT id, name FROM providers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', authorizeRole(['admin', 'manager']), getPurchases);
router.get('/:id', authorizeRole(['admin', 'manager']), getPurchaseById);
router.post('/', authorizeRole(['admin', 'manager']), createPurchase);
router.put('/:id', authorizeRole(['admin', 'manager']), updatePurchase);
router.delete('/:id', authorizeRole(['admin', 'manager']), deletePurchase);

export default router;