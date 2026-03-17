import db from '../config/database.js';

export const getSales = async (req, res) => {
  try {
    const [sales] = await db.query('SELECT * FROM sales ORDER BY created_at DESC');
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTodaysSales = async (req, res) => {
  try {
    const [sales] = await db.query(
      "SELECT * FROM sales WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC"
    );
    
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    
    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalSales,
          totalAmount: totalAmount.toFixed(2)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [sales] = await db.query('SELECT * FROM sales WHERE id = ?', [id]);
    
    if (sales.length === 0) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }
    
    const [items] = await db.query(
      'SELECT * FROM sales_items WHERE sale_id = ?',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...sales[0],
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSale = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      items,
      subtotal,
      discount,
      tax,
      total_amount,
      payment_method,
      payment_details,
      notes
    } = req.body;
    
    const userId = req.user?.id || 1;
    const cashBoxId = 1;
    
    // Generar número de venta
    const [lastSale] = await connection.query(
      'SELECT sale_number FROM sales ORDER BY id DESC LIMIT 1'
    );
    const lastNumber = lastSale.length > 0 
      ? parseInt(lastSale[0].sale_number.split('-')[1]) 
      : 0;
    const saleNumber = `SL-${lastNumber + 1}`;
    
    // Insertar venta
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
       (sale_number, cash_box_id, user_id, subtotal, tax, discount, total_amount, payment_method, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [saleNumber, cashBoxId, userId, subtotal, tax, discount, total_amount, payment_method, notes || '']
    );
    
    const saleId = saleResult.insertId;
    
    // Insertar items y actualizar inventario
    for (const item of items) {
      await connection.query(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
      
      // Actualizar inventario (restar cantidad)
      await connection.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Venta registrada correctamente',
      data: { saleId, saleNumber, total: total_amount }
    });
  } catch (error) {
    await connection.rollback();
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
    
    // Obtener items de la venta
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
    
    // Marcar venta como cancelada
    await connection.query(
      'UPDATE sales SET status = ? WHERE id = ?',
      ['cancelled', id]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Venta cancelada correctamente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
};