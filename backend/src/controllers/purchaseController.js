import db from '../config/database.js';

export const getPurchases = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.purchase_number,
        p.provider_id as supplier_id,
        p.user_id,
        p.subtotal,
        p.tax,
        p.total_amount,
        p.status,
        p.notes,
        p.created_at,
        p.expected_delivery_date,
        p.actual_delivery_date,
        pr.name as supplier_name,
        pr.name as provider_name,
        u.full_name as user_name
      FROM purchases p
      LEFT JOIN providers pr ON p.provider_id = pr.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    
    const [purchases] = await db.query(query);

    if (purchases.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Obtener todos los items en una sola consulta
    const purchaseIds = purchases.map(p => p.id);
    const [allItems] = await db.query(
      `SELECT pd.purchase_id, pd.id, pd.product_id, pd.quantity_ordered as quantity,
              pd.unit_price as unit_cost, pd.total_price as subtotal, pr.name as product_name
       FROM purchase_details pd
       JOIN products pr ON pd.product_id = pr.id
       WHERE pd.purchase_id IN (?)`,
      [purchaseIds]
    );

    // Agrupar items por purchase_id
    const itemsByPurchase = {};
    for (const item of allItems) {
      if (!itemsByPurchase[item.purchase_id]) {
        itemsByPurchase[item.purchase_id] = [];
      }
      itemsByPurchase[item.purchase_id].push(item);
    }

    const formattedPurchases = purchases.map(p => ({
      ...p,
      items: itemsByPurchase[p.id] || []
    }));
    
    res.json({ success: true, data: formattedPurchases });
  } catch (error) {
    console.error('Error getPurchases:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, pr.name as supplier_name, pr.name as provider_name
      FROM purchases p
      LEFT JOIN providers pr ON p.provider_id = pr.id
      WHERE p.id = ?
    `;
    
    const [[purchase]] = await db.query(query, [id]);
    
    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Compra no encontrada' });
    }
    
    const [items] = await db.query(`
      SELECT pd.*, pr.name as product_name
      FROM purchase_details pd
      JOIN products pr ON pd.product_id = pr.id
      WHERE pd.purchase_id = ?
    `, [id]);
    
    res.json({ success: true, data: { ...purchase, items } });
  } catch (error) {
    console.error('Error getPurchaseById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPurchase = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    // Frontend sends supplier_id; map to provider_id for DB
    const { supplier_id, items, notes } = req.body;
    const providerId = supplier_id;
    const userId = req.user.id;
    
    if (!providerId || !items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: 'Proveedor e items son requeridos' });
    }

    // Generar número de compra
    const [[lastPurchase]] = await conn.query(
      'SELECT MAX(CAST(SUBSTRING(purchase_number, 5) AS UNSIGNED)) as last_num FROM purchases'
    );
    const purchaseNumber = `COM-${(lastPurchase?.last_num || 0) + 1}`;
    
    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    // Insertar compra (provider_id, user_id, subtotal, total_amount, notes)
    const [purchaseResult] = await conn.query(
      'INSERT INTO purchases (purchase_number, provider_id, user_id, subtotal, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [purchaseNumber, providerId, userId, total, total, notes || '']
    );
    
    const purchaseId = purchaseResult.insertId;
    
    // Insertar items en purchase_details y actualizar inventario
    for (const item of items) {
      const itemTotal = item.quantity * item.unit_cost;
      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity_ordered, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [purchaseId, item.product_id, item.quantity, item.unit_cost, itemTotal]
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
    console.error('Error createPurchase:', error);
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
    // Frontend sends supplier_id; map to provider_id for DB
    const { supplier_id, items, notes } = req.body;
    const providerId = supplier_id;
    
    // Obtener items anteriores para revertir inventario
    const [oldItems] = await conn.query(
      'SELECT * FROM purchase_details WHERE purchase_id = ?',
      [id]
    );
    
    // Revertir inventario
    for (const oldItem of oldItems) {
      await conn.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [oldItem.quantity_ordered, oldItem.product_id]
      );
    }
    
    // Actualizar compra
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    await conn.query(
      'UPDATE purchases SET provider_id = ?, total_amount = ?, subtotal = ?, notes = ? WHERE id = ?',
      [providerId, total, total, notes || '', id]
    );
    
    // Eliminar items anteriores
    await conn.query('DELETE FROM purchase_details WHERE purchase_id = ?', [id]);
    
    // Insertar nuevos items y actualizar inventario
    for (const item of items) {
      const itemTotal = item.quantity * item.unit_cost;
      await conn.query(
        'INSERT INTO purchase_details (purchase_id, product_id, quantity_ordered, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_cost, itemTotal]
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
    console.error('Error updatePurchase:', error);
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
      'SELECT * FROM purchase_details WHERE purchase_id = ?',
      [id]
    );
    
    // Revertir inventario
    for (const item of items) {
      await conn.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity_ordered, item.product_id]
      );
    }
    
    // Marcar compra como cancelada
    await conn.query("UPDATE purchases SET status = 'cancelled' WHERE id = ?", [id]);
    
    await conn.commit();
    res.json({ success: true, message: 'Compra eliminada' });
  } catch (error) {
    await conn.rollback();
    console.error('Error deletePurchase:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
};