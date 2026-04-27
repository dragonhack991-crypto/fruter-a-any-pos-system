import pool from '../config/database.js';

/**
 * POST /api/cashbox/open
 * Abrir una nueva sesión de caja
 */
export const openCashBox = async (req, res) => {
  let connection;
  try {
    const { opening_amount } = req.body;
    const user_id = req.user?.id || req.user?.userId;

    if (!opening_amount || parseFloat(opening_amount) < 0) {
      return res.status(400).json({
        success: false,
        error: 'El fondo de caja inicial debe ser mayor o igual a 0'
      });
    }

    connection = await pool.getConnection();

    // Verificar que no exista caja abierta para este usuario
    const [existing] = await connection.query(
      `SELECT id FROM cash_box_sessions WHERE user_id = ? AND status = 'open' LIMIT 1`,
      [user_id]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.',
        session_id: existing[0].id
      });
    }

    const [result] = await connection.query(
      `INSERT INTO cash_box_sessions (user_id, opening_amount, status) VALUES (?, ?, 'open')`,
      [user_id, parseFloat(opening_amount)]
    );

    console.log(`✅ Caja abierta - Usuario: ${user_id}, Sesión: ${result.insertId}, Fondo: ${opening_amount}`);

    res.status(201).json({
      success: true,
      message: 'Caja abierta exitosamente',
      data: {
        session_id: result.insertId,
        user_id,
        opening_amount: parseFloat(opening_amount),
        opening_date: new Date().toISOString(),
        status: 'open'
      }
    });
  } catch (error) {
    console.error('❌ Error en openCashBox:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * POST /api/cashbox/close
 * Cerrar la sesión de caja activa
 */
export const closeCashBox = async (req, res) => {
  let connection;
  try {
    const { closing_amount, notes } = req.body;
    const user_id = req.user?.id || req.user?.userId;

    if (closing_amount === undefined || closing_amount === null || parseFloat(closing_amount) < 0) {
      return res.status(400).json({
        success: false,
        error: 'Debes indicar el monto físico en caja al momento del cierre'
      });
    }

    connection = await pool.getConnection();

    // Obtener sesión activa
    const [sessions] = await connection.query(
      `SELECT * FROM cash_box_sessions WHERE user_id = ? AND status = 'open' ORDER BY opening_date DESC LIMIT 1`,
      [user_id]
    );

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tienes una caja abierta para cerrar'
      });
    }

    const session = sessions[0];

    // Calcular suma de ventas en efectivo durante esta sesión
    const [salesResult] = await connection.query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_sales
       FROM sales
       WHERE cash_box_session_id = ? AND status = 'completed'`,
      [session.id]
    );

    const totalSales = parseFloat(salesResult[0]?.total_sales || 0);
    const expectedAmount = parseFloat(session.opening_amount) + totalSales;
    const difference = parseFloat(closing_amount) - expectedAmount;

    // Actualizar sesión de caja
    await connection.query(
      `UPDATE cash_box_sessions 
       SET status = 'closed',
           closing_date = NOW(),
           closing_amount = ?,
           expected_amount = ?,
           difference = ?,
           notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        parseFloat(closing_amount),
        expectedAmount,
        difference,
        notes || null,
        session.id
      ]
    );

    console.log(`✅ Caja cerrada - Usuario: ${user_id}, Sesión: ${session.id}, Diferencia: ${difference}`);

    res.json({
      success: true,
      message: 'Caja cerrada exitosamente',
      data: {
        session_id: session.id,
        opening_amount: parseFloat(session.opening_amount),
        opening_date: session.opening_date,
        closing_date: new Date().toISOString(),
        total_sales: totalSales,
        expected_amount: expectedAmount,
        closing_amount: parseFloat(closing_amount),
        difference,
        notes: notes || null
      }
    });
  } catch (error) {
    console.error('❌ Error en closeCashBox:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/cashbox/active
 * Obtener la caja activa del usuario actual con resumen
 */
export const getActiveCashBox = async (req, res) => {
  let connection;
  try {
    const user_id = req.user?.id || req.user?.userId;

    connection = await pool.getConnection();

    const [sessions] = await connection.query(
      `SELECT cbs.*, u.full_name as user_name
       FROM cash_box_sessions cbs
       JOIN users u ON cbs.user_id = u.id
       WHERE cbs.user_id = ? AND cbs.status = 'open'
       ORDER BY cbs.opening_date DESC LIMIT 1`,
      [user_id]
    );

    if (!sessions || sessions.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay caja abierta'
      });
    }

    const session = sessions[0];

    // Calcular ventas de esta sesión
    const [salesResult] = await connection.query(
      `SELECT 
         COUNT(*) as transactions_count,
         COALESCE(SUM(total_amount), 0) as total_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
         COALESCE(SUM(CASE WHEN payment_method != 'cash' THEN total_amount ELSE 0 END), 0) as other_sales
       FROM sales
       WHERE cash_box_session_id = ? AND status = 'completed'`,
      [session.id]
    );

    const salesSummary = salesResult[0] || {};

    res.json({
      success: true,
      data: {
        session_id: session.id,
        user_id: session.user_id,
        user_name: session.user_name,
        opening_amount: parseFloat(session.opening_amount),
        opening_date: session.opening_date,
        status: session.status,
        summary: {
          transactions_count: parseInt(salesSummary.transactions_count || 0),
          total_sales: parseFloat(salesSummary.total_sales || 0),
          cash_sales: parseFloat(salesSummary.cash_sales || 0),
          other_sales: parseFloat(salesSummary.other_sales || 0),
          expected_amount: parseFloat(session.opening_amount) + parseFloat(salesSummary.total_sales || 0)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en getActiveCashBox:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

/**
 * GET /api/cashbox/history
 * Historial de sesiones de caja con paginación
 */
export const getCashBoxHistory = async (req, res) => {
  let connection;
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { date_from, date_to, user_id_filter } = req.query;

    connection = await pool.getConnection();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (date_from) {
      whereClause += ' AND DATE(cbs.opening_date) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      whereClause += ' AND DATE(cbs.opening_date) <= ?';
      params.push(date_to);
    }
    if (user_id_filter) {
      whereClause += ' AND cbs.user_id = ?';
      params.push(parseInt(user_id_filter));
    }

    const [sessions] = await connection.query(
      `SELECT 
         cbs.*,
         u.full_name as user_name,
         u.username,
         (SELECT COUNT(*) FROM sales s WHERE s.cash_box_session_id = cbs.id AND s.status = 'completed') as transactions_count,
         (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.cash_box_session_id = cbs.id AND s.status = 'completed') as total_sales
       FROM cash_box_sessions cbs
       JOIN users u ON cbs.user_id = u.id
       ${whereClause}
       ORDER BY cbs.opening_date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countResult]] = await connection.query(
      `SELECT COUNT(*) as total FROM cash_box_sessions cbs ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error en getCashBoxHistory:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};
