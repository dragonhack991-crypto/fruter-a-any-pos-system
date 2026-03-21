import pool from '../config/database.js';

/**
 * GET /api/inventory/adjustments
 * Obtener historial de ajustes (solo admin)
 */
export const getAdjustmentHistory = async (req, res) => {
  let connection;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { product_id, reason, user_id, startDate, endDate } = req.query;

    console.log('📋 Obteniendo historial de ajustes...');

    connection = await pool.getConnection();

    let whereClause = '1=1';
    let params = [];

    if (product_id) {
      whereClause += ' AND ia.product_id = ?';
      params.push(product_id);
    }
    if (reason) {
      whereClause += ' AND ia.reason = ?';
      params.push(reason);
    }
    if (user_id) {
      whereClause += ' AND ia.user_id = ?';
      params.push(user_id);
    }
    if (startDate) {
      whereClause += ' AND DATE(ia.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(ia.created_at) <= ?';
      params.push(endDate);
    }

    // Obtener total
    const [[countResult]] = await connection.query(
      `SELECT COUNT(*) as total FROM inventory_adjustments ia WHERE ${whereClause}`,
      params
    );

    // Obtener datos con paginación
    const [adjustments] = await connection.query(
      `SELECT 
        ia.id,
        ia.product_id,
        p.name as product_name,
        p.barcode,
        ia.quantity_change,
        ia.reason,
        ia.notes,
        ia.user_id,
        u.full_name as user_name,
        ia.created_at,
        ia.updated_at
       FROM inventory_adjustments ia
       JOIN products p ON ia.product_id = p.id
       JOIN users u ON ia.user_id = u.id
       WHERE ${whereClause}
       ORDER BY ia.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: adjustments,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error en getAdjustmentHistory:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * POST /api/inventory/adjustments
 * Crear ajuste de inventario (solo admin)
 */
export const createAdjustment = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { product_id, quantity_change, reason, notes } = req.body;
    const user_id = req.user.id;

    console.log('📝 Creando ajuste de inventario:', {
      product_id,
      quantity_change,
      reason
    });

    // Validaciones
    if (!product_id || !quantity_change || !reason) {
      return res.status(400).json({
        success: false,
        error: 'product_id, quantity_change y reason son requeridos'
      });
    }

    if (isNaN(quantity_change) || quantity_change === 0) {
      return res.status(400).json({
        success: false,
        error: 'quantity_change debe ser un número diferente de 0'
      });
    }

    const validReasons = ['merma', 'ajuste_fisico', 'robo', 'danado', 'devolucion', 'otro'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `reason debe ser uno de: ${validReasons.join(', ')}`
      });
    }

    // Verificar que el producto existe
    const [[product]] = await connection.query(
      'SELECT id, name FROM products WHERE id = ?',
      [product_id]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Crear registro de ajuste
    const [adjResult] = await connection.query(
      `INSERT INTO inventory_adjustments 
       (product_id, quantity_change, reason, notes, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [product_id, quantity_change, reason, notes || '', user_id]
    );

    // Actualizar inventario
    const [invResult] = await connection.query(
      'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
      [quantity_change, product_id]
    );

    // Obtener cantidad actual
    const [[currentInv]] = await connection.query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [product_id]
    );

    await connection.commit();

    console.log('✅ Ajuste creado exitosamente');

    res.status(201).json({
      success: true,
      message: 'Ajuste de inventario creado',
      data: {
        adjustment_id: adjResult.insertId,
        product_id,
        product_name: product.name,
        quantity_change,
        new_quantity: currentInv.quantity,
        reason
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en createAdjustment:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/inventory/adjustments/:id
 * Obtener detalle de un ajuste
 */
export const getAdjustmentById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();

    const [[adjustment]] = await connection.query(
      `SELECT 
        ia.id,
        ia.product_id,
        p.name as product_name,
        p.barcode,
        ia.quantity_change,
        ia.reason,
        ia.notes,
        ia.user_id,
        u.full_name as user_name,
        ia.created_at,
        ia.updated_at
       FROM inventory_adjustments ia
       JOIN products p ON ia.product_id = p.id
       JOIN users u ON ia.user_id = u.id
       WHERE ia.id = ?`,
      [id]
    );

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        error: 'Ajuste no encontrado'
      });
    }

    res.json({
      success: true,
      data: adjustment
    });
  } catch (error) {
    console.error('❌ Error en getAdjustmentById:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/inventory/current
 * Obtener inventario actual con valores
 */
export const getCurrentInventory = async (req, res) => {
  let connection;
  try {
    const { categoryId, searchTerm } = req.query;

    console.log('📦 Obteniendo inventario actual...');

    connection = await pool.getConnection();

    let whereClause = 'p.is_active = 1';
    let params = [];

    if (categoryId) {
      whereClause += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (searchTerm) {
      whereClause += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${searchTerm}%`);
      params.push(`%${searchTerm}%`);
    }

    const [inventory] = await connection.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.barcode,
        p.unit_price,
        pc.name as category_name,
        u.symbol as unit_symbol,
        inv.quantity,
        inv.unit_cost,
        inv.reorder_point,
        inv.last_unit_cost,
        inv.last_purchase_date,
        (inv.quantity * inv.unit_cost) as valor_adquisicion,
        (inv.quantity * p.unit_price) as valor_venta,
        ((inv.quantity * p.unit_price) - (inv.quantity * inv.unit_cost)) as ganancia_potencial,
        p.is_iva,
        p.is_ieps,
        p.ieps_rate,
        CASE 
          WHEN inv.quantity <= inv.reorder_point THEN 'bajo'
          WHEN inv.quantity <= (inv.reorder_point * 1.5) THEN 'medio'
          ELSE 'normal'
        END as stock_level
       FROM products p
       JOIN product_categories pc ON p.category_id = pc.id
       JOIN units u ON p.unit_id = u.id
       JOIN inventory inv ON p.id = inv.product_id
       WHERE ${whereClause}
       ORDER BY p.name ASC`,
      params
    );

    // Calcular totales
    let totalAcquisicion = 0;
    let totalVenta = 0;

    inventory.forEach(item => {
      totalAcquisicion += parseFloat(item.valor_adquisicion) || 0;
      totalVenta += parseFloat(item.valor_venta) || 0;
    });

    res.json({
      success: true,
      data: inventory,
      totals: {
        valor_adquisicion_total: parseFloat(totalAcquisicion.toFixed(2)),
        valor_venta_total: parseFloat(totalVenta.toFixed(2)),
        ganancia_potencial: parseFloat((totalVenta - totalAcquisicion).toFixed(2))
      }
    });
  } catch (error) {
    console.error('❌ Error en getCurrentInventory:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};