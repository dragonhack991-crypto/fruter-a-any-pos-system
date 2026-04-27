import pool from '../config/database.js';

export const createProduct = async (req, res) => {
  let connection;
  try {
    const {
      name, description, category_id, unit_id, barcode,
      is_perishable, shelf_life_days, unit_price,
      sale_type, unit_cost, has_tax
    } = req.body;

    if (!name || !category_id || !unit_id || !unit_price) {
      return res.status(400).json({ success: false, error: 'Datos requeridos faltantes' });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO products (name, description, category_id, unit_id, barcode, is_perishable, shelf_life_days, unit_price, sale_type, unit_cost, has_tax, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, description || '', category_id, unit_id, barcode || null,
        is_perishable || false, shelf_life_days || 0, unit_price,
        sale_type || 'unidad', parseFloat(unit_cost) || 0,
        has_tax !== undefined ? has_tax : true, 1
      ]
    );

    // Crear registro en inventario
    await connection.query(
      `INSERT INTO inventory (product_id, quantity, unit_cost, reorder_point) VALUES (?, ?, ?, ?)`,
      [result.insertId, 0, parseFloat(unit_cost) || parseFloat(unit_price), 0]
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
    const { name, description, unit_price, barcode, sale_type, unit_cost, has_tax, category_id, unit_id, is_perishable } = req.body;
    
    if (!name && !unit_price && !barcode && sale_type === undefined && unit_cost === undefined && has_tax === undefined) {
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
    if (unit_price !== undefined && unit_price !== null) {
      updateFields.push('unit_price = ?');
      params.push(parseFloat(unit_price));
    }
    if (barcode !== undefined) {
      updateFields.push('barcode = ?');
      params.push(barcode || null);
    }
    if (sale_type !== undefined) {
      updateFields.push('sale_type = ?');
      params.push(sale_type);
    }
    if (unit_cost !== undefined) {
      updateFields.push('unit_cost = ?');
      params.push(parseFloat(unit_cost));
    }
    if (has_tax !== undefined) {
      updateFields.push('has_tax = ?');
      params.push(has_tax ? 1 : 0);
    }
    if (category_id !== undefined) {
      updateFields.push('category_id = ?');
      params.push(parseInt(category_id));
    }
    if (unit_id !== undefined) {
      updateFields.push('unit_id = ?');
      params.push(parseInt(unit_id));
    }
    if (is_perishable !== undefined) {
      updateFields.push('is_perishable = ?');
      params.push(is_perishable ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay campos válidos para actualizar' });
    }

    params.push(id);

    const [result] = await connection.query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    // Actualizar unit_cost en inventario si se proporcionó
    if (unit_cost !== undefined) {
      await connection.query(
        'UPDATE inventory SET unit_cost = ? WHERE product_id = ?',
        [parseFloat(unit_cost), id]
      );
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

/**
 * GET /api/products/top
 * Obtener productos con mayor rotación (últimos 30 días)
 */
export const getTopProducts = async (req, res) => {
  let connection;
  try {
    const limit = parseInt(req.query.limit) || 20;
    const category_id = req.query.category_id;

    connection = await pool.getConnection();

    let whereClause = 'WHERE p.is_active = TRUE';
    const params = [];

    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      params.push(parseInt(category_id));
    }

    // Calcular cantidad vendida en últimos 30 días en tiempo real
    const [products] = await connection.query(
      `SELECT 
         p.id,
         p.name,
         p.unit_price,
         p.sale_type,
         p.unit_cost,
         p.has_tax,
         p.is_iva,
         p.is_ieps,
         p.rotation_score,
         pc.name as category_name,
         u.symbol as unit_symbol,
         COALESCE(inv.quantity, 0) as stock,
         COALESCE((
           SELECT SUM(sd.quantity)
           FROM sale_details sd
           JOIN sales s ON sd.sale_id = s.id
           WHERE sd.product_id = p.id
             AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             AND s.status = 'completed'
         ), 0) as quantity_sold_30d
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN units u ON p.unit_id = u.id
       LEFT JOIN inventory inv ON p.id = inv.product_id
       ${whereClause}
       ORDER BY quantity_sold_30d DESC, p.name ASC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({ success: true, data: products || [] });
  } catch (error) {
    console.error('Error en getTopProducts:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};