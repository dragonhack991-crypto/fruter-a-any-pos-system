import db from '../config/database.js';

export const getDashboardData = async (req, res) => {
  try {
    const conn = await db.getConnection();

    // 1. INVENTARIO BAJO (< 5 unidades)
    const [lowInventory] = await conn.query(`
      SELECT
        p.id,
        p.name,
        COALESCE(i.quantity, 0) as quantity,
        p.unit_price as price
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE COALESCE(i.quantity, 0) < 5 AND p.is_active = 1
      ORDER BY COALESCE(i.quantity, 0) ASC
      LIMIT 10
    `);

    // 2. TOP 5 PRODUCTOS MÁS VENDIDOS (últimos 30 días)
    const [topProducts] = await conn.query(`
      SELECT
        p.id,
        p.name,
        SUM(si.quantity) as total_vendido,
        SUM(si.quantity * si.unit_price) as ingresos
      FROM products p
      JOIN sales_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
      AND DATE(s.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY p.id, p.name
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    // 3. VISITAS DE PROVEEDORES HOY Y PRÓXIMOS 7 DÍAS
    const [providerVisits] = await conn.query(`
      SELECT
        pv.id,
        pv.visit_date,
        pv.products_expected,
        pv.notes,
        pr.name as provider_name,
        pr.phone,
        pr.email
      FROM provider_visits pv
      JOIN providers pr ON pv.provider_id = pr.id
      WHERE DATE(pv.visit_date) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY pv.visit_date ASC
    `);

    // 4. VENTAS DE HOY
    const [salesToday] = await conn.query(`
      SELECT
        COUNT(*) as num_ventas,
        COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE status = 'completed'
      AND DATE(created_at) = CURDATE()
    `);

    // 5. TOTAL DE PRODUCTOS ACTIVOS
    const [totalProducts] = await conn.query(`
      SELECT COUNT(*) as total FROM products WHERE is_active = 1
    `);

    conn.release();

    res.json({
      success: true,
      data: {
        lowInventory,
        topProducts,
        providerVisits,
        salesToday: salesToday[0],
        totalProducts: totalProducts[0].total
      }
    });
  } catch (error) {
    console.error('Error getDashboardData:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const scheduleProviderVisit = async (req, res) => {
  try {
    const { provider_id, visit_date, products_expected, notes } = req.body;
    const conn = await db.getConnection();

    if (!provider_id || !visit_date) {
      conn.release();
      return res.status(400).json({
        success: false,
        error: 'Proveedor y fecha son requeridos'
      });
    }

    const [result] = await conn.query(
      `INSERT INTO provider_visits (provider_id, visit_date, products_expected, notes)
       VALUES (?, ?, ?, ?)`,
      [provider_id, visit_date, JSON.stringify(products_expected || []), notes || '']
    );

    conn.release();

    res.json({
      success: true,
      message: 'Visita programada',
      visitId: result.insertId
    });
  } catch (error) {
    console.error('Error scheduleProviderVisit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteProviderVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await db.getConnection();

    await conn.query('DELETE FROM provider_visits WHERE id = ?', [id]);

    conn.release();

    res.json({ success: true, message: 'Visita eliminada' });
  } catch (error) {
    console.error('Error deleteProviderVisit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
