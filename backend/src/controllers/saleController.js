import db from '../config/database.js';

// Validar stock disponible
const checkStockAvailable = async (conn, items) => {
  for (const item of items) {
    const [[product]] = await conn.query(
      'SELECT quantity FROM inventory WHERE product_id = ?',
      [item.product_id]
    );
    
    if (!product || product.quantity < item.quantity) {
      throw new Error(`Stock insuficiente para producto ID ${item.product_id}. Stock disponible: ${product?.quantity || 0}`);
    }
  }
};

export const getSales = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Total de registros
    const [[countResult]] = await connection.query(
      'SELECT COUNT(*) as total FROM sales WHERE is_active = 1'
    );
    
    // Datos paginados
    const [sales] = await connection.query(
      `SELECT s.*, u.full_name as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.is_active = 1
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error en getSales:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getTodaysSales = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    const [sales] = await connection.query(
      `SELECT s.*, u.full_name as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE DATE(s.created_at) = CURDATE() AND s.is_active = 1
       ORDER BY s.created_at DESC`
    );
    
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    
    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalSales,
          totalAmount: totalAmount.toFixed(2),
          averageTicket: totalSales > 0 ? (totalAmount / totalSales).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getSaleById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await db.getConnection();
    
    const [[sale]] = await connection.query(
      `SELECT s.*, u.full_name as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.is_active = 1`,
      [id]
    );
    
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }
    
    const [items] = await connection.query(
      `SELECT si.*, p.name as product_name
       FROM sales_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const createSale = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      items,
      subtotal,
      discount = 0,
      tax,
      total_amount,
      payment_method,
      notes
    } = req.body;
    
    const userId = req.user?.id || 1;
    
    // ✅ VALIDACIÓN: Verificar stock disponible ANTES de procesar
    await checkStockAvailable(connection, items);
    
    // Generar número de venta
    const [lastSale] = await connection.query(
      'SELECT sale_number FROM sales WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    const lastNumber = lastSale.length > 0 
      ? parseInt(lastSale[0].sale_number.split('-')[1]) 
      : 0;
    const saleNumber = `SL-${(lastNumber + 1).toString().padStart(6, '0')}`;
    
    // Validar que el total coincida
    const calculatedTotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    ) - discount + tax;
    
    if (Math.abs(calculatedTotal - total_amount) > 0.01) {
      throw new Error('El total no coincide con los items');
    }
    
    // Insertar venta
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
       (sale_number, user_id, subtotal, tax, discount, total_amount, payment_method, notes, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', 1)`,
      [saleNumber, userId, subtotal, tax, discount, total_amount, payment_method, notes || '']
    );
    
    const saleId = saleResult.insertId;
    
    // Insertar items y actualizar inventario
    for (const item of items) {
      await connection.query(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
      
      // Actualizar inventario
      await connection.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Venta registrada correctamente',
      data: { saleId, saleNumber, total: total_amount }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en createSale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};

export const cancelSale = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Obtener venta
    const [[sale]] = await connection.query(
      'SELECT status FROM sales WHERE id = ?',
      [id]
    );
    
    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }
    
    if (sale.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'La venta ya fue cancelada' });
    }
    
    // Obtener items
    const [items] = await connection.query(
      'SELECT * FROM sales_items WHERE sale_id = ?',
      [id]
    );
    
    // Devolver inventario
    for (const item of items) {
      await connection.query(
        'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    // Marcar como cancelada
    await connection.query(
      'UPDATE sales SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', id]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Venta cancelada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error en cancelSale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};