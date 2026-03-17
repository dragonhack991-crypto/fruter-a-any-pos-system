import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// GET - Obtener todos los proveedores
router.get('/', authenticateToken, getSuppliers);

// POST - Crear nuevo proveedor
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), createSupplier);

// PUT - Actualizar proveedor
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), updateSupplier);

// DELETE - Eliminar proveedor
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteSupplier);

export default router;