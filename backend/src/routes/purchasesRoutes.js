import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// ========== RUTAS DE COMPRAS ==========

// Obtener todas las compras
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.purchase_number,
        p.provider_id,
        p.user_id,
        p.subtotal,
        p.tax,
        p.total_amount,
        p.status,
        p.notes,
        p.created_at,
        p.expected_delivery_date,
        p.actual_delivery_date,
        pr.name as provider_name,
        u.full_name as user_name
      FROM purchases p
      LEFT JOIN providers pr ON p.provider_id = pr.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;

    const [purchases] = await db.query(query);

    for (let purchase of purchases) {
      const [items] = await db.query(
        `SELECT pd.id, pd.product_id, pd.quantity, pd.unit_price, pd.subtotal,
                pd.is_ieps, pd.ieps_rate, pr.name as product_name
         FROM purchase_details pd
         JOIN products pr ON pd.product_id = pr.id
         WHERE pd.purchase_id = ?`,
        [purchase.id]
      );
      purchase.items = items;
    }

    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error GET /purchases:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener una compra por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [[purchase]] = await db.query(
      `SELECT p.*, pr.name as provider_name
       FROM purchases p
       LEFT JOIN providers pr ON p.provider_id = pr.id
       WHERE p.id = ?`,
      [id]
    );

    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }

    const [items] = await db.query(
      `SELECT pd.*, pr.name as product_name
       FROM purchase_details pd
       JOIN products pr ON pd.product_id = pr.id
       WHERE pd.purchase_id = ?`,
      [id]
    );

    res.json({ success: true, data: { ...purchase, items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nueva compra
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { provider_id, items, notes, expected_delivery_date } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      throw new Error('Debe agregar al menos un producto');
    }

    if (!provider_id) {
      throw new Error('Debe seleccionar un proveedor');
    }

    // Generar número de compra
    const [[lastPurchase]] = await conn.query(
      'SELECT MAX(CAST(SUBSTRING(purchase_number, 5) AS UNSIGNED)) as last_num FROM purchases'
    );
    const purchaseNumber = `PUR-${(lastPurchase?.last_num || 0) + 1}`;

    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = 0;
    const total = subtotal + tax;

    // Insertar compra con status 'completed'
    const [purchaseResult] = await conn.query(
      'INSERT INTO purchases (purchase_number, provider_id, user_id, subtotal, tax, total_amount, notes, expected_delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [purchaseNumber, provider_id, userId, subtotal, tax, total, notes || null, expected_delivery_date || null, 'completed']
    );

    const purchaseId = purchaseResult.insertId;

    // Insertar items con soporte IEPS
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unit_price;
      const isIeps = item.is_ieps ? 1 : 0;
      const iepsRate = item.is_ieps ? (parseFloat(item.ieps_rate) || 0) : 0;

      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price, subtotal, is_ieps, ieps_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_price, itemSubtotal, isIeps, iepsRate]
      );

      // Actualizar IEPS en la tabla de productos si aplica
      if (item.is_ieps && item.ieps_rate) {
        await conn.query(
          'UPDATE products SET is_ieps = 1, ieps_rate = ? WHERE id = ?',
          [iepsRate, item.product_id]
        );
      }

      // Actualizar inventario
      await conn.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    await conn.commit();
    res.json({ success: true, data: { id: purchaseId, purchase_number: purchaseNumber } });
  } catch (error) {
    await conn.rollback();
    console.error('Error POST /purchases:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
});

// Actualizar compra
router.put('/:id', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { provider_id, items, notes, expected_delivery_date } = req.body;

    // Obtener items anteriores para revertir inventario
    const [oldItems] = await conn.query(
      'SELECT * FROM purchase_details WHERE purchase_id = ?',
      [id]
    );

    // Revertir inventario
    for (const oldItem of oldItems) {
      await conn.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [oldItem.quantity, oldItem.product_id]
      );
    }

    // Actualizar compra
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = 0;
    const total = subtotal + tax;

    await conn.query(
      'UPDATE purchases SET provider_id = ?, subtotal = ?, tax = ?, total_amount = ?, notes = ?, expected_delivery_date = ? WHERE id = ?',
      [provider_id, subtotal, tax, total, notes || null, expected_delivery_date || null, id]
    );

    // Eliminar items anteriores
    await conn.query('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);

    // Insertar nuevos items
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unit_price;
      const isIeps = item.is_ieps ? 1 : 0;
      const iepsRate = item.is_ieps ? (parseFloat(item.ieps_rate) || 0) : 0;

      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price, subtotal, is_ieps, ieps_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_price, itemSubtotal, isIeps, iepsRate]
      );

      await conn.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Compra actualizada' });
  } catch (error) {
    await conn.rollback();
    console.error('Error PUT /purchases/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
});

// Eliminar compra
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Obtener items para revertir inventario
    const [items] = await conn.query(
      'SELECT * FROM purchase_details WHERE purchase_id = ?',
      [id]
    );

    // Revertir inventario
    for (const item of items) {
      await conn.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Eliminar items
    await conn.query('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);

    // Eliminar compra
    await conn.query('DELETE FROM purchases WHERE id = ?', [id]);

    await conn.commit();
    res.json({ success: true, message: 'Compra eliminada' });
  } catch (error) {
    await conn.rollback();
    console.error('Error DELETE /purchases/:id:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
});

// ========== RUTAS DE PROVEEDORES (dentro de purchases) ==========

// Obtener lista de proveedores activos
router.get('/providers/list', authenticateToken, async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT id, name, phone, email FROM providers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error GET /purchases/providers/list:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;