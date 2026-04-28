import { useState, useEffect } from 'react';
import { getSales, getTodaysSales, getSaleById, cancelSale } from '../services/api.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, X, Eye, Trash2, CheckCircle } from 'lucide-react';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retrying, setRetrying] = useState(false);

  // Detail modal state
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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

  const handleViewDetail = async (saleId) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      const res = await getSaleById(saleId);
      setSelectedSale(res.data.data);
      setShowDetail(true);
    } catch (err) {
      console.error('❌ Error cargando detalle:', err);
      setError(err.response?.data?.error || 'Error al cargar el detalle de la venta');
    } finally {
      setDetailLoading(false);
    }
  };

  const promptCancelSale = (saleId) => {
    setCancelTargetId(saleId);
    setShowCancelConfirm(true);
  };

  const handleCancelSale = async () => {
    const saleId = cancelTargetId;
    setShowCancelConfirm(false);
    setCancelTargetId(null);

    try {
      const res = await cancelSale(saleId);
      if (res.data.success) {
        setSuccess(`Venta cancelada correctamente. N° ${res.data.data?.saleNumber || saleId}`);
        setShowDetail(false);
        loadData();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('❌ Error cancelando venta:', err);
      setError(err.response?.data?.error || 'Error al cancelar la venta');
    }
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

      {/* MOSTRAR ÉXITO */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} />
            <p className="font-semibold">{success}</p>
          </div>
          <button onClick={() => setSuccess('')}><X size={20} /></button>
        </div>
      )}

      {/* MOSTRAR ERROR SI EXISTE */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">Error</p>
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
                  <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Total</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Acciones</th>
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
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-lg">${parseFloat(sale.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(sale.id)}
                          disabled={detailLoading}
                          className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50"
                          title="Ver detalle"
                        >
                          <Eye size={15} />
                        </button>
                        {sale.status === 'completed' && (
                          <button
                            onClick={() => promptCancelSale(sale.id)}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition"
                            title="Cancelar venta"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
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

      {/* MODAL DETALLE DE VENTA */}
      {showDetail && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-gray-800">
                  Detalle de Venta · {selectedSale.sale_number}
                </h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={22} />
                </button>
              </div>

              {detailError && (
                <p className="text-red-600 text-sm mb-4">{detailError}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div>
                  <p className="text-gray-500">Fecha:</p>
                  <p className="font-semibold">
                    {new Date(selectedSale.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Vendedor:</p>
                  <p className="font-semibold">{selectedSale.user_name || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Método de Pago:</p>
                  <p className="font-semibold capitalize">{selectedSale.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Estado:</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    selectedSale.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSale.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </div>
              </div>

              {selectedSale.items && selectedSale.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Producto</th>
                        <th className="px-4 py-2 text-center font-semibold">Cantidad</th>
                        <th className="px-4 py-2 text-right font-semibold">Precio</th>
                        <th className="px-4 py-2 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">{item.product_name || item.name}</td>
                          <td className="px-4 py-2 text-center">{parseFloat(item.quantity)}</td>
                          <td className="px-4 py-2 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            ${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5 mb-5">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${parseFloat(selectedSale.subtotal || 0).toFixed(2)}</span>
                </div>
                {parseFloat(selectedSale.tax || 0) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Impuestos:</span>
                    <span>${parseFloat(selectedSale.tax || 0).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedSale.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-${parseFloat(selectedSale.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">${parseFloat(selectedSale.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetail(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
                >
                  Cerrar
                </button>
                {selectedSale.status === 'completed' && (
                  <button
                    onClick={() => { setShowDetail(false); promptCancelSale(selectedSale.id); }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition"
                  >
                    Cancelar Venta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CONFIRMACIÓN CANCELAR VENTA */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">¿Cancelar Venta?</h3>
            <p className="text-gray-600 text-sm mb-5">
              Esta acción cancelará la venta y devolverá el stock al inventario. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelTargetId(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancelSale}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}