import db from '../config/database.js';

// Obtener todas las ventas con paginación
export const getSales = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    console.log('📊 Obteniendo ventas - Página:', page, 'Limit:', limit);
    
    // Consulta mejorada con LEFT JOIN para obtener nombre del usuario
    const [sales] = await connection.query(
      `SELECT 
        s.id,
        s.sale_number,
        s.subtotal,
        s.tax,
        s.discount,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.status,
        s.created_at,
        COALESCE(u.full_name, 'Usuario Desconocido') as user_name,
        u.id as user_id
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Obtener total de registros
    const [[countResult]] = await connection.query(
      'SELECT COUNT(*) as total FROM sales'
    );

    console.log('✅ Ventas obtenidas:', sales.length);

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
    console.error('❌ Error en getSales:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.code
    });
  } finally {
    if (connection) await connection.release();
  }
};

// Obtener ventas de hoy con resumen
export const getTodaysSales = async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    console.log('📅 Obteniendo ventas de hoy...');

    // Obtener todas las ventas del día actual
    const [sales] = await connection.query(
      `SELECT 
        s.id,
        s.sale_number,
        s.subtotal,
        s.tax,
        s.discount,
        s.total_amount,
        s.payment_method,
        s.status,
        s.created_at,
        COALESCE(u.full_name, 'Usuario Desconocido') as user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE DATE(s.created_at) = CURDATE()
       ORDER BY s.created_at DESC`
    );

    console.log('✅ Ventas de hoy encontradas:', sales.length);

    // Calcular resumen
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, s) => {
      const amount = parseFloat(s.total_amount) || 0;
      return sum + amount;
    }, 0);
    
    const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    console.log('📊 Resumen - Total:', totalAmount, 'Cantidad:', totalSales, 'Promedio:', averageTicket);

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalSales,
          totalAmount: totalAmount.toFixed(2),
          averageTicket: averageTicket.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en getTodaysSales:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.code
    });
  } finally {
    if (connection) await connection.release();
  }
};

// Obtener detalle de una venta
export const getSaleById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    console.log('🔍 Buscando venta ID:', id);

    connection = await db.getConnection();

    // Obtener venta
    const [[sale]] = await connection.query(
      `SELECT 
        s.*,
        COALESCE(u.full_name, 'Usuario Desconocido') as user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (!sale) {
      return res.status(404).json({ 
        success: false, 
        error: 'Venta no encontrada' 
      });
    }

    // Obtener items de la venta
    const [items] = await connection.query(
      `SELECT 
        si.*,
        p.name as product_name,
        p.barcode
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
    console.error('❌ Error en getSaleById:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    if (connection) await connection.release();
  }
};

// Crear nueva venta
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

    console.log('💰 Creando nueva venta...', {
      itemsCount: items.length,
      subtotal,
      tax,
      discount,
      total_amount,
      payment_method
    });

    const userId = req.user?.id || 1;

    // Validar que hay items
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'La venta debe tener al menos un item' 
      });
    }

    // Verificar stock disponible
    for (const item of items) {
      const [[product]] = await connection.query(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [item.product_id]
      );
      
      if (!product || product.quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente para producto ID ${item.product_id}. Disponible: ${product?.quantity || 0}`
        });
      }
    }

    // Generar número de venta
    const [lastSale] = await connection.query(
      'SELECT sale_number FROM sales ORDER BY id DESC LIMIT 1'
    );
    
    const lastNumber = lastSale.length > 0 
      ? parseInt(lastSale[0].sale_number.split('-')[1]) 
      : 0;
    const saleNumber = `SL-${(lastNumber + 1).toString().padStart(6, '0')}`;

    // Validar total
    const calculatedTotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    ) - discount + tax;
    
    if (Math.abs(calculatedTotal - total_amount) > 0.01) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'El total no coincide con los items'
      });
    }

    // Insertar venta
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
       (sale_number, user_id, subtotal, tax, discount, total_amount, payment_method, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [saleNumber, userId, subtotal, tax, discount, total_amount, payment_method, notes || '']
    );

    const saleId = saleResult.insertId;
    console.log('✅ Venta creada con ID:', saleId, 'Número:', saleNumber);

    // Insertar items y actualizar inventario
    for (const item of items) {
      const itemSubtotal = item.quantity * item.unit_price;
      
      await connection.query(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.unit_price, itemSubtotal]
      );

      // Actualizar inventario
      await connection.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );

      console.log('📦 Item insertado - Producto:', item.product_id, 'Cantidad:', item.quantity);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Venta registrada correctamente',
      data: { saleId, saleNumber, total: total_amount }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en createSale:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Cancelar venta
export const cancelSale = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    console.log('🚫 Cancelando venta ID:', id);

    // Obtener venta
    const [[sale]] = await connection.query(
      'SELECT status FROM sales WHERE id = ?',
      [id]
    );

    if (!sale) {
      return res.status(404).json({ 
        success: false, 
        error: 'Venta no encontrada' 
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        error: 'La venta ya fue cancelada' 
      });
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
      console.log('📦 Inventario restaurado - Producto:', item.product_id, 'Cantidad:', item.quantity);
    }

    // Marcar como cancelada
    await connection.query(
      'UPDATE sales SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', id]
    );

    await connection.commit();
    console.log('✅ Venta cancelada exitosamente');

    res.json({ 
      success: true, 
      message: 'Venta cancelada correctamente' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en cancelSale:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};