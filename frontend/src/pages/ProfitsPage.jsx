import { useState, useEffect } from 'react';
import { getDailyProfit, getProfitRange } from '../services/api.js';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ProfitsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para vista de día
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyProfit, setDailyProfit] = useState(null);
  
  // Estados para vista de período
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodProfits, setPeriodProfits] = useState([]);
  const [periodSummary, setPeriodSummary] = useState(null);
  
  // Tab activo
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    loadDailyProfit();
  }, [selectedDate]);

  const loadDailyProfit = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await getDailyProfit(selectedDate);
      setDailyProfit(res.data.data || {});
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando ganancias del día');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodProfits = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!startDate || !endDate) {
        setError('Selecciona ambas fechas');
        setLoading(false);
        return;
      }

      const res = await getProfitRange(startDate, endDate);
      const data = res.data.data || [];
      
      setPeriodProfits(data);
      
      // Calcular totales
      if (data.length > 0) {
        const summary = {
          total_sales: data.reduce((sum, d) => sum + (parseFloat(d.total_sales) || 0), 0),
          total_costs: data.reduce((sum, d) => sum + (parseFloat(d.total_costs) || 0), 0),
          total_profit: data.reduce((sum, d) => sum + (parseFloat(d.net_profit) || 0), 0),
          total_iva: data.reduce((sum, d) => sum + (parseFloat(d.total_iva) || 0), 0),
          total_ieps: data.reduce((sum, d) => sum + (parseFloat(d.total_ieps) || 0), 0),
          days: data.length
        };
        setPeriodSummary(summary);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando ganancias del período');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    if (date.toISOString().split('T')[0] <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  if (loading && !dailyProfit && !periodProfits.length) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando ganancias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">💰 Ganancias y Análisis</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'daily'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📅 Día
        </button>
        <button
          onClick={() => setActiveTab('period')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'period'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Período
        </button>
      </div>

      {/* TAB: GANANCIAS DEL DÍA */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Selector de Fecha */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Seleccionar Fecha</h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handlePreviousDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={24} />
              </button>
              
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              
              <button
                onClick={handleNextDay}
                disabled={selectedDate === new Date().toISOString().split('T')[0]}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              >
                <ChevronRight size={24} />
              </button>

              <span className="ml-auto text-sm text-gray-500">
                {new Date(selectedDate).toLocaleDateString('es-ES', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {dailyProfit && Object.keys(dailyProfit).length > 0 ? (
            <div className="space-y-6">
              {/* Resumen Principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total de Ventas */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Ventas</p>
                      <p className="text-4xl font-bold mt-2">
                        ${parseFloat(dailyProfit.total_sales || 0).toFixed(2)}
                      </p>
                    </div>
                    <DollarSign size={40} className="opacity-50" />
                  </div>
                </div>

                {/* Total Costos */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Total Costos</p>
                      <p className="text-4xl font-bold mt-2">
                        ${parseFloat(dailyProfit.total_costs || 0).toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp size={40} className="opacity-50 transform rotate-180" />
                  </div>
                </div>

                {/* Ganancia Neta */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Ganancia Neta</p>
                      <p className="text-4xl font-bold mt-2">
                        ${parseFloat(dailyProfit.net_profit || 0).toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp size={40} className="opacity-50" />
                  </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Impuestos */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Impuestos</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-semibold text-gray-700">IVA (16%)</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${parseFloat(dailyProfit.total_iva || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="font-semibold text-gray-700">IEPS</span>
                      <span className="text-lg font-bold text-orange-600">
                        ${parseFloat(dailyProfit.total_ieps || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                      <span className="font-semibold text-gray-700">Total Impuestos</span>
                      <span className="text-lg font-bold text-gray-900">
                        ${(parseFloat(dailyProfit.total_iva || 0) + parseFloat(dailyProfit.total_ieps || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Métricas</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Número de Ventas</span>
                      <span className="text-lg font-bold text-blue-600">
                        {dailyProfit.total_transactions || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Ticket Promedio</span>
                      <span className="text-lg font-bold text-green-600">
                        ${(
                          parseFloat(dailyProfit.total_sales || 0) / 
                          (dailyProfit.total_transactions || 1)
                        ).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Margen de Ganancia</span>
                      <span className="text-lg font-bold text-purple-600">
                        {(
                          (parseFloat(dailyProfit.net_profit || 0) / 
                          parseFloat(dailyProfit.total_sales || 1)) * 100
                        ).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">No hay datos de ganancias para esta fecha</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: GANANCIAS POR PERÍODO */}
      {activeTab === 'period' && (
        <div className="space-y-6">
          {/* Selector de Período */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Seleccionar Período</h2>
            
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={loadPeriodProfits}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold whitespace-nowrap"
              >
                Buscar
              </button>
            </div>
          </div>

          {periodSummary && periodProfits.length > 0 ? (
            <div className="space-y-6">
              {/* Resumen del Período */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                  <p className="text-blue-100 text-sm font-medium">Total Ventas</p>
                  <p className="text-3xl font-bold mt-2">
                    ${periodSummary.total_sales.toFixed(2)}
                  </p>
                  <p className="text-blue-100 text-xs mt-2">{periodSummary.days} días</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                  <p className="text-orange-100 text-sm font-medium">Total Costos</p>
                  <p className="text-3xl font-bold mt-2">
                    ${periodSummary.total_costs.toFixed(2)}
                  </p>
                  <p className="text-orange-100 text-xs mt-2">Promedio: ${(periodSummary.total_costs / periodSummary.days).toFixed(2)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                  <p className="text-green-100 text-sm font-medium">Ganancia Total</p>
                  <p className="text-3xl font-bold mt-2">
                    ${periodSummary.total_profit.toFixed(2)}
                  </p>
                  <p className="text-green-100 text-xs mt-2">Promedio: ${(periodSummary.total_profit / periodSummary.days).toFixed(2)}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                  <p className="text-purple-100 text-sm font-medium">Total Impuestos</p>
                  <p className="text-3xl font-bold mt-2">
                    ${(periodSummary.total_iva + periodSummary.total_ieps).toFixed(2)}
                  </p>
                  <p className="text-purple-100 text-xs mt-2">IVA + IEPS</p>
                </div>
              </div>

              {/* Tabla de Días */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-xl font-bold text-gray-800">Detalle por Día</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">Ventas</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">Costos</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">Ganancia</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">Margen</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">IVA</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold">IEPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodProfits.map((day, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 font-semibold">
                            {new Date(day.profit_date).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 text-right text-blue-600 font-semibold">
                            ${parseFloat(day.total_sales || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-orange-600 font-semibold">
                            ${parseFloat(day.total_costs || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-green-600 font-semibold">
                            ${parseFloat(day.net_profit || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-purple-600 font-semibold">
                            {(
                              (parseFloat(day.net_profit || 0) / 
                              parseFloat(day.total_sales || 1)) * 100
                            ).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            ${parseFloat(day.total_iva || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            ${parseFloat(day.total_ieps || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : startDate && endDate ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">No hay datos para el período seleccionado</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}