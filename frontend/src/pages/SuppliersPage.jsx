import { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getPurchases, getProducts } from '../services/api.js';
import { Trash2, Edit2, Plus, X, TrendingUp, Package, DollarSign, BarChart3 } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, purchasesRes, productsRes] = await Promise.all([
        getSuppliers(),
        getPurchases(),
        getProducts()
      ]);
      
      setSuppliers(suppliersRes.data.data || []);
      setPurchases(purchasesRes.data.data || []);
      setProducts(productsRes.data.data || []);
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
        await updateSupplier(editingId, formData);
        setSuccess('✅ Proveedor actualizado correctamente');
      } else {
        await createSupplier(formData);
        setSuccess('✅ Proveedor creado correctamente');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar proveedor');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      try {
        await deleteSupplier(id);
        setSuccess('✅ Proveedor eliminado correctamente');
        loadData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setEditingId(supplier.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  // Calcular estadísticas por proveedor
  const getSupplierStats = (supplierId) => {
    const supplierPurchases = purchases.filter(p => p.supplier_id === supplierId);
    
    const totalPurchases = supplierPurchases.length;
    const totalAmount = supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
    
    const products_purchased = new Set();
    supplierPurchases.forEach(p => {
      if (p.items) {
        p.items.forEach(item => {
          products_purchased.add(item.product_id);
        });
      }
    });

    const avgPrice = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    return {
      totalPurchases,
      totalAmount,
      avgPrice,
      products_purchased: products_purchased.size
    };
  };

  // Calcular ranking de proveedores por volumen
  const getSupplierRanking = () => {
    return suppliers.map(s => ({
      ...s,
      stats: getSupplierStats(s.id)
    }))
    .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount);
  };

  // Productos más comprados por proveedor
  const getProductsBySupplier = (supplierId) => {
    const supplierPurchases = purchases.filter(p => p.supplier_id === supplierId);
    const productMap = {};

    supplierPurchases.forEach(p => {
      if (p.items) {
        p.items.forEach(item => {
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = {
              id: item.product_id,
              name: item.product_name,
              quantity: 0,
              totalCost: 0,
              purchases: 0
            };
          }
          productMap[item.product_id].quantity += parseFloat(item.quantity) || 0;
          productMap[item.product_id].totalCost += (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
          productMap[item.product_id].purchases += 1;
        });
      }
    });

    return Object.values(productMap).sort((a, b) => b.totalCost - a.totalCost);
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  const ranking = getSupplierRanking();
  const topSupplier = ranking[0];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Proveedores</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setShowDetails(false);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Nuevo Proveedor
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X size={20} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <X size={20} />
          </button>
        </div>
      )}

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Proveedores</p>
              <p className="text-3xl font-bold text-gray-800">{suppliers.length}</p>
            </div>
            <Package size={32} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Compras</p>
              <p className="text-3xl font-bold text-gray-800">{purchases.length}</p>
            </div>
            <BarChart3 size={32} className="text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Gasto Total</p>
              <p className="text-3xl font-bold text-gray-800">${purchases.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0).toFixed(2)}</p>
            </div>
            <DollarSign size={32} className="text-yellow-600" />
          </div>
        </div>

        {topSupplier && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Mayor Proveedor</p>
                <p className="text-lg font-bold text-gray-800">{topSupplier.name}</p>
                <p className="text-sm text-green-600">${topSupplier.stats.totalAmount.toFixed(2)}</p>
              </div>
              <TrendingUp size={32} className="text-red-600" />
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO DE PROVEEDOR */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Editar' : 'Nuevo'} Proveedor</h2>
            <button onClick={closeForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Proveedor *</label>
              <input
                type="text"
                placeholder="Ej: Frutas del Valle"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Persona de Contacto</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
              <input
                type="tel"
                placeholder="Ej: +506 8765 4321"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                placeholder="Ej: contacto@proveedor.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
              <textarea
                placeholder="Ej: Calle Principal 123, Ciudad"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="2"
              />
            </div>

            <button 
              type="submit" 
              className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition text-lg"
            >
              {editingId ? '✏️ Actualizar' : '➕ Crear'} Proveedor
            </button>
          </form>
        </div>
      )}

      {/* RANKING DE PROVEEDORES */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">📊 Ranking de Proveedores por Volumen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Posición</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Proveedor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Compras</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Total Gasto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Precio Promedio</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Productos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((supplier, idx) => (
                <tr key={supplier.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-semibold">{supplier.name}</td>
                  <td className="px-6 py-3">{supplier.stats.totalPurchases}</td>
                  <td className="px-6 py-3 font-bold text-green-600">${supplier.stats.totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-3">${supplier.stats.avgPrice.toFixed(2)}</td>
                  <td className="px-6 py-3">{supplier.stats.products_purchased}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-100 px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">🏢 Gestión de Proveedores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Contacto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Teléfono</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Compras</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(supplier => {
                const stats = getSupplierStats(supplier.id);
                return (
                  <tr key={supplier.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{supplier.name}</td>
                    <td className="px-6 py-3">{supplier.contact_person || '-'}</td>
                    <td className="px-6 py-3 text-sm">{supplier.phone || '-'}</td>
                    <td className="px-6 py-3 text-sm text-blue-600">{supplier.email || '-'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {stats.totalPurchases}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setShowDetails(!showDetails && selectedSupplier?.id === supplier.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 inline-block"
                        title="Ver detalles"
                      >
                        <BarChart3 size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-yellow-600 hover:text-yellow-800 inline-block"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="text-red-600 hover:text-red-800 inline-block"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {suppliers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay proveedores registrados
            </div>
          )}
        </div>
      </div>

      {/* DETALLES DEL PROVEEDOR */}
      {showDetails && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Detalles: {selectedSupplier.name}</h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Información del Proveedor */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">📋 Información de Contacto</h4>
                <p className="text-sm"><strong>Contacto:</strong> {selectedSupplier.contact_person || 'N/A'}</p>
                <p className="text-sm"><strong>Teléfono:</strong> {selectedSupplier.phone || 'N/A'}</p>
                <p className="text-sm"><strong>Email:</strong> {selectedSupplier.email || 'N/A'}</p>
                <p className="text-sm"><strong>Dirección:</strong> {selectedSupplier.address || 'N/A'}</p>
              </div>

              {/* Productos Más Comprados */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3">📦 Productos Más Comprados</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-3 py-2 text-left">Producto</th>
                        <th className="border px-3 py-2 text-right">Cantidad</th>
                        <th className="border px-3 py-2 text-right">Costo Total</th>
                        <th className="border px-3 py-2 text-right">Compras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getProductsBySupplier(selectedSupplier.id).map((prod, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="border px-3 py-2">{prod.name}</td>
                          <td className="border px-3 py-2 text-right">{prod.quantity.toFixed(2)}</td>
                          <td className="border px-3 py-2 text-right font-bold text-green-600">${prod.totalCost.toFixed(2)}</td>
                          <td className="border px-3 py-2 text-right">{prod.purchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}