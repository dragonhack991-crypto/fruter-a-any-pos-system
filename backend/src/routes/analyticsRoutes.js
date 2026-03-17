import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener estadísticas generales
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📍 GET /analytics/stats');

    // Datos de ventas últimos 6 meses
    const [salesData] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as sales,
        SUM(total_amount) as revenue
      FROM sales
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
    `);

   // Productos más vendidos
    const [topProducts] = await db.query(`
      SELECT 
        p.name,
        SUM(sd.quantity) as sales,
        SUM(sd.total_price) as revenue
      FROM sale_details sd
      JOIN products p ON sd.product_id = p.id
      WHERE sd.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      GROUP BY sd.product_id, p.name
      ORDER BY sales DESC
      LIMIT 5
    `);

    // Categorías de productos
    const [productCategories] = await db.query(`
      SELECT 
        pc.name,
        SUM(sd.quantity) as quantity,
        COUNT(DISTINCT p.id) as productCount
      FROM sale_details sd
      JOIN products p ON sd.product_id = p.id
      JOIN product_categories pc ON p.category_id = pc.id
      WHERE sd.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      GROUP BY p.category_id, pc.name
      ORDER BY quantity DESC
    `);

       // Estadísticas generales del mes
    const [[monthStats]] = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(COUNT(*), 0) as totalSales,
        COALESCE(AVG(total_amount), 0) as averageOrder
      FROM sales
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);

    // Estadísticas del mes anterior para comparación
    const [[prevMonthStats]] = await db.query(`
      SELECT 
        SUM(total_amount) as totalRevenue,
        COUNT(*) as totalSales
      FROM sales
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
      AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `);

    // Calcular crecimiento
    const prevRevenue = prevMonthStats?.totalRevenue || 0;
    const currentRevenue = monthStats?.totalRevenue || 0;
    const growthRate = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : 0;

    // Preparar datos de categorías para el gráfico de pastel
    const productSales = productCategories.map((cat, index) => {
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
      return {
        name: cat.name,
        value: parseInt(cat.quantity),
        color: colors[index % colors.length]
      };
    });

    console.log('✅ Datos cargados exitosamente');
    
    res.json({
      success: true,
      data: {
        salesData: salesData.length > 0 ? salesData : [],
        topProducts: topProducts.length > 0 ? topProducts : [],
        productSales: productSales.length > 0 ? productSales : [],
        stats: {
          totalRevenue: parseFloat(monthStats?.totalRevenue) || 0,
          totalSales: parseInt(monthStats?.totalSales) || 0,
          averageOrder: parseFloat(monthStats?.averageOrder) || 0,
          growthRate: parseFloat(growthRate)
        }
      }
    });
  } catch (error) {
    console.error('❌ ERROR EN GET /analytics/stats:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener ventas por día
router.get('/daily-sales', authenticateToken, async (req, res) => {
  try {
    const [dailySales] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        COUNT(*) as sales,
        SUM(total_amount) as revenue
      FROM sales
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY created_at ASC
    `);

    res.json({ success: true, data: dailySales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener ventas por usuario
router.get('/sales-by-user', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const [userSales] = await db.query(`
      SELECT 
        u.full_name,
        COUNT(s.id) as totalSales,
        SUM(s.total_amount) as revenue,
        AVG(s.total_amount) as averageOrder
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      GROUP BY s.user_id, u.full_name
      ORDER BY revenue DESC
    `);

    res.json({ success: true, data: userSales });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener inventario bajo
router.get('/low-stock', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const [lowStock] = await db.query(`
      SELECT 
        p.id,
        p.name,
        i.quantity,
        p.min_stock,
        (p.min_stock - i.quantity) as deficit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.quantity <= p.min_stock
      ORDER BY deficit DESC
    `);

    res.json({ success: true, data: lowStock });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;