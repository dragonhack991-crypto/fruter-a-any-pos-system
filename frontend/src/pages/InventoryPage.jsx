import { useState, useEffect } from 'react';
import { getInventory, getLowStockProducts, updateInventory } from '../services/api.js';
import { AlertTriangle, Edit2, Check, X } from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, lowRes] = await Promise.all([
        getInventory(),
        getLowStockProducts()
      ]);
      setInventory(invRes.data.data || []);
      setLowStock(lowRes.data.data || []);
    } catch (err) {
      setError('Error cargando inventario');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId) => {
    try {
      setError('');
      setSuccess('');
      await updateInventory(productId, { quantity: parseFloat(editQuantity) });
      setSuccess('Cantidad actualizada correctamente');
      setEditingId(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error actualizando inventario');
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Inventario</h1>

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

      {lowStock.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 font-bold mb-3">
            <AlertTriangle size={20} /> Stock bajo detectado
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lowStock.map(item => (
              <div key={item.id} className="text-sm text-yellow-700 bg-white p-2 rounded">
                <strong>{item.product_name}</strong>
                <br />
                Stock: {parseFloat(item.quantity).toFixed(2)} {item.unit_symbol} (Mínimo: {item.reorder_point})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Producto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Cantidad</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Unidad</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Mínimo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Costo Unitario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Total</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => {
              const quantity = parseFloat(item.quantity) || 0;
              const unitCost = parseFloat(item.unit_cost) || 0;
              const total = quantity * unitCost;
              const isLow = quantity <= item.reorder_point;

              return (
                <tr key={item.id} className={`border-t hover:bg-gray-50 ${isLow ? 'bg-yellow-50' : ''}`}>
                  <td className="px-6 py-3 font-medium">{item.product_name}</td>
                  <td className="px-6 py-3">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="px-2 py-1 border rounded w-32 focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                      />
                    ) : (
                      <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                        {quantity.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">{item.unit_symbol}</td>
                  <td className="px-6 py-3">{item.reorder_point}</td>
                  <td className="px-6 py-3">${unitCost.toFixed(2)}</td>
                  <td className="px-6 py-3 font-bold">${total.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right">
                    {editingId === item.id ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleUpdateQuantity(item.product_id)}
                          className="text-green-600 hover:text-green-800"
                          title="Guardar"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-red-600 hover:text-red-800"
                          title="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditQuantity(quantity.toFixed(2));
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {inventory.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay productos en inventario
          </div>
        )}
      </div>
    </div>
  );
}