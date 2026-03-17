import { useState, useEffect } from 'react';
import { getProducts, createSale } from '../services/api.js';
import { ShoppingCart, Search, Trash2, Plus, Minus, X } from 'lucide-react';

export default function PosPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts();
      setProducts(res.data.data || []);
    } catch (err) {
      setError('Error cargando productos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
      setCart([...cart]);
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        unit_price: parseFloat(product.unit_price),
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      const item = cart.find(i => i.product_id === productId);
      if (item) {
        item.quantity = newQuantity;
        setCart([...cart]);
      }
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * 0.12; // 12% IVA
  const total = taxableAmount + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    if (!paymentMethod) {
      setError('Selecciona un método de pago');
      return;
    }

    setShowPaymentForm(true);
  };

  const completePayment = async () => {
    try {
      const saleData = {
        items: cart,
        subtotal: subtotal.toFixed(2),
        discount: discount,
        tax: tax.toFixed(2),
        total_amount: total.toFixed(2),
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        notes: ''
      };

      await createSale(saleData);
      setSuccess('✅ Venta registrada correctamente');
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setPaymentDetails({});
      setShowPaymentForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta');
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando productos...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* LISTA DE PRODUCTOS */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-3xl font-bold mb-6">🛒 Sistema POS</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={20} /></button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}><X size={20} /></button>
          </div>
        )}

        {/* BÚSQUEDA */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* GRID DE PRODUCTOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
              <h3 className="font-bold text-sm mb-2">{product.name}</h3>
              <p className="text-green-600 font-bold text-lg mb-3">${parseFloat(product.unit_price).toFixed(2)}</p>
              <button
                onClick={() => addToCart(product)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 transition"
              >
                <Plus size={18} /> Agregar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARRITO Y PAGO */}
      <div className="w-96 bg-white shadow-lg flex flex-col">
        {/* CARRITO */}
        <div className="flex-1 overflow-y-auto p-6 border-b">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart size={24} />
            <h2 className="text-xl font-bold">Carrito ({cart.length})</h2>
          </div>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Carrito vacío</p>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product_id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{item.product_name}</h4>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="bg-gray-300 hover:bg-gray-400 text-white p-1 rounded"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                      className="w-12 text-center border rounded"
                    />
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="bg-green-500 hover:bg-green-600 text-white p-1 rounded"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="ml-auto font-bold">${(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RESUMEN Y PAGO */}
        <div className="p-6 space-y-4 border-t">
          {/* DESCUENTO */}
          <div>
            <label className="text-sm font-semibold">Descuento (%)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              min="0"
              max="100"
            />
          </div>

          {/* RESUMEN */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>IVA (12%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* MÉTODO DE PAGO */}
          <div>
            <label className="text-sm font-semibold">Método de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="cash">💵 Efectivo</option>
              <option value="transfer">🏦 Transferencia Bancaria</option>
              <option value="credit">💳 Tarjeta de Crédito</option>
              <option value="debit">💳 Tarjeta de Débito</option>
            </select>
          </div>

          {/* BOTÓN CHECKOUT */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
          >
            Procesar Pago
          </button>
        </div>
      </div>

      {/* MODAL DE PAGO */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Detalles de Pago</h3>
              <button onClick={() => setShowPaymentForm(false)}><X size={24} /></button>
            </div>

            {/* DETALLES POR MÉTODO DE PAGO */}
            {paymentMethod === 'cash' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Monto Pagado</label>
                  <input
                    type="number"
                    placeholder="Ej: 50.00"
                    value={paymentDetails.amount_paid || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, amount_paid: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                {paymentDetails.amount_paid && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold">Cambio: ${(paymentDetails.amount_paid - total).toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Número de Referencia</label>
                  <input
                    type="text"
                    placeholder="Ej: TRF-2024-001"
                    value={paymentDetails.reference_number || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, reference_number: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Banco</label>
                  <input
                    type="text"
                    placeholder="Ej: Banco Nacional"
                    value={paymentDetails.bank_name || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, bank_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Últimos 4 dígitos de la Tarjeta</label>
                  <input
                    type="text"
                    placeholder="Ej: 1234"
                    maxLength="4"
                    value={paymentDetails.last_4_digits || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, last_4_digits: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre del Titular</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={paymentDetails.cardholder_name || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, cardholder_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'debit' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Últimos 4 dígitos de la Tarjeta</label>
                  <input
                    type="text"
                    placeholder="Ej: 5678"
                    maxLength="4"
                    value={paymentDetails.last_4_digits || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, last_4_digits: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Nombre del Titular</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={paymentDetails.cardholder_name || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, cardholder_name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* RESUMEN FINAL */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total a Pagar:</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={completePayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}