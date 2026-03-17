import db from '../config/database.js';

export const getPurchases = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*,
        s.name as supplier_name,
        u.full_name as created_by_name,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', pi.id,
            'product_id', pi.product_id,
            'product_name', pr.name,
            'quantity', pi.quantity,
            'unit_cost', pi.unit_cost,
            'subtotal', pi.subtotal
          )
        ) as items
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      LEFT JOIN products pr ON pi.product_id = pr.id
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    
    const [purchases] = await db.query(query);
    
    const formattedPurchases = purchases.map(p => ({
      ...p,
      items: p.items ? JSON.parse(`[${p.items}]`) : []
    }));
    
    res.json({ success: true, data: formattedPurchases });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, s.name as supplier_name
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    
    const [[purchase]] = await db.query(query, [id]);
    
    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }
    
    const [items] = await db.query(`
      SELECT pi.*, pr.name as product_name
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `, [id]);
    
    res.json({ success: true, data: { ...purchase, items } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPurchase = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const { supplier_id, purchase_date, items, notes } = req.body;
    const userId = req.user.id;
    
    // Generar número de compra
    const [[lastPurchase]] = await conn.query(
      'SELECT MAX(CAST(SUBSTRING(purchase_number, 5) AS UNSIGNED)) as last_num FROM purchases'
    );
    const purchaseNumber = `COM-${(lastPurchase?.last_num || 0) + 1}`;
    
    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    // Insertar compra
    const [purchaseResult] = await conn.query(
      'INSERT INTO purchases (purchase_number, supplier_id, purchase_date, total_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [purchaseNumber, supplier_id, purchase_date, total, notes, userId]
    );
    
    const purchaseId = purchaseResult.insertId;
    
    // Insertar items
    for (const item of items) {
      const subtotal = item.quantity * item.unit_cost;
      await conn.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_cost, subtotal]
      );
      
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
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
};

export const updatePurchase = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const { id } = req.params;
    const { supplier_id, purchase_date, items, notes } = req.body;
    
    // Obtener compra anterior para revertir inventario
    const [oldItems] = await conn.query(
      'SELECT * FROM purchase_items WHERE purchase_id = ?',
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
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    await conn.query(
      'UPDATE purchases SET supplier_id = ?, purchase_date = ?, total_amount = ?, notes = ? WHERE id = ?',
      [supplier_id, purchase_date, total, notes, id]
    );
    
    // Eliminar items anteriores
    await conn.query('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);
    
    // Insertar nuevos items y actualizar inventario
    for (const item of items) {
      const subtotal = item.quantity * item.unit_cost;
      await conn.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_cost, subtotal]
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
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
};

export const deletePurchase = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const { id } = req.params;
    
    // Obtener items para revertir inventario
    const [items] = await conn.query(
      'SELECT * FROM purchase_items WHERE purchase_id = ?',
      [id]
    );
    
    // Revertir inventario
    for (const item of items) {
      await conn.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    // Marcar como inactiva
    await conn.query('UPDATE purchases SET is_active = 0 WHERE id = ?', [id]);
    
    await conn.commit();
    res.json({ success: true, message: 'Compra eliminada' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
};