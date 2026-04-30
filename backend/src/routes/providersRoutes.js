import express from 'express';
import { getProviders, getProviderById, createProvider, updateProvider, deleteProvider } from '../controllers/providersController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// GET - Obtener todos los proveedores
router.get('/', authenticateToken, getProviders);

// GET - Obtener proveedor por ID
router.get('/:id', authenticateToken, getProviderById);

// POST - Crear nuevo proveedor
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), createProvider);

// PUT - Actualizar proveedor
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), updateProvider);

// DELETE - Eliminar proveedor (soft delete)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteProvider);

export default router;