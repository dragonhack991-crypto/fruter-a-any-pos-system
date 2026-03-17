import pool from '../config/database.js';

const VALID_PAYMENT_METHODS = ['cash', 'transfer', 'credit_card', 'debit_card', 'card', 'check'];

export const createSale = async (req, res) => {
  let connection;
  try {
    const {
      cash_box_id,
      items,
      payment_method = 'cash',
      payment_details = null,
      discount = 0,
      notes = ''
    } = req.body;
    const userId = req.user?.id;

    if (!cash_box_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Datos inválidos' });
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Método de pago inválido' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Validar disponibilidad de productos en inventario
      for (const item of items) {
        const [invRows] = await connection.query(
          'SELECT quantity FROM inventory WHERE product_id = ?',
          [item.product_id]
        );
        if (!invRows || invRows.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: `Producto ID ${item.product_id} no encontrado en inventario`
          });
        }
        const available = parseFloat(invRows[0].quantity) || 0;
        if (available < item.quantity) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: `Stock insuficiente para producto ID ${item.product_id}. Disponible: ${available}`
          });
        }
      }

      // Generar número de venta
      const [lastSale] = await connection.query(
        'SELECT MAX(CAST(SUBSTRING(sale_number, 4) AS UNSIGNED)) as last_number FROM sales'
      );
      const saleNumber = `SL-${(lastSale[0]?.last_number || 0) + 1}`;

      // Calcular totales
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity * item.unit_price;
      }
      const discountAmount = parseFloat(discount) || 0;
      const tax = subtotal * 0.12;
      const totalAmount = subtotal + tax - discountAmount;

      // Crear venta con detalles de pago
      const [saleResult] = await connection.query(
        `INSERT INTO sales (sale_number, cash_box_id, user_id, subtotal, tax, discount, total_amount, payment_method, payment_details, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleNumber,
          cash_box_id,
          userId,
          subtotal,
          tax,
          discountAmount,
          totalAmount,
          payment_method,
          payment_details ? JSON.stringify(payment_details) : null,
          notes,
          'completed'
        ]
      );

      const saleId = saleResult.insertId;

      // Crear detalles de venta y actualizar inventario
      for (const item of items) {
        const total = item.quantity * item.unit_price;

        await connection.query(
          `INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.product_id, item.quantity, item.unit_price, total]
        );

        // Actualizar inventario
        await connection.query(
          `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
          [item.quantity, item.product_id]
        );

        // Registrar movimiento de inventario
        await connection.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, unit_price, total_price, reference_id, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.product_id, 'sale', item.quantity, item.unit_price, total, saleId, userId]
        );
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Venta creada exitosamente',
        data: {
          saleId,
          saleNumber,
          subtotal,
          tax,
          discount: discountAmount,
          totalAmount,
          payment_method,
          payment_details
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error en createSale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getSales = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [sales] = await connection.query(
      `SELECT s.*, u.username as user_name, cb.name as cash_box_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN cash_boxes cb ON s.cash_box_id = cb.id
       ORDER BY s.created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, data: sales || [] });
  } catch (error) {
    console.error('Error en getSales:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getSaleById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();
    
    const [sales] = await connection.query(
      `SELECT s.*, u.username as user_name, cb.name as cash_box_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN cash_boxes cb ON s.cash_box_id = cb.id
       WHERE s.id = ?`,
      [id]
    );

    if (!sales || sales.length === 0) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    const [details] = await connection.query(
      `SELECT sd.*, p.name as product_name
       FROM sale_details sd
       LEFT JOIN products p ON sd.product_id = p.id
       WHERE sd.sale_id = ?`,
      [id]
    );

    res.json({ success: true, data: { ...sales[0], details } });
  } catch (error) {
    console.error('Error en getSaleById:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const getTodaysSales = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [sales] = await connection.query(
      `SELECT s.*, u.username as user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE DATE(s.created_at) = CURDATE()
       ORDER BY s.created_at DESC`
    );

    // Calcular resumen del día
    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0),
      totalTax: sales.reduce((sum, sale) => sum + (parseFloat(sale.tax) || 0), 0),
      totalSubtotal: sales.reduce((sum, sale) => sum + (parseFloat(sale.subtotal) || 0), 0)
    };

    res.json({
      success: true,
      data: {
        summary: summary,
        sales: sales
      }
    });
  } catch (error) {
    console.error('Error en getTodaysSales:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const cancelSale = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;
    const userId = req.user?.id;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verificar que la venta existe y no está ya cancelada
      const [sales] = await connection.query(
        'SELECT * FROM sales WHERE id = ?',
        [id]
      );

      if (!sales || sales.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, error: 'Venta no encontrada' });
      }

      if (sales[0].status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'La venta ya está anulada' });
      }

      // Obtener los items de la venta para revertir inventario
      const [details] = await connection.query(
        'SELECT * FROM sale_details WHERE sale_id = ?',
        [id]
      );

      // Revertir inventario y registrar movimientos
      for (const detail of details) {
        await connection.query(
          'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
          [detail.quantity, detail.product_id]
        );

        await connection.query(
          `INSERT INTO inventory_movements (product_id, movement_type, quantity, unit_price, total_price, reference_id, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [detail.product_id, 'adjustment', detail.quantity, detail.unit_price, detail.total_price, id, userId]
        );
      }

      // Marcar venta como cancelada
      await connection.query(
        'UPDATE sales SET status = ?, notes = CONCAT(IFNULL(notes, \'\'), \' [ANULADA: \', ?, \']\') WHERE id = ?',
        ['cancelled', notes, id]
      );

      await connection.commit();

      res.json({ success: true, message: 'Venta anulada exitosamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error en cancelSale:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};