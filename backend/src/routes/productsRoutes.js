import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas (requieren autenticación)
router.get('/', authenticateToken, productController.getProducts);

// Categorías
router.get('/categories/list', authenticateToken, productController.getCategories);
router.get('/categories', authenticateToken, productController.getCategories);

// Unidades
router.get('/units/list', authenticateToken, productController.getUnits);
router.get('/units', authenticateToken, productController.getUnits);

// Por barcode
router.get('/barcode/:barcode', authenticateToken, productController.getProductByBarcode);

// Por ID
router.get('/:id', authenticateToken, productController.getProductById);

// Rutas protegidas (solo admin y manager)
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), productController.createProduct);
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), productController.updateProduct);
router.delete('/:id', authenticateToken, authorizeRole(['admin']), productController.deleteProduct);

export default router;