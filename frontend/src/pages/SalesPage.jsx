import { useState, useEffect } from 'react';
import { getSales, getTodaysSales } from '../services/api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Eye } from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayRes, allRes] = await Promise.all([
        getTodaysSales(),
        getSales()
      ]);
      
      setTodayData(todayRes.data.data.summary);
      setSales(allRes.data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  // Datos para gráfico
  const chartData = sales.slice(0, 7).map((sale, i) => ({
    date: new Date(sale.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    monto: parseFloat(sale.total_amount) || 0,
    ventas: 1
  }));

  // Agrupar por fecha
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Ventas</h1>

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
              ${(todayData.totalSales > 0 ? parseFloat(todayData.totalAmount || 0) / todayData.totalSales : 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gráfico de Ventas (Últimos 7 días)</h2>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Últimas Ventas ({sales.length})</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">N° Venta</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Vendedor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Método</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Subtotal</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">IVA</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-bold text-green-600">{sale.sale_number}</td>
                <td className="px-6 py-3 text-sm">{new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}</td>
                <td className="px-6 py-3">{sale.user_name}</td>
                <td className="px-6 py-3 capitalize text-sm">{sale.payment_method}</td>
                <td className="px-6 py-3">${parseFloat(sale.subtotal || 0).toFixed(2)}</td>
                <td className="px-6 py-3">${parseFloat(sale.tax || 0).toFixed(2)}</td>
                <td className="px-6 py-3 text-right font-bold text-lg">${parseFloat(sale.total_amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay ventas registradas
          </div>
        )}
      </div>
    </div>
  );
}