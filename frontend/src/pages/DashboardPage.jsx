import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { getDashboardStats } from '../services/api.js';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    salesHoy: 0,
    totalHoy: 0,
    salesMes: 0,
    totalProducts: 0,
    totalUsers: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await getDashboardStats();
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch {
        // Silently fail - show zeros
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Ventas Hoy</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.salesHoy}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Hoy</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : `$${parseFloat(stats.totalHoy || 0).toFixed(2)}`}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Productos</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {loading ? '...' : stats.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Ventas del Mes</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {loading ? '...' : stats.salesMes}
          </p>
        </div>
      </div>

      {stats.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top Productos (Último Mes)</h2>
          <div className="space-y-3">
            {stats.topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800">{product.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">${parseFloat(product.total_revenue || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{product.total_qty} vendidos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">¡Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}!</h2>
        <p className="text-gray-600">
          Sistema POS completo funcionando. Usa el menú lateral para navegar por las diferentes secciones.
        </p>
      </div>
    </div>
  );
}