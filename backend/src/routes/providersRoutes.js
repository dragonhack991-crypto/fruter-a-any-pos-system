import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los proveedores activos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [providers] = await db.query(
      `SELECT id, name, email, phone, address, city, ruc, is_active, created_at
       FROM providers
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error GET /providers:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener proveedor por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [[provider]] = await db.query(
      `SELECT * FROM providers WHERE id = ? AND is_active = 1`,
      [id]
    );

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error GET /providers/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nuevo proveedor
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, email, phone, address, city, ruc } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre es requerido' });
    }

    const [result] = await db.query(
      `INSERT INTO providers (name, email, phone, address, city, ruc, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, email || '', phone || '', address || '', city || '', ruc || '']
    );

    res.json({
      success: true,
      message: 'Proveedor creado exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error POST /providers:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar proveedor
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, ruc } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre es requerido' });
    }

    await db.query(
      `UPDATE providers SET name = ?, email = ?, phone = ?, address = ?, city = ?, ruc = ? WHERE id = ?`,
      [name, email || '', phone || '', address || '', city || '', ruc || '', id]
    );

    res.json({ success: true, message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('Error PUT /providers/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar proveedor (marcar como inactivo)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE providers SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error DELETE /providers/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;