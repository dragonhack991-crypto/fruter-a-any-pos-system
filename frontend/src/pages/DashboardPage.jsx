import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { getDashboardStats } from '../services/api.js';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    salesHoy: 0,
    totalHoy: '0.00',
    totalProducts: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await getDashboardStats();
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Ventas Hoy</h3>
          <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.salesHoy}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Total Hoy</h3>
          <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : `$${parseFloat(stats.totalHoy).toFixed(2)}`}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Productos</h3>
          <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">
            {loading ? '...' : stats.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className="text-gray-600 text-xs md:text-sm font-medium">Usuarios</h3>
          <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">
            {loading ? '...' : stats.totalUsers}
          </p>
        </div>
      </div>

      <div className="mt-6 md:mt-8 bg-white rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2">¡Bienvenido{user?.full_name ? `, ${user.full_name}` : ''}!</h2>
        <p className="text-gray-600 text-sm md:text-base">
          Sistema POS completo funcionando. Usa el menú lateral para navegar por las diferentes secciones.
        </p>
      </div>
    </div>
  );
}