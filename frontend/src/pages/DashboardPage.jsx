import { useEffect, useState } from 'react';
import { getTodaysSales, getAnalyticsStats } from '../services/api.js';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayAmount: 0,
    totalProducts: 0,
    monthSales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [todayRes, analyticsRes] = await Promise.allSettled([
        getTodaysSales(),
        getAnalyticsStats()
      ]);

      let todaySales = 0;
      let todayAmount = 0;
      if (todayRes.status === 'fulfilled' && todayRes.value.data.success) {
        const todayData = todayRes.value.data.data;
        todaySales = todayData.summary?.totalSales || 0;
        todayAmount = parseFloat(todayData.summary?.totalAmount || 0);
      }

      let monthSales = 0;
      let totalProducts = 0;
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data.success) {
        const analyticsData = analyticsRes.value.data.data;
        monthSales = analyticsData.stats?.totalSales || 0;
        totalProducts = analyticsData.topProducts?.length || 0;
      }

      setStats({ todaySales, todayAmount, totalProducts, monthSales });
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Ventas Hoy</h3>
          <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.todaySales}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Total Hoy</h3>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : `$${stats.todayAmount.toFixed(2)}`}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Ventas del Mes</h3>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">
            {loading ? '...' : stats.monthSales}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Top Productos</h3>
          <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">
            {loading ? '...' : stats.totalProducts}
          </p>
        </div>
      </div>

      <div className="mt-6 md:mt-8 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2">¡Bienvenido!</h2>
        <p className="text-gray-600 text-sm md:text-base">
          Sistema POS completo funcionando. Usa el menú lateral para navegar por las diferentes secciones.
        </p>
      </div>
    </div>
  );
}