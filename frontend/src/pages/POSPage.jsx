import { useState, useEffect } from 'react';
import { getProducts, createSale } from '../services/api.js';
import { Trash2, Plus, Minus } from 'lucide-react';

// IDs de unidades que requieren cantidad decimal
const WEIGHT_UNITS = [1, 4, 5]; // kg, lb, gr

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quantityModal, setQuantityModal] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.data);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const isWeightUnit = (unitId) => WEIGHT_UNITS.includes(unitId);

  const addToCart = (product) => {
    const price = parseFloat(product.unit_price) || 0;
    
    // Si es por pieza, agregar directamente con cantidad 1
    if (!isWeightUnit(product.unit_id)) {
      const existing = cartItems.find(item => item.product_id === product.id);
      if (existing) {
        setCartItems(cartItems.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setCartItems([...cartItems, {
          product_id: product.id,
          product_name: product.name,
          unit_symbol: product.unit_symbol,
          unit_price: price,
          quantity: 1,
          unit_id: product.unit_id
        }]);
      }
    } else {
      // Si es por peso/kg, abrir modal para escribir cantidad
      setQuantityModal({
        product_id: product.id,
        product_name: product.name,
        unit_symbol: product.unit_symbol,
        unit_price: price,
        unit_id: product.unit_id
      });
      setTempQuantity('');
    }
  };

  const confirmQuantity = () => {
    const quantity = parseFloat(tempQuantity);
    if (!quantity || quantity <= 0) {
      alert('Ingresa una cantidad válida');
      return;
    }

    const existing = cartItems.find(item => item.product_id === quantityModal.product_id);
    if (existing) {
      setCartItems(cartItems.map(item =>
        item.product_id === quantityModal.product_id
          ? { ...item, quantity: parseFloat((item.quantity + quantity).toFixed(2)) }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        product_id: quantityModal.product_id,
        product_name: quantityModal.product_name,
        unit_symbol: quantityModal.unit_symbol,
        unit_price: quantityModal.unit_price,
        quantity: parseFloat(quantity.toFixed(2)),
        unit_id: quantityModal.unit_id
      }]);
    }

    setQuantityModal(null);
    setTempQuantity('');
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const numQuantity = parseFloat(quantity) || 0;
    if (numQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.product_id === productId
          ? { ...item, quantity: parseFloat(numQuantity.toFixed(2)) }
          : item
      ));
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      await createSale({
        cash_box_id: 1,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        payment_method: 'cash'
      });

      alert('Venta completada');
      setCartItems([]);
      loadProducts();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al procesar venta');
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando productos...</div>;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Punto de Venta</h1>
        
        <input
          type="text"
          placeholder="Buscar producto o código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const price = parseFloat(product.unit_price) || 0;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition"
                >
                  <h3 className="font-bold text-gray-800 text-sm">{product.name}</h3>
                  <p className="text-gray-600 text-xs">{product.category_name || 'Sin categoría'}</p>
                  <p className="text-xs text-gray-500 mt-1">{product.unit_symbol}</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">${price.toFixed(2)}</p>
                  <button 
                    onClick={() => addToCart(product)}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded mt-2 flex items-center justify-center gap-2 hover:bg-green-700"
                  >
                    <Plus size={18} /> Agregar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Carrito</h2>

        {cartItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Carrito vacío</p>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.product_id} className="border rounded p-2 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">{item.product_name}</h4>
                      <p className="text-xs text-gray-600">${item.unit_price.toFixed(2)} x {item.unit_symbol}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - (isWeightUnit(item.unit_id) ? 0.1 : 1))}
                      className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 text-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      step={isWeightUnit(item.unit_id) ? "0.01" : "1"}
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                      className="w-16 text-center border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + (isWeightUnit(item.unit_id) ? 0.1 : 1))}
                      className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 text-sm"
                    >
                      <Plus size={14} />
                    </button>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold">${(item.quantity * item.unit_price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (12%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-4 transition"
            >
              Procesar Venta
            </button>
          </>
        )}
      </div>

      {/* Modal de Cantidad */}
      {quantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{quantityModal.product_name}</h3>
            <p className="text-gray-600 mb-4">
              Precio: ${quantityModal.unit_price.toFixed(2)} por {quantityModal.unit_symbol}
            </p>
            
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ingresa la cantidad..."
              value={tempQuantity}
              onChange={(e) => setTempQuantity(e.target.value)}
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && confirmQuantity()}
              className="w-full px-4 py-2 border-2 border-green-500 rounded-lg text-center text-lg font-bold mb-4 focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={confirmQuantity}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
              >
                Agregar
              </button>
              <button
                onClick={() => setQuantityModal(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}