import { useState, useEffect } from 'react';
import { getProducts, getCategories, getUnits, createProduct, updateProduct, deleteProduct } from '../services/api.js';
import { Trash2, Edit2, Plus, X, AlertTriangle } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [taxWarning, setTaxWarning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: 1,
    unit_id: 1,
    barcode: '',
    unit_price: 0,
    unit_cost: 0,
    is_perishable: false,
    is_iva: true,
    is_ieps: false,
    ieps_rate: 0,
    sale_type: 'unidad'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, unitsRes] = await Promise.all([
        getProducts(),
        getCategories(),
        getUnits()
      ]);
      
      setProducts(productsRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch (err) {
      setError('Error cargando datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await updateProduct(editingId, formData);
        setSuccess('Producto actualizado correctamente');
      } else {
        await createProduct(formData);
        setSuccess('Producto creado correctamente');
      }
      setShowForm(false);
      setEditingId(null);
      setTaxWarning(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar producto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteProduct(id);
        setSuccess('Producto eliminado correctamente');
        loadData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id,
      unit_id: product.unit_id,
      barcode: product.barcode || '',
      unit_price: product.unit_price,
      unit_cost: product.unit_cost || 0,
      is_perishable: product.is_perishable ? 1 : 0,
      is_iva: product.is_iva !== undefined ? Boolean(product.is_iva) : true,
      is_ieps: product.is_ieps !== undefined ? Boolean(product.is_ieps) : false,
      ieps_rate: product.ieps_rate || 0,
      sale_type: product.sale_type || 'unidad'
    });
    setEditingId(product.id);
    setTaxWarning(false);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: 1,
      unit_id: 1,
      barcode: '',
      unit_price: 0,
      unit_cost: 0,
      is_perishable: false,
      is_iva: true,
      is_ieps: false,
      ieps_rate: 0,
      sale_type: 'unidad'
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTaxWarning(false);
    resetForm();
  };

  const handleTaxChange = (field, value) => {
    if (editingId) setTaxWarning(true);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{editingId ? 'Editar' : 'Crear'} Producto</h2>
            <button onClick={closeForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre del Producto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Producto *</label>
              <input
                type="text"
                placeholder="Ej: Manzana Roja"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Código de Barras */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Código de Barras</label>
              <input
                type="text"
                placeholder="Ej: 123456789"
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
              <textarea
                placeholder="Describe el producto aquí..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Unidad */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unidad de Medida *</label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({...formData, unit_id: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>

            {/* Tipo de venta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Venta</label>
              <select
                value={formData.sale_type}
                onChange={(e) => setFormData({...formData, sale_type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="unidad">Por unidad / pieza</option>
                <option value="kilogramo">Por kilogramo</option>
                <option value="gramo">Por gramo</option>
                <option value="litro">Por litro</option>
                <option value="ml">Por mililitro</option>
              </select>
            </div>

            {/* Producto Perecedero */}
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_perishable}
                  onChange={(e) => setFormData({...formData, is_perishable: e.target.checked})}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-sm font-semibold text-gray-700">¿Es un producto perecedero?</span>
              </label>
            </div>

            {/* Precio Unitario */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Precio de Venta *</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                  required
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Precio de Compra */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Precio de Compra</label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Impuestos */}
            <div className="md:col-span-2 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">⚖️ Configuración de Impuestos</h3>

              {taxWarning && (
                <div className="mb-3 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                  <AlertTriangle size={16} />
                  <span>⚠️ Cambiar impuestos afectará únicamente las ventas futuras</span>
                </div>
              )}

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_iva}
                    onChange={(e) => handleTaxChange('is_iva', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Aplica IVA</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_ieps}
                    onChange={(e) => handleTaxChange('is_ieps', e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Aplica IEPS</span>
                </label>

                {formData.is_ieps && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Tasa IEPS (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.ieps_rate}
                      onChange={(e) => handleTaxChange('ieps_rate', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>

              {!formData.is_iva && !formData.is_ieps && (
                <p className="mt-2 text-sm text-gray-500">ℹ️ Este producto está exento de impuestos</p>
              )}
            </div>

            {/* Botón Enviar */}
            <button 
              type="submit" 
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition text-lg"
            >
              {editingId ? '✏️ Actualizar' : '➕ Crear'} Producto
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Categoría</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Precio</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Código</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tipo</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">IVA</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">IEPS</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-sm">{product.category_name}</td>
                <td className="px-4 py-3 font-bold text-green-600">${parseFloat(product.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{product.barcode || '-'}</td>
                <td className="px-4 py-3">
                  {product.is_perishable ? (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Perecedero</span>
                  ) : (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">No perecedero</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {product.is_iva ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✓ IVA</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">Exento</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {product.is_ieps ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">✓ {product.ieps_rate || 0}%</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay productos registrados
          </div>
        )}
      </div>
    </div>
  );
}
