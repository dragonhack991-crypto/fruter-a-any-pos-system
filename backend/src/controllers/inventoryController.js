import pool from '../config/database.js';

export const getInventory = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [inventory] = await connection.query(
      `SELECT inv.*, p.name as product_name, p.unit_price, pc.name as category_name, u.symbol as unit_symbol
       FROM inventory inv
       JOIN products p ON inv.product_id = p.id
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN units u ON p.unit_id = u.id
       WHERE p.is_active = TRUE
       ORDER BY p.name ASC`
    );

    res.json({ success: true, data: inventory || [] });
  } catch (error) {
    console.error('Error en getInventory:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateInventory = async (req, res) => {
  let connection;
  try {
    const { product_id } = req.params;
    const { quantity, reorder_point } = req.body;

    if (quantity === undefined && reorder_point === undefined) {
      return res.status(400).json({ success: false, error: 'Proporciona quantity o reorder_point' });
    }

    connection = await pool.getConnection();

    let updateFields = [];
    let params = [];

    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      params.push(quantity);
    }
    if (reorder_point !== undefined) {
      updateFields.push('reorder_point = ?');
      params.push(reorder_point);
    }

    params.push(product_id);

    const [result] = await connection.query(
      `UPDATE inventory SET ${updateFields.join(', ')} WHERE product_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Inventario no encontrado' });
    }

    res.json({ success: true, message: 'Inventario actualizado exitosamente' });
  } catch (error) {
    console.error('Error en updateInventory:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getLowStockProducts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [products] = await connection.query(
      `SELECT inv.*, p.name as product_name, p.unit_price, pc.name as category_name
       FROM inventory inv
       JOIN products p ON inv.product_id = p.id
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.is_active = TRUE AND inv.quantity <= inv.reorder_point
       ORDER BY inv.quantity ASC`
    );

    res.json({ success: true, data: products || [] });
  } catch (error) {
    console.error('Error en getLowStockProducts:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};