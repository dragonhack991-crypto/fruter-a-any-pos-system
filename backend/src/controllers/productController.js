import pool from '../config/database.js';

export const createProduct = async (req, res) => {
  let connection;
  try {
    const { name, description, category_id, unit_id, barcode, is_perishable, shelf_life_days, unit_price } = req.body;

    if (!name || !category_id || !unit_id || !unit_price) {
      return res.status(400).json({ success: false, error: 'Datos requeridos faltantes' });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO products (name, description, category_id, unit_id, barcode, is_perishable, shelf_life_days, unit_price, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', category_id, unit_id, barcode || null, is_perishable || false, shelf_life_days || 0, unit_price, 1]
    );

    // Crear registro en inventario
    await connection.query(
      `INSERT INTO inventory (product_id, quantity, unit_cost, reorder_point) VALUES (?, ?, ?, ?)`,
      [result.insertId, 0, unit_price, 0]
    );

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      productId: result.insertId
    });
  } catch (error) {
    console.error('Error en createProduct:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getProducts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query(
      `SELECT p.*, pc.name as category_name, u.symbol as unit_symbol
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN units u ON p.unit_id = u.id
       WHERE p.is_active = TRUE
       ORDER BY p.name ASC`
    );
    
    res.json({ success: true, data: products || [] });
  } catch (error) {
    console.error('Error en getProducts:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getProductById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();
    
    const [products] = await connection.query(
      `SELECT p.*, pc.name as category_name, u.symbol as unit_symbol
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN units u ON p.unit_id = u.id
       WHERE p.id = ? AND p.is_active = TRUE`,
      [id]
    );
    
    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    
    res.json({ success: true, data: products[0] });
  } catch (error) {
    console.error('Error en getProductById:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getProductByBarcode = async (req, res) => {
  let connection;
  try {
    const { barcode } = req.params;
    connection = await pool.getConnection();
    
    const [products] = await connection.query(
      `SELECT p.*, pc.name as category_name, u.symbol as unit_symbol, inv.quantity, inv.reorder_point
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN units u ON p.unit_id = u.id
       LEFT JOIN inventory inv ON p.id = inv.product_id
       WHERE p.barcode = ? AND p.is_active = TRUE`,
      [barcode]
    );
    
    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    
    res.json({ success: true, data: products[0] });
  } catch (error) {
    console.error('Error en getProductByBarcode:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateProduct = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { name, description, unit_price, barcode } = req.body;
    
    if (!name && !unit_price && !barcode) {
      return res.status(400).json({ success: false, error: 'Proporciona al menos un campo para actualizar' });
    }

    connection = await pool.getConnection();

    let updateFields = [];
    let params = [];

    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (unit_price) {
      updateFields.push('unit_price = ?');
      params.push(unit_price);
    }
    if (barcode) {
      updateFields.push('barcode = ?');
      params.push(barcode);
    }

    params.push(id);

    const [result] = await connection.query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error en updateProduct:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const deleteProduct = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();
    
    const [result] = await connection.query(
      'UPDATE products SET is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto desactivado exitosamente' });
  } catch (error) {
    console.error('Error en deleteProduct:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getCategories = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [categories] = await connection.query(
      'SELECT * FROM product_categories WHERE is_active = TRUE ORDER BY name ASC'
    );
    res.json({ success: true, data: categories || [] });
  } catch (error) {
    console.error('Error en getCategories:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getUnits = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [units] = await connection.query(
      'SELECT * FROM units ORDER BY name ASC'
    );
    res.json({ success: true, data: units || [] });
  } catch (error) {
    console.error('Error en getUnits:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};