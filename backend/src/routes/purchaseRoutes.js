import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// ========== RUTAS DE COMPRAS ==========

// Obtener todas las compras
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📍 GET /purchases - Iniciando consulta');
    
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
    
    console.log('🔍 Ejecutando query');
    const [purchases] = await db.query(query);
    console.log('✅ Compras obtenidas:', purchases.length);
    
    // Obtener items de cada compra
    for (let purchase of purchases) {
      const [items] = await db.query(
        `SELECT pi.id, pi.product_id, pi.quantity, pi.unit_price, pi.subtotal, pr.name as product_name 
         FROM purchase_details pi
         JOIN products pr ON pi.product_id = pr.id
         WHERE pi.purchase_id = ?`,
        [purchase.id]
      );
      purchase.items = items;
    }
    
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('❌ ERROR EN GET /purchases:', error.message);
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
      `SELECT pi.*, pr.name as product_name
       FROM purchase_details pi
       JOIN products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = ?`,
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
    
    console.log('📍 POST /purchases - Creando compra');
    console.log('Datos:', { provider_id, items, notes, expected_delivery_date });
    
    // Validar que hay items
    if (!items || items.length === 0) {
      throw new Error('Debe agregar al menos un producto');
    }
    
    // Generar número de compra
    const [[lastPurchase]] = await conn.query(
      'SELECT MAX(CAST(SUBSTRING(purchase_number, 5) AS UNSIGNED)) as last_num FROM purchases'
    );
    const purchaseNumber = `PUR-${(lastPurchase?.last_num || 0) + 1}`;
    
    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    
    console.log('💰 Totales:', { subtotal, tax, total });
    
    // Insertar compra
    const [purchaseResult] = await conn.query(
      'INSERT INTO purchases (purchase_number, provider_id, user_id, subtotal, tax, total_amount, notes, expected_delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [purchaseNumber, provider_id, userId, subtotal, tax, total, notes || null, expected_delivery_date || null, 'pending']
    );
    
    const purchaseId = purchaseResult.insertId;
    console.log('✅ Compra creada con ID:', purchaseId);
    
    // Insertar items
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unit_price;
      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_price, itemSubtotal]
      );
      
      // Actualizar inventario
      await conn.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await conn.commit();
    console.log('✅ Compra completada');
    res.json({ success: true, data: { id: purchaseId, purchase_number: purchaseNumber } });
  } catch (error) {
    await conn.rollback();
    console.error('❌ ERROR EN POST /purchases:', error.message);
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
    const tax = subtotal * 0.12;
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
      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_price, itemSubtotal]
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
    console.error('❌ ERROR EN PUT /purchases:', error.message);
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
    console.error('❌ ERROR EN DELETE /purchases:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
});

// ========== RUTAS DE PROVEEDORES ==========

// Obtener proveedores
router.get('/providers/list', authenticateToken, async (req, res) => {
  try {
    console.log('📍 GET /providers/list');
    const [providers] = await db.query(
      'SELECT id, name FROM providers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('❌ ERROR EN GET /providers/list:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear proveedor
router.post('/providers', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    console.log('📍 POST /providers - Creando proveedor');
    const { name, contact_person, phone, email, address } = req.body;
    
    console.log('📝 Datos:', { name, contact_person, phone, email, address });
    
    const [result] = await db.query(
      'INSERT INTO providers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person, phone, email, address]
    );
    
    console.log('✅ Proveedor creado con ID:', result.insertId);
    res.json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    console.error('❌ ERROR EN POST /providers:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;