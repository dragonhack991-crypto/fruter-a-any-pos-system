import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    totalProducts: 0,
    totalUsers: 1
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Ventas Hoy</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalSales}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Hoy</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">${stats.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Productos</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Usuarios</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats.totalUsers}</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">¡Bienvenido!</h2>
        <p className="text-gray-600">
          Sistema POS completo funcionando. Usa el menú lateral para navegar por las diferentes secciones.
        </p>
      </div>
    </div>
  );
}