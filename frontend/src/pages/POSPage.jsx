import { useState, useEffect, useRef } from 'react';
import {
  getTopProducts, getProducts, createSale, getSettings,
  getActiveCashBox
} from '../services/api.js';
import { ShoppingCart, Search, Trash2, Plus, Minus, X, Star, Scale, Unlock, Lock, RefreshCw } from 'lucide-react';
import CashBoxModal from '../components/CashBoxModal.jsx';
import BulkSaleModal from '../components/BulkSaleModal.jsx';

const BULK_TYPES = ['kilogramo', 'gramo', 'litro', 'ml'];

const SALE_TYPE_BADGE = {
  kilogramo: { label: 'kg', color: 'bg-blue-100 text-blue-700' },
  gramo: { label: 'gr', color: 'bg-blue-100 text-blue-700' },
  litro: { label: 'L', color: 'bg-cyan-100 text-cyan-700' },
  ml: { label: 'ml', color: 'bg-cyan-100 text-cyan-700' },
  unidad: { label: 'pz', color: 'bg-gray-100 text-gray-600' }
};

export default function PosPage() {
  // --- Products & Cart ---
  const [topProducts, setTopProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [taxRate, setTaxRate] = useState(0.12);

  // --- Cash Box ---
  const [activeCashBox, setActiveCashBox] = useState(null);
  const [cashBoxLoading, setCashBoxLoading] = useState(true);
  const [showCashBoxModal, setShowCashBoxModal] = useState(false);
  const [cashBoxModalMode, setCashBoxModalMode] = useState('open');

  // --- Bulk Sale ---
  const [bulkProduct, setBulkProduct] = useState(null);

  // Counter for unique cart keys
  const cartKeyCounter = useRef(0);

  // Debounce search
  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchTerm]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadSettings(), loadTopProducts(), checkCashBox()]);
  };

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data.success && res.data.data.appSettings) {
        const rate = (res.data.data.appSettings.tax_rate || 12) / 100;
        setTaxRate(rate);
      }
    } catch {}
  };

  const loadTopProducts = async () => {
    try {
      setLoading(true);
      const res = await getTopProducts(20);
      setTopProducts(res.data.data || []);
    } catch (err) {
      setError('Error cargando productos');
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    if (allProducts.length > 0) return;
    try {
      const res = await getProducts();
      setAllProducts(res.data.data || []);
    } catch {}
  };

  const checkCashBox = async () => {
    try {
      setCashBoxLoading(true);
      const res = await getActiveCashBox();
      const session = res.data.data;
      setActiveCashBox(session);
      if (!session) {
        setShowCashBoxModal(true);
        setCashBoxModalMode('open');
      }
    } catch {
      setActiveCashBox(null);
    } finally {
      setCashBoxLoading(false);
    }
  };

  // Productos a mostrar: top o todos, filtrados por búsqueda
  const displayProducts = showAllProducts ? allProducts : topProducts;
  const filteredProducts = debouncedSearch
    ? displayProducts.filter(p =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : displayProducts;

  // --- Cart Actions ---
  const removeFromCart = (cartKey) => {
    setCart(prev => prev.filter(i => i.cart_key !== cartKey));
  };

  const updateQuantity = (cartKey, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartKey);
    } else {
      setCart(prev => prev.map(i => i.cart_key === cartKey ? { ...i, quantity: newQty } : i));
    }
  };

  // Normalizar cart_key al agregar producto normal
  const addNormalToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id && !BULK_TYPES.includes(i.sale_type || 'unidad'));
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const cartKey = String(product.id);
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: parseFloat(product.unit_price),
        quantity: 1,
        cart_key: cartKey,
        is_iva: product.is_iva,
        is_ieps: product.is_ieps,
        ieps_rate: parseFloat(product.ieps_rate) || 0
      }];
    });
  };

  // --- Totals ---
  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;

  // Calculate per-product taxes
  const { taxIva, taxIeps } = cart.reduce((acc, item) => {
    const itemSubtotal = item.unit_price * item.quantity;
    const taxableBase = itemSubtotal * (1 - discount / 100);
    const useIva = item.is_iva === 1 || item.is_iva === true;
    const useIeps = item.is_ieps === 1 || item.is_ieps === true;
    if (useIva) acc.taxIva += taxableBase * 0.16;
    if (useIeps) acc.taxIeps += taxableBase * ((item.ieps_rate || 0) / 100);
    return acc;
  }, { taxIva: 0, taxIeps: 0 });

  // Fallback: if no product-level tax flags, use global taxRate
  const hasPerProductTax = cart.some(i => i.is_iva !== undefined || i.is_ieps !== undefined);
  const taxableAmount = subtotal - discountAmount;
  const finalTax = hasPerProductTax ? taxIva + taxIeps : taxableAmount * taxRate;
  const tax = finalTax; // kept for payment form display
  const total = taxableAmount + finalTax;

  // --- Checkout ---
  const handleCheckout = () => {
    if (cart.length === 0) { setError('El carrito está vacío'); return; }
    if (!activeCashBox) { setError('Debes abrir una caja antes de vender'); return; }
    setShowPaymentForm(true);
  };

  const completePayment = async () => {
    try {
      const saleData = {
        items: cart,
        subtotal: subtotal.toFixed(2),
        discount,
        tax: tax.toFixed(2),
        total_amount: total.toFixed(2),
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        cash_box_session_id: activeCashBox?.session_id,
        notes: ''
      };
      await createSale(saleData);
      setSuccess('✅ Venta registrada correctamente');
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setPaymentDetails({});
      setShowPaymentForm(false);
      // Refrescar caja activa
      checkCashBox();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta');
    }
  };

  // --- Cash Box callbacks ---
  const handleCashBoxSuccess = (data) => {
    setShowCashBoxModal(false);
    checkCashBox();
    setSuccess(cashBoxModalMode === 'open' ? '✅ Caja abierta exitosamente' : '✅ Corte de caja realizado');
    setTimeout(() => setSuccess(''), 3000);
  };

  const openCashBoxModal = (mode) => {
    setCashBoxModalMode(mode);
    setShowCashBoxModal(true);
  };

  if (cashBoxLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Verificando caja...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden">

      {/* ===== MODALS ===== */}
      {showCashBoxModal && (
        <CashBoxModal
          mode={cashBoxModalMode}
          activeCashBox={activeCashBox}
          onSuccess={handleCashBoxSuccess}
          onClose={() => {
            // Solo permitir cerrar si hay caja abierta
            if (cashBoxModalMode === 'close' || activeCashBox) setShowCashBoxModal(false);
          }}
        />
      )}

      {bulkProduct && (
        <BulkSaleModal
          product={bulkProduct}
          onAdd={(item) => {
            const cartKey = `${item.product_id}_bulk_${++cartKeyCounter.current}`;
            setCart(prev => [...prev, { ...item, cart_key: cartKey }]);
          }}
          onClose={() => setBulkProduct(null)}
        />
      )}

      {/* ===== ÁREA DE PRODUCTOS (izquierda/arriba) ===== */}
      <div className="flex-1 flex flex-col overflow-hidden order-2 md:order-1">

        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">🛒 POS</h1>
            {activeCashBox ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-sm">
                <Unlock size={14} className="text-green-600" />
                <span className="text-green-700 font-medium">
                  Caja Abierta · ${parseFloat(activeCashBox.opening_amount || 0).toFixed(2)}
                </span>
              </div>
            ) : (
              <button
                onClick={() => openCashBoxModal('open')}
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
              >
                <Unlock size={14} /> Abrir Caja
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeCashBox && (
              <button
                onClick={() => openCashBoxModal('close')}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
              >
                <Lock size={14} /> Corte de Caja
              </button>
            )}
            <button
              onClick={() => { loadTopProducts(); if (showAllProducts) setShowAllProducts(false); }}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              title="Recargar productos"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="px-4 pt-2">
          {error && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between text-sm">
              <span>{error}</span>
              <button onClick={() => setError('')}><X size={16} /></button>
            </div>
          )}
          {success && (
            <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between text-sm">
              <span>{success}</span>
              <button onClick={() => setSuccess('')}><X size={16} /></button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-2 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
            />
          </div>
        </div>

        {/* Toggle top/all */}
        <div className="px-4 pb-2 flex gap-2">
          <button
            onClick={() => setShowAllProducts(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${!showAllProducts ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            <Star size={13} /> Top Vendidos
          </button>
          <button
            onClick={() => { setShowAllProducts(true); loadAllProducts(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition
              ${showAllProducts ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            Ver Todos
          </button>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Cargando productos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <Search size={32} className="mb-2 opacity-40" />
              {debouncedSearch ? `Sin resultados para "${debouncedSearch}"` : 'No hay productos disponibles'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const badge = SALE_TYPE_BADGE[product.sale_type] || SALE_TYPE_BADGE.unidad;
                const isBulk = BULK_TYPES.includes(product.sale_type);
                return (
                  <button
                    key={product.id}
                    onClick={() => isBulk ? setBulkProduct(product) : addNormalToCart(product)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 hover:border-green-300 p-3 text-left transition group"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2 flex-1">
                        {product.name}
                      </h3>
                      {isBulk && <Scale size={14} className="text-blue-500 ml-1 shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-green-600 font-bold text-base mb-2">
                      ${parseFloat(product.unit_price).toFixed(2)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-green-600 font-semibold opacity-0 group-hover:opacity-100 transition">
                        {isBulk ? 'Ingresar cantidad' : '+ Agregar'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== CARRITO (derecha/arriba en mobile) ===== */}
      <div className="w-full md:w-96 bg-white shadow-lg flex flex-col order-1 md:order-2 max-h-[50vh] md:max-h-screen border-l border-gray-200">

        {/* Cart Header */}
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <ShoppingCart size={22} className="text-gray-700" />
          <h2 className="text-lg font-bold text-gray-800">Carrito</h2>
          {cart.length > 0 && (
            <span className="ml-auto bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">Carrito vacío</p>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.cart_key} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-semibold text-sm text-gray-800 flex-1 leading-tight pr-2">{item.product_name}</h4>
                    <button onClick={() => removeFromCart(item.cart_key)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {!BULK_TYPES.includes(item.sale_type || 'unidad') ? (
                      <>
                        <button
                          onClick={() => updateQuantity(item.cart_key, item.quantity - 1)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1 rounded-md"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.cart_key, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center border rounded text-sm font-bold"
                        />
                        <button
                          onClick={() => updateQuantity(item.cart_key, item.quantity + 1)}
                          className="bg-green-500 hover:bg-green-600 text-white p-1 rounded-md"
                        >
                          <Plus size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium">{item.quantity} unidades</span>
                    )}
                    <span className="ml-auto font-bold text-sm text-gray-800">
                      ${(item.unit_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & Payment */}
        <div className="px-4 py-4 border-t space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Descuento (%)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              min="0" max="100"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento ({discount}%):</span><span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {hasPerProductTax ? (
              <>
                {taxIva > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>IVA (16%):</span><span>${taxIva.toFixed(2)}</span>
                  </div>
                )}
                {taxIeps > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>IEPS:</span>
                    <span>${taxIeps.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-gray-600">
                <span>IVA ({(taxRate * 100).toFixed(0)}%):</span><span>${tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 text-gray-800">
              <span>Total:</span><span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Método de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="cash">💵 Efectivo</option>
              <option value="transfer">🏦 Transferencia</option>
              <option value="credit">💳 Tarjeta Crédito</option>
              <option value="debit">💳 Tarjeta Débito</option>
            </select>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !activeCashBox}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition text-sm"
          >
            {!activeCashBox ? '🔒 Abre la caja primero' : 'Procesar Pago'}
          </button>
        </div>
      </div>

      {/* ===== MODAL PAGO ===== */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold">Detalles de Pago</h3>
              <button onClick={() => setShowPaymentForm(false)}><X size={22} /></button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Monto Pagado</label>
                  <input
                    type="number" placeholder="0.00"
                    value={paymentDetails.amount_paid || ''}
                    onChange={(e) => setPaymentDetails({...paymentDetails, amount_paid: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg text-lg font-bold"
                    autoFocus
                  />
                </div>
                {paymentDetails.amount_paid >= total && (
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-sm font-semibold text-blue-700">
                      Cambio: ${(paymentDetails.amount_paid - total).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="space-y-3 mb-5">
                <input type="text" placeholder="Número de referencia"
                  value={paymentDetails.reference_number || ''}
                  onChange={(e) => setPaymentDetails({...paymentDetails, reference_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input type="text" placeholder="Banco"
                  value={paymentDetails.bank_name || ''}
                  onChange={(e) => setPaymentDetails({...paymentDetails, bank_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
              <div className="space-y-3 mb-5">
                <input type="text" placeholder="Últimos 4 dígitos" maxLength="4"
                  value={paymentDetails.last_4_digits || ''}
                  onChange={(e) => setPaymentDetails({...paymentDetails, last_4_digits: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input type="text" placeholder="Nombre del titular"
                  value={paymentDetails.cardholder_name || ''}
                  onChange={(e) => setPaymentDetails({...paymentDetails, cardholder_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg mb-5 flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentForm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={completePayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition">
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
