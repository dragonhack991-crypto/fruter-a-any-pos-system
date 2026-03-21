import { useState, useEffect } from 'react';
import {
  getAdjustmentHistory,
  createInventoryAdjustment,
  getProducts
} from '../services/api.js';
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Check,
  X,
  Eye,
  TrendingDown
} from 'lucide-react';

export default function InventoryAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal de creación
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity_change: '',
    reason: 'ajuste_fisico',
    notes: ''
  });

  // Modal de detalle
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);

  const reasons = [
    { value: 'merma', label: '📉 Merma (pérdida natural)' },
    { value: 'ajuste_fisico', label: '📊 Ajuste Físico (conteo)' },
    { value: 'robo', label: '⚠️ Robo/Pérdida' },
    { value: 'danado', label: '💥 Dañado' },
    { value: 'devolucion', label: '↩️ Devolución' },
    { value: 'otro', label: '❓ Otro' }
  ];

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [adjustmentsRes, productsRes] = await Promise.all([
        getAdjustmentHistory(page, 10, {
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        getProducts()
      ]);

      setAdjustments(adjustmentsRes.data.data || []);
      setTotalPages(adjustmentsRes.data.pagination?.pages || 1);
      setProducts(productsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity_change' ? parseFloat(value) || '' : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (!formData.product_id || !formData.quantity_change || !formData.reason) {
        setError('Completa todos los campos requeridos');
        return;
      }

      if (formData.quantity_change === 0) {
        setError('La cantidad debe ser diferente de 0');
        return;
      }

      await createInventoryAdjustment(formData);
      setSuccess('Ajuste de inventario creado ✓');
      
      setShowForm(false);
      setFormData({
        product_id: '',
        quantity_change: '',
        reason: 'ajuste_fisico',
        notes: ''
      });

      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creando ajuste');
      console.error(err);
    }
  };

  const handleFilter = async () => {
    setPage(1);
    await loadData();
  };

  const filteredAdjustments = adjustments.filter(adj => {
    const matchSearch = 
      (adj.product_name && adj.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (adj.barcode && adj.barcode.includes(searchTerm));
    const matchReason = !selectedReason || adj.reason === selectedReason;
    return matchSearch && matchReason;
  });

  const getReasonLabel = (reason) => {
    const item = reasons.find(r => r.value === reason);
    return item ? item.label : reason;
  };

  const getReasonColor = (reason) => {
    const colors = {
      'merma': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'ajuste_fisico': 'bg-blue-50 text-blue-700 border-blue-200',
      'robo': 'bg-red-50 text-red-700 border-red-200',
      'danado': 'bg-orange-50 text-orange-700 border-orange-200',
      'devolucion': 'bg-green-50 text-green-700 border-green-200',
      'otro': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colors[reason] || colors['otro'];
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando ajustes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Ajustes de Inventario</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setFormData({
              product_id: '',
              quantity_change: '',
              reason: 'ajuste_fisico',
              notes: ''
            });
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          <Plus size={20} /> Nuevo Ajuste
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Nuevo Ajuste</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Producto *
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cantidad (+ o -) *
                </label>
                <input
                  type="number"
                  name="quantity_change"
                  value={formData.quantity_change}
                  onChange={handleInputChange}
                  step="0.01"
                  placeholder="Ej: 5 o -3"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Positivo = suma, Negativo = resta</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Razón *
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {reasons.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Detalles adicionales..."
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
                >
                  Crear Ajuste
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔍 Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las razones</option>
            {reasons.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleFilter}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            <Filter size={20} /> Aplicar Filtros
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedReason('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Ajustes ({filteredAdjustments.length})
          </h2>
        </div>

        {filteredAdjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Producto</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Cantidad</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Razón</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Usuario</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((adj, idx) => (
                  <tr key={adj.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{adj.product_name}</p>
                        <p className="text-xs text-gray-500">{adj.barcode}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold text-sm ${
                        adj.quantity_change > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getReasonColor(adj.reason)}`}>
                        {getReasonLabel(adj.reason).split(' ')[0]}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {adj.user_name}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(adj.created_at).toLocaleDateString('es-ES')}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedAdjustment(adj)}
                        className="p-2 hover:bg-blue-100 rounded text-blue-600"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <TrendingDown size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hay ajustes que coincidan con los filtros</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-gray-600 font-semibold">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {selectedAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Detalle del Ajuste</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Producto</p>
                <p className="text-lg font-semibold text-gray-900">{selectedAdjustment.product_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Cantidad</p>
                <p className={`text-2xl font-bold ${
                  selectedAdjustment.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedAdjustment.quantity_change > 0 ? '+' : ''}{selectedAdjustment.quantity_change}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Razón</p>
                <p className="text-lg font-semibold">{getReasonLabel(selectedAdjustment.reason)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Usuario</p>
                <p className="text-lg font-semibold text-gray-900">{selectedAdjustment.user_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(selectedAdjustment.created_at).toLocaleString('es-ES')}
                </p>
              </div>

              {selectedAdjustment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notas</p>
                  <p className="text-gray-900">{selectedAdjustment.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAdjustment(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}