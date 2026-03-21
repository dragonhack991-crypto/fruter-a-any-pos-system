import pool from '../config/database.js';

/**
 * GET /api/taxes/settings
 * Obtener configuración global de impuestos
 */
export const getTaxSettings = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('📊 Obteniendo configuración de impuestos...');
    
    const [settings] = await connection.query(
      `SELECT 
        id,
        iva_rate,
        ieps_rate,
        apply_iva_by_default,
        apply_ieps_by_default,
        updated_at,
        updated_by
       FROM tax_settings LIMIT 1`
    );

    if (!settings || settings.length === 0) {
      console.log('⚠️ Creando configuración por defecto...');
      
      // Crear configuración por defecto si no existe
      const [[appSettings]] = await connection.query(
        'SELECT tax_rate FROM app_settings LIMIT 1'
      );
      
      const defaultRate = appSettings?.tax_rate || 12;
      
      await connection.query(
        `INSERT INTO tax_settings (iva_rate, ieps_rate, apply_iva_by_default, apply_ieps_by_default)
         VALUES (?, ?, ?, ?)`,
        [defaultRate, 0, true, false]
      );
      
      return res.json({
        success: true,
        data: {
          id: 1,
          iva_rate: defaultRate,
          ieps_rate: 0,
          apply_iva_by_default: true,
          apply_ieps_by_default: false
        }
      });
    }

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    console.error('❌ Error en getTaxSettings:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * PUT /api/taxes/settings
 * Actualizar configuración global de impuestos (solo admin)
 */
export const updateTaxSettings = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { iva_rate, ieps_rate, apply_iva_by_default, apply_ieps_by_default } = req.body;

    console.log('📝 Actualizando configuración de impuestos:', {
      iva_rate,
      ieps_rate,
      apply_iva_by_default,
      apply_ieps_by_default
    });

    // Validaciones
    if (iva_rate < 0 || iva_rate > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'IVA debe estar entre 0 y 100' 
      });
    }

    if (ieps_rate < 0 || ieps_rate > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'IEPS debe estar entre 0 y 100' 
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE tax_settings 
       SET iva_rate = ?, 
           ieps_rate = ?, 
           apply_iva_by_default = ?, 
           apply_ieps_by_default = ?,
           updated_by = ?
       WHERE id = 1`,
      [iva_rate, ieps_rate, apply_iva_by_default ? 1 : 0, apply_ieps_by_default ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      // Si no existe, crear
      await connection.query(
        `INSERT INTO tax_settings (iva_rate, ieps_rate, apply_iva_by_default, apply_ieps_by_default, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        [iva_rate, ieps_rate, apply_iva_by_default ? 1 : 0, apply_ieps_by_default ? 1 : 0, userId]
      );
    }

    console.log('✅ Configuración de impuestos actualizada');

    res.json({
      success: true,
      message: 'Configuración de impuestos actualizada',
      data: {
        iva_rate,
        ieps_rate,
        apply_iva_by_default,
        apply_ieps_by_default
      }
    });
  } catch (error) {
    console.error('❌ Error en updateTaxSettings:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * Función auxiliar para calcular impuestos de un producto
 * Retorna: { iva, ieps, total }
 */
export const calculateProductTaxes = async (connection, productId, subtotal) => {
  try {
    // Obtener datos del producto
    const [[product]] = await connection.query(
      `SELECT is_iva, is_ieps, ieps_rate FROM products WHERE id = ?`,
      [productId]
    );

    if (!product) {
      throw new Error(`Producto ${productId} no encontrado`);
    }

    // Obtener configuración de impuestos
    const [[taxSettings]] = await connection.query(
      'SELECT iva_rate, ieps_rate FROM tax_settings ORDER BY id DESC LIMIT 1'
    );

    let iva = 0;
    let ieps = 0;

    // Calcular IVA
    if (product.is_iva && taxSettings) {
      iva = subtotal * (taxSettings.iva_rate / 100);
    }

    // Calcular IEPS (se aplica DESPUÉS del IVA)
    if (product.is_ieps) {
      const iepsRate = product.ieps_rate || (taxSettings?.ieps_rate || 0);
      ieps = (subtotal + iva) * (iepsRate / 100);
    }

    return {
      iva: parseFloat(iva.toFixed(2)),
      ieps: parseFloat(ieps.toFixed(2)),
      total: parseFloat((subtotal + iva + ieps).toFixed(2))
    };
  } catch (error) {
    console.error('❌ Error en calculateProductTaxes:', error);
    throw error;
  }
};

/**
 * GET /api/taxes/daily-profit/:date
 * Obtener ganancia del día
 */
export const getDailyProfit = async (req, res) => {
  let connection;
  try {
    const { date } = req.params; // Formato: YYYY-MM-DD
    
    console.log('💰 Obteniendo ganancias del día:', date);
    
    connection = await pool.getConnection();

    const [[profit]] = await connection.query(
      `SELECT 
        date_record,
        total_sales,
        total_cost,
        total_iva_collected,
        total_ieps_collected,
        net_profit,
        total_items_sold,
        transactions_count
       FROM daily_profit
       WHERE date_record = ?`,
      [date]
    );

    if (!profit) {
      return res.json({
        success: true,
        data: {
          date_record: date,
          total_sales: 0,
          total_cost: 0,
          total_iva_collected: 0,
          total_ieps_collected: 0,
          net_profit: 0,
          total_items_sold: 0,
          transactions_count: 0
        }
      });
    }

    res.json({
      success: true,
      data: profit
    });
  } catch (error) {
    console.error('❌ Error en getDailyProfit:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/taxes/profit-range
 * Obtener ganancias en un rango de fechas
 */
export const getProfitRange = async (req, res) => {
  let connection;
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren startDate y endDate (YYYY-MM-DD)'
      });
    }

    console.log('📊 Obteniendo ganancias rango:', startDate, 'a', endDate);

    connection = await pool.getConnection();

    const [profits] = await connection.query(
      `SELECT 
        date_record,
        total_sales,
        total_cost,
        total_iva_collected,
        total_ieps_collected,
        net_profit,
        total_items_sold,
        transactions_count
       FROM daily_profit
       WHERE date_record BETWEEN ? AND ?
       ORDER BY date_record DESC`,
      [startDate, endDate]
    );

    // Calcular totales
    const totals = {
      total_sales: 0,
      total_cost: 0,
      total_iva: 0,
      total_ieps: 0,
      net_profit: 0,
      items_sold: 0,
      transactions: 0
    };

    profits.forEach(profit => {
      totals.total_sales += parseFloat(profit.total_sales) || 0;
      totals.total_cost += parseFloat(profit.total_cost) || 0;
      totals.total_iva += parseFloat(profit.total_iva_collected) || 0;
      totals.total_ieps += parseFloat(profit.total_ieps_collected) || 0;
      totals.net_profit += parseFloat(profit.net_profit) || 0;
      totals.items_sold += profit.total_items_sold || 0;
      totals.transactions += profit.transactions_count || 0;
    });

    res.json({
      success: true,
      data: {
        profits,
        totals
      }
    });
  } catch (error) {
    console.error('❌ Error en getProfitRange:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};