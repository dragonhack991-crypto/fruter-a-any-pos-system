import { useState, useEffect } from 'react';
import { getSales, getTodaysSales } from '../services/api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, X } from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 Cargando datos de ventas...');
      
      // Cargar datos en paralelo
      const [todayRes, allRes] = await Promise.all([
        getTodaysSales().catch(err => {
          console.error('❌ Error en getTodaysSales:', err);
          throw err;
        }),
        getSales().catch(err => {
          console.error('❌ Error en getSales:', err);
          throw err;
        })
      ]);

      console.log('✅ Datos de hoy:', todayRes.data);
      console.log('✅ Todas las ventas:', allRes.data);

      // Extraer datos correctamente
      const todayInfo = todayRes.data.data?.summary || null;
      const salesList = allRes.data.data || [];

      setTodayData(todayInfo);
      setSales(salesList);
      
      console.log('✅ Datos cargados exitosamente');
    } catch (err) {
      console.error('❌ Error completo:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error cargando ventas';
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleRetry = () => {
    setRetrying(true);
    loadData();
  };

  if (loading && !retrying) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-4">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  // Datos para gráfico
  const groupedData = {};
  sales.forEach(sale => {
    const date = new Date(sale.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    if (!groupedData[date]) {
      groupedData[date] = { date, monto: 0, ventas: 0 };
    }
    groupedData[date].monto += parseFloat(sale.total_amount) || 0;
    groupedData[date].ventas += 1;
  });

  const chartDataGrouped = Object.values(groupedData).slice(0, 7).reverse();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">💰 Ventas</h1>

      {/* MOSTRAR ERROR SI EXISTE */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">Error al cargar ventas</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
            >
              Reintentar
            </button>
            <button onClick={() => setError('')}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* RESUMEN DE HOY */}
      {todayData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-green-100 text-sm font-medium">Ventas Hoy</h3>
            <p className="text-4xl font-bold mt-2">{todayData.totalSales}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-blue-100 text-sm font-medium">Total Hoy</h3>
            <p className="text-4xl font-bold mt-2">${parseFloat(todayData.totalAmount || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <h3 className="text-purple-100 text-sm font-medium">Promedio por Venta</h3>
            <p className="text-4xl font-bold mt-2">
              ${parseFloat(todayData.averageTicket || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* GRÁFICO */}
      {chartDataGrouped.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Gráfico de Ventas (Últimos 7 días)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataGrouped}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="monto" fill="#10b981" name="Monto ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TABLA DE VENTAS */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Últimas Ventas ({sales.length})</h2>
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            Recargar
          </button>
        </div>

        {sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">N° Venta</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Vendedor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Método</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 font-bold text-green-600">{sale.sale_number}</td>
                    <td className="px-6 py-3 text-sm">
                      {new Date(sale.created_at).toLocaleDateString('es-ES')}
                      <br />
                      <span className="text-gray-500">{new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-3">{sale.user_name || 'No especificado'}</td>
                    <td className="px-6 py-3 capitalize text-sm">{sale.payment_method}</td>
                    <td className="px-6 py-3 text-right font-bold text-lg">${parseFloat(sale.total_amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">📭 No hay ventas registradas</p>
            <p className="text-sm mt-2">Comienza a registrar ventas en el módulo de POS</p>
          </div>
        )}
      </div>
    </div>
  );
}