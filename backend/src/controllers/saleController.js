import pool from '../config/database.js';
import { calculateProductTaxes } from './taxController.js';

/**
 * GET /api/sales
 * Obtener todas las ventas con paginación
 */
export const getSales = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    console.log('📊 Obteniendo ventas - Página:', page, 'Limit:', limit);
    
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
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/sales/today
 * Obtener ventas de hoy con resumen
 */
export const getTodaysSales = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('📅 Obteniendo ventas de hoy...');

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

    console.log('📊 Resumen - Total:', totalAmount, 'Cantidad:', totalSales);

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          totalSales,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          averageTicket: parseFloat(averageTicket.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en getTodaysSales:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/sales/:id
 * Obtener detalle de una venta
 */
export const getSaleById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    console.log('🔍 Buscando venta ID:', id);

    connection = await pool.getConnection();

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
        p.barcode,
        p.is_iva,
        p.is_ieps
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

/**
 * POST /api/sales
 * Crear nueva venta con cálculo automático de impuestos
 */
export const createSale = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      items,
      subtotal,
      discount = 0,
      total_amount,
      payment_method,
      notes
    } = req.body;

    console.log('💰 Creando nueva venta...', { itemsCount: items.length });

    const userId = req.user?.id || 1;
    const cashBoxId = 1; // Obtener del request si es dinámico

    // Validaciones
    if (!items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'La venta debe tener al menos un item' 
      });
    }

    if (!payment_method) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'payment_method es requerido' 
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

    // Calcular impuestos totales por producto
    let totalIva = 0;
    let totalIeps = 0;
    const itemsWithTaxes = [];

    for (const item of items) {
      const lineSubtotal = item.quantity * item.unit_price;
      const taxes = await calculateProductTaxes(connection, item.product_id, lineSubtotal);
      
      totalIva += taxes.iva;
      totalIeps += taxes.ieps;
      
      itemsWithTaxes.push({
        ...item,
        iva_amount: taxes.iva,
        ieps_amount: taxes.ieps
      });
    }

    const totalTax = totalIva + totalIeps;

    console.log('💵 Cálculo de impuestos:', { totalIva, totalIeps, totalTax });

    // Insertar venta
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
       (sale_number, cash_box_id, user_id, subtotal, tax, discount, total_amount, payment_method, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [saleNumber, cashBoxId, userId, subtotal, totalTax, discount, total_amount, payment_method, notes || '']
    );

    const saleId = saleResult.insertId;
    console.log('✅ Venta creada con ID:', saleId, 'Número:', saleNumber);

    // Insertar items y actualizar inventario
    for (const item of itemsWithTaxes) {
      // Obtener costo unitario para trazabilidad
      const [[invData]] = await connection.query(
        'SELECT unit_cost FROM inventory WHERE product_id = ?',
        [item.product_id]
      );

      const lineSubtotal = item.quantity * item.unit_price;
      const lineCost = item.quantity * (invData?.unit_cost || 0);

      // Insertar item de venta con impuestos
      await connection.query(
        `INSERT INTO sales_items 
         (sale_id, product_id, quantity, unit_price, subtotal, iva_amount, ieps_amount, unit_cost, cost_subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId, 
          item.product_id, 
          item.quantity, 
          item.unit_price, 
          lineSubtotal, 
          item.iva_amount, 
          item.ieps_amount, 
          invData?.unit_cost || 0, 
          lineCost
        ]
      );

      // Actualizar inventario
      await connection.query(
        'UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?',
        [item.quantity, item.product_id]
      );

      console.log('📦 Item insertado - Producto:', item.product_id, 'Cantidad:', item.quantity, 'IVA:', item.iva_amount, 'IEPS:', item.ieps_amount);
    }

    await connection.commit();

    console.log('✅ Venta creada exitosamente');

    res.status(201).json({
      success: true,
      message: 'Venta registrada correctamente',
      data: { 
        saleId, 
        saleNumber, 
        subtotal: parseFloat(subtotal.toFixed(2)),
        iva: parseFloat(totalIva.toFixed(2)),
        ieps: parseFloat(totalIeps.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total_amount.toFixed(2))
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en createSale:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /api/sales/:id
 * Cancelar venta y devolver inventario
 */
export const cancelSale = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    console.log('🚫 Cancelando venta ID:', id);

    // Obtener venta
    const [[sale]] = await connection.query(
      'SELECT id, status, sale_number FROM sales WHERE id = ?',
      [id]
    );

    if (!sale) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Venta no encontrada' 
      });
    }

    if (sale.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'La venta ya fue cancelada' 
      });
    }

    // Obtener items
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM sales_items WHERE sale_id = ?',
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
      message: 'Venta cancelada correctamente',
      data: {
        saleNumber: sale.sale_number
      }
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