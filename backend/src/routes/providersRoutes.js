import express from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET - Obtener todos los proveedores
router.get('/', authenticate, getSuppliers);

// POST - Crear nuevo proveedor
router.post('/', authenticate, authorize(['admin', 'manager']), createSupplier);

// PUT - Actualizar proveedor
router.put('/:id', authenticate, authorize(['admin', 'manager']), updateSupplier);

// DELETE - Eliminar proveedor
router.delete('/:id', authenticate, authorize(['admin']), deleteSupplier);

export default router;