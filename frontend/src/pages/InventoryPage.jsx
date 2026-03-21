import { useState, useEffect } from 'react';
import { getCurrentInventory, getCategories } from '../services/api.js';
import {
  Search,
  Filter,
  AlertCircle,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
  AlertTriangle
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, bajo, medio, normal
  
  // Totales
  const [totals, setTotals] = useState({
    valor_adquisicion_total: 0,
    valor_venta_total: 0,
    ganancia_potencial: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📦 Cargando inventario...');
      
      const [inventoryRes, categoriesRes] = await Promise.all([
        getCurrentInventory(),
        getCategories()
      ]);

      console.log('✅ Inventario cargado:', inventoryRes.data.data.length);
      
      setInventory(inventoryRes.data.data);
      setCategories(categoriesRes.data.data || []);
      
      if (inventoryRes.data.totals) {
        setTotals(inventoryRes.data.totals);
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.error || 'Error cargando inventario');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar inventario
  const filteredInventory = inventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (item.barcode && item.barcode.includes(searchTerm));
    const matchCategory = !selectedCategory || item.category_name === selectedCategory;
    const matchStock = stockFilter === 'all' ? true : item.stock_level === stockFilter;
    
    return matchSearch && matchCategory && matchStock;
  });

  // Obtener color de estado de stock
  const getStockColor = (level) => {
    switch(level) {
      case 'bajo':
        return 'text-red-600 bg-red-50';
      case 'medio':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  // Obtener icono de estado
  const getStockIcon = (level) => {
    switch(level) {
      case 'bajo':
        return <AlertTriangle size={16} />;
      case 'medio':
        return <AlertCircle size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📦 Inventario Actual</h1>

      {/* MOSTRAR ERROR SI EXISTE */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* RESUMEN DE VALORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Valor de Adquisición */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Valor Adquisición</p>
              <p className="text-3xl font-bold mt-2">
                ${parseFloat(totals.valor_adquisicion_total).toFixed(2)}
              </p>
            </div>
            <Package size={40} className="opacity-50" />
          </div>
          <p className="text-blue-100 text-xs mt-3">Costo total en almacén</p>
        </div>

        {/* Valor de Venta */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Valor de Venta</p>
              <p className="text-3xl font-bold mt-2">
                ${parseFloat(totals.valor_venta_total).toFixed(2)}
              </p>
            </div>
            <DollarSign size={40} className="opacity-50" />
          </div>
          <p className="text-green-100 text-xs mt-3">Precio de venta potencial</p>
        </div>

        {/* Ganancia Potencial */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Ganancia Potencial</p>
              <p className="text-3xl font-bold mt-2">
                ${parseFloat(totals.ganancia_potencial).toFixed(2)}
              </p>
            </div>
            <TrendingUp size={40} className="opacity-50" />
          </div>
          <p className="text-purple-100 text-xs mt-3">Sin considerar gastos</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔍 Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
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

          {/* Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          {/* Filtro de Stock */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los niveles</option>
            <option value="bajo">Stock Bajo ⚠️</option>
            <option value="medio">Stock Medio ⚡</option>
            <option value="normal">Stock Normal ✓</option>
          </select>

          {/* Botón Recargar */}
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* TABLA DE INVENTARIO */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Productos ({filteredInventory.length})
          </h2>
        </div>

        {filteredInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Producto</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Código</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Cantidad</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Costo Unit.</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Precio Venta</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Valor Adquisición</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Valor Venta</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Ganancia</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Stock</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Impuestos</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* Producto */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category_name}</p>
                      </div>
                    </td>

                    {/* Código */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.barcode || '-'}
                    </td>

                    {/* Cantidad */}
                    <td className="px-6 py-4 text-center font-semibold">
                      {parseFloat(item.quantity).toFixed(2)} {item.unit_symbol}
                    </td>

                    {/* Costo Unit. */}
                    <td className="px-6 py-4 text-right text-sm">
                      ${parseFloat(item.unit_cost).toFixed(2)}
                    </td>

                    {/* Precio Venta */}
                    <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                      ${parseFloat(item.unit_price).toFixed(2)}
                    </td>

                    {/* Valor Adquisición */}
                    <td className="px-6 py-4 text-right text-sm">
                      ${parseFloat(item.valor_adquisicion || 0).toFixed(2)}
                    </td>

                    {/* Valor Venta */}
                    <td className="px-6 py-4 text-right text-sm font-semibold">
                      ${parseFloat(item.valor_venta || 0).toFixed(2)}
                    </td>

                    {/* Ganancia */}
                    <td className="px-6 py-4 text-right text-sm font-bold text-purple-600">
                      ${parseFloat(item.ganancia_potencial || 0).toFixed(2)}
                    </td>

                    {/* Stock Level */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStockColor(item.stock_level)}`}>
                        {getStockIcon(item.stock_level)}
                        {item.stock_level === 'bajo' && 'Bajo'}
                        {item.stock_level === 'medio' && 'Medio'}
                        {item.stock_level === 'normal' && 'Normal'}
                      </span>
                    </td>

                    {/* Impuestos */}
                    <td className="px-6 py-4 text-center text-sm">
                      <div className="flex gap-1 justify-center">
                        {item.is_iva && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">IVA</span>}
                        {item.is_ieps && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">IEPS {item.ieps_rate}%</span>}
                        {!item.is_iva && !item.is_ieps && <span className="text-gray-400 text-xs">-</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hay productos que coincidan con los filtros</p>
            <p className="text-sm mt-2">Intenta cambiar los criterios de búsqueda</p>
          </div>
        )}
      </div>

      {/* INFORMACIÓN ADICIONAL */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumen de Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Resumen de Stock</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="font-semibold text-red-700">Stock Bajo</span>
              <span className="text-2xl font-bold text-red-600">
                {inventory.filter(i => i.stock_level === 'bajo').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-semibold text-yellow-700">Stock Medio</span>
              <span className="text-2xl font-bold text-yellow-600">
                {inventory.filter(i => i.stock_level === 'medio').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="font-semibold text-green-700">Stock Normal</span>
              <span className="text-2xl font-bold text-green-600">
                {inventory.filter(i => i.stock_level === 'normal').length}
              </span>
            </div>
          </div>
        </div>

        {/* Información General */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">ℹ️ Información</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total de productos:</span>
              <span className="font-semibold">{inventory.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Productos mostrados:</span>
              <span className="font-semibold">{filteredInventory.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Margen promedio:</span>
              <span className="font-semibold">
                {totals.valor_adquisicion_total > 0 
                  ? ((totals.ganancia_potencial / totals.valor_venta_total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Última actualización:</span>
              <span className="font-semibold">{new Date().toLocaleTimeString('es-ES')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}