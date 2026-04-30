import { useEffect, useState } from 'react';
import { getDashboardData, scheduleProviderVisit, deleteProviderVisit, getProviders } from '../services/api.js';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState({
    provider_id: '',
    visit_date: '',
    products_expected: '',
    notes: ''
  });

  useEffect(() => {
    loadDashboard();
    loadProviders();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboardData();
      setDashboardData(res.data.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const res = await getProviders();
      setProviders(res.data.data || []);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  };

  const handleScheduleVisit = async () => {
    if (!formData.provider_id || !formData.visit_date) {
      alert('Proveedor y fecha son requeridos');
      return;
    }
    try {
      const res = await scheduleProviderVisit({
        provider_id: parseInt(formData.provider_id),
        visit_date: formData.visit_date,
        products_expected: formData.products_expected
          ? formData.products_expected.split(',').map(p => p.trim())
          : [],
        notes: formData.notes
      });
      if (res.data.success) {
        setFormData({ provider_id: '', visit_date: '', products_expected: '', notes: '' });
        setShowScheduleForm(false);
        loadDashboard();
      }
    } catch (err) {
      console.error('Error programando visita:', err);
      alert('Error al programar visita');
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm('¿Eliminar esta visita?')) return;
    try {
      await deleteProviderVisit(visitId);
      loadDashboard();
    } catch (err) {
      console.error('Error eliminando visita:', err);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="p-6 text-center text-gray-600">
        <div className="animate-spin inline-block rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <p className="p-6 text-red-600">Error cargando datos del dashboard</p>;
  }

  const salesToday = dashboardData.salesToday || { total: 0, num_ventas: 0 };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Ventas Hoy</p>
          <p className="text-3xl font-bold text-green-600">${parseFloat(salesToday.total || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{salesToday.num_ventas} transacciones</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Total Productos</p>
          <p className="text-3xl font-bold text-blue-600">{dashboardData.totalProducts}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm font-medium">Inventario Bajo</p>
          <p className="text-3xl font-bold text-red-600">{dashboardData.lowInventory.length}</p>
          <p className="text-xs text-gray-500 mt-1">productos con &lt; 5 unidades</p>
        </div>
      </div>

      {/* INVENTARIO BAJO */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ Inventario Bajo (&lt; 5 unidades)</h2>
        {dashboardData.lowInventory.length === 0 ? (
          <p className="text-gray-500">✅ Todo el inventario está en buen nivel</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Producto</th>
                  <th className="px-4 py-2 text-center">Cantidad</th>
                  <th className="px-4 py-2 text-right">Precio Unit.</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.lowInventory.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold">{item.name}</td>
                    <td className="px-4 py-2 text-center text-red-600 font-bold">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">${parseFloat(item.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TOP 5 PRODUCTOS */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 5 Productos Más Vendidos (últimos 30 días)</h2>
        {dashboardData.topProducts.length === 0 ? (
          <p className="text-gray-500">Sin ventas registradas en los últimos 30 días</p>
        ) : (
          <div className="space-y-3">
            {dashboardData.topProducts.map((item, idx) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">#{idx + 1} {item.name}</p>
                  <p className="text-sm text-gray-600">{item.total_vendido} unidades vendidas</p>
                </div>
                <p className="font-bold text-green-600">${parseFloat(item.ingresos || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VISITAS DE PROVEEDORES */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">📅 Visitas de Proveedores (Próximos 7 días)</h2>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          >
            + Programar Visita
          </button>
        </div>

        {showScheduleForm && (
          <div className="mb-6 p-4 bg-gray-50 border rounded-lg space-y-3">
            <select
              value={formData.provider_id}
              onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona proveedor</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={formData.visit_date}
              onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="Productos esperados (ej: Manzana, Naranja, Limón)"
              value={formData.products_expected}
              onChange={(e) => setFormData({ ...formData, products_expected: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
            />

            <div className="flex gap-2">
              <button
                onClick={handleScheduleVisit}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {dashboardData.providerVisits.length === 0 ? (
          <p className="text-gray-500">Sin visitas programadas para los próximos 7 días</p>
        ) : (
          <div className="space-y-3">
            {dashboardData.providerVisits.map(visit => {
              const visitDate = new Date(visit.visit_date);
              const today = new Date();
              const isToday = visitDate.toDateString() === today.toDateString();
              let expectedProducts = [];
              try {
                expectedProducts = visit.products_expected ? JSON.parse(visit.products_expected) : [];
              } catch {
                expectedProducts = [];
              }
              return (
                <div key={visit.id} className={`p-4 border rounded-lg hover:bg-gray-50 ${isToday ? 'border-orange-400 bg-orange-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{visit.provider_name}</p>
                      <p className="text-sm text-gray-600">
                        📅 {visitDate.toLocaleDateString('es-ES')}
                        {isToday && <span className="ml-2 text-orange-600 font-bold">⏰ HOY</span>}
                      </p>
                      {expectedProducts.length > 0 && (
                        <p className="text-sm text-blue-600 mt-1">
                          📦 Productos: {expectedProducts.join(', ')}
                        </p>
                      )}
                      {visit.notes && (
                        <p className="text-sm text-gray-700 mt-1">📝 {visit.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {visit.phone && `☎️ ${visit.phone}`}
                        {visit.email && ` | 📧 ${visit.email}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteVisit(visit.id)}
                      className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
                      title="Eliminar visita"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}