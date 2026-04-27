import { useState, useEffect } from 'react';
import { getProducts, getCategories, getUnits, createProduct, updateProduct, deleteProduct } from '../services/api.js';
import { Trash2, Edit2, Plus, X, Scale, Package } from 'lucide-react';

const SALE_TYPES = [
  { value: 'unidad', label: 'Unidad (pz)' },
  { value: 'kilogramo', label: 'Kilogramo (kg)' },
  { value: 'gramo', label: 'Gramo (gr)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' }
];

const SALE_TYPE_LABELS = {
  unidad: 'Unidad',
  kilogramo: 'Kilogramo',
  gramo: 'Gramo',
  litro: 'Litro',
  ml: 'Mililitro'
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: 1,
    unit_id: 1,
    barcode: '',
    unit_price: 0,
    unit_cost: 0,
    sale_type: 'unidad',
    has_tax: true,
    is_iva: true,
    is_ieps: false,
    is_perishable: false
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
      sale_type: product.sale_type || 'unidad',
      has_tax: product.has_tax !== undefined ? Boolean(product.has_tax) : true,
      is_iva: product.is_iva !== undefined ? Boolean(product.is_iva) : true,
      is_ieps: product.is_ieps !== undefined ? Boolean(product.is_ieps) : false,
      is_perishable: product.is_perishable ? 1 : 0
    });
    setEditingId(product.id);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category_id: categories[0]?.id || 1,
      unit_id: units[0]?.id || 1,
      barcode: '',
      unit_price: 0,
      unit_cost: 0,
      sale_type: 'unidad',
      has_tax: true,
      is_iva: true,
      is_ieps: false,
      is_perishable: false
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); setEditingId(null); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={18} /></button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}><X size={18} /></button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold text-gray-800">{editingId ? '✏️ Editar' : '➕ Crear'} Producto</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre del Producto *</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Código de Barras</label>
              <input
                type="text"
                placeholder="Ej: 123456789"
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoría *</label>
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

            {/* Unidad de Medida */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidad de Medida *</label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({...formData, unit_id: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
                ))}
              </select>
            </div>

            {/* Tipo de Venta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Scale size={14} className="inline mr-1" />
                Tipo de Venta *
              </label>
              <select
                value={formData.sale_type}
                onChange={(e) => setFormData({...formData, sale_type: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {SALE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {['kilogramo', 'gramo', 'litro', 'ml'].includes(formData.sale_type) && (
                <p className="text-xs text-blue-600 mt-1">
                  ⚖️ Al vender este producto, se pedirá la cantidad a granel.
                </p>
              )}
            </div>

            {/* Precio de Compra */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Precio de Compra (Costo)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                  className="w-full pl-7 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Precio de Venta */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Precio de Venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                  required
                  className="w-full pl-7 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripción</label>
              <textarea
                placeholder="Describe el producto..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
              />
            </div>

            {/* Checkboxes de impuestos y tipo */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_iva)}
                  onChange={(e) => setFormData({...formData, is_iva: e.target.checked})}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Aplica IVA</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_ieps)}
                  onChange={(e) => setFormData({...formData, is_ieps: e.target.checked})}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Aplica IEPS</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={Boolean(formData.has_tax)}
                  onChange={(e) => setFormData({...formData, has_tax: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Tiene Impuesto</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_perishable)}
                  onChange={(e) => setFormData({...formData, is_perishable: e.target.checked})}
                  className="w-4 h-4 text-yellow-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Perecedero</span>
              </label>
            </div>

            <button
              type="submit"
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition text-lg"
            >
              {editingId ? '✏️ Actualizar' : '➕ Crear'} Producto
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo Venta</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Costo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Precio</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Impuestos</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-400 shrink-0" />
                      <span>{product.name}</span>
                    </div>
                    {product.barcode && (
                      <p className="text-xs text-gray-400 ml-6">{product.barcode}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{product.category_name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium
                      ${['kilogramo','gramo','litro','ml'].includes(product.sale_type)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-700'}`}
                    >
                      {SALE_TYPE_LABELS[product.sale_type] || 'Unidad'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {product.unit_cost > 0 ? `$${parseFloat(product.unit_cost).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-5 py-3 font-bold text-green-600">
                    ${parseFloat(product.unit_price).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {product.is_iva ? (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">IVA</span>
                      ) : null}
                      {product.is_ieps ? (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">IEPS</span>
                      ) : null}
                      {!product.is_iva && !product.is_ieps && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Sin imp.</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 mr-3 transition"
                      title="Editar"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-700 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No hay productos registrados
          </div>
        )}
      </div>
    </div>
  );
}
