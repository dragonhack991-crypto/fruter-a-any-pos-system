import { useState, useEffect, useRef } from 'react';
import { getProducts, createSale } from '../services/api.js';
import { Trash2, Plus, Minus, ShoppingCart, Printer, CheckCircle, X, CreditCard, Banknote, Building2, DollarSign } from 'lucide-react';

// IDs de unidades que requieren cantidad decimal
const WEIGHT_UNITS = [1, 4, 5]; // kg, lb, gr

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: Banknote, activeClass: 'border-green-500 bg-green-50 text-green-700', iconClass: 'text-green-600' },
  { id: 'transfer', label: 'Transferencia', icon: Building2, activeClass: 'border-blue-500 bg-blue-50 text-blue-700', iconClass: 'text-blue-600' },
  { id: 'credit_card', label: 'Tarjeta Crédito', icon: CreditCard, activeClass: 'border-purple-500 bg-purple-50 text-purple-700', iconClass: 'text-purple-600' },
  { id: 'debit_card', label: 'Tarjeta Débito', icon: CreditCard, activeClass: 'border-orange-500 bg-orange-50 text-orange-700', iconClass: 'text-orange-600' }
];

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState('');

  // Quantity modal for weight products
  const [quantityModal, setQuantityModal] = useState(null);
  const [tempQuantity, setTempQuantity] = useState('');

  // Payment flow
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Completed sale receipt
  const [completedSale, setCompletedSale] = useState(null);
  const receiptRef = useRef(null);

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
  const discountAmount = parseFloat(discount) || 0;
  const tax = subtotal * 0.12;
  const total = subtotal + tax - discountAmount;
  const change = paymentMethod === 'cash' && paymentDetails.amount_paid
    ? parseFloat(paymentDetails.amount_paid) - total
    : 0;

  const openPaymentModal = () => {
    if (cartItems.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    setPaymentMethod('cash');
    setPaymentDetails({});
    setShowSummary(false);
    setShowPaymentModal(true);
  };

  const handlePaymentDetailChange = (field, value) => {
    setPaymentDetails(prev => ({ ...prev, [field]: value }));
  };

  const validatePaymentDetails = () => {
    if (paymentMethod === 'cash') {
      const paid = parseFloat(paymentDetails.amount_paid);
      if (!paid || paid < total) {
        alert(`El monto recibido ($${(paymentDetails.amount_paid || 0)}) debe ser mayor o igual al total ($${total.toFixed(2)})`);
        return false;
      }
    } else if (paymentMethod === 'transfer') {
      if (!paymentDetails.reference_number?.trim()) {
        alert('Ingresa el número de referencia de la transferencia');
        return false;
      }
      if (!paymentDetails.bank_name?.trim()) {
        alert('Ingresa el nombre del banco');
        return false;
      }
    } else if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (!paymentDetails.last_4_digits || !/^\d{4}$/.test(paymentDetails.last_4_digits)) {
        alert('Ingresa los últimos 4 dígitos de la tarjeta');
        return false;
      }
      if (!paymentDetails.cardholder_name?.trim()) {
        alert('Ingresa el nombre del titular');
        return false;
      }
    }
    return true;
  };

  const proceedToSummary = () => {
    if (validatePaymentDetails()) {
      setShowSummary(true);
    }
  };

  const handleConfirmSale = async () => {
    setProcessing(true);
    try {
      const details = { ...paymentDetails };
      if (paymentMethod === 'cash') {
        details.amount_paid = parseFloat(paymentDetails.amount_paid);
        details.change = parseFloat((details.amount_paid - total).toFixed(2));
      }

      const res = await createSale({
        cash_box_id: 1,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        payment_method: paymentMethod,
        payment_details: details,
        discount: discountAmount
      });

      setCompletedSale({
        ...res.data.data,
        items: [...cartItems],
        payment_method: paymentMethod,
        payment_details: details
      });

      setCartItems([]);
      setDiscount('');
      setShowPaymentModal(false);
      loadProducts();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Comprobante de Venta</title>
      <style>
        body { font-family: monospace; font-size: 13px; margin: 20px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .row { display: flex; justify-content: space-between; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .bold { font-weight: bold; }
        .center { text-align: center; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const getPaymentLabel = (method) =>
    PAYMENT_METHODS.find(m => m.id === method)?.label || method;

  if (loading) return <div className="p-6 text-center">Cargando productos...</div>;

  // Receipt screen after completed sale
  if (completedSale) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-4">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-gray-800">¡Venta Completada!</h2>
          </div>

          {/* Receipt */}
          <div ref={receiptRef} className="border rounded p-4 font-mono text-sm mb-4">
            <div className="header text-center border-b border-dashed pb-2 mb-2">
              <p className="font-bold text-lg">FRUTER-A ANY</p>
              <p>Sistema POS</p>
              <p>{new Date().toLocaleString()}</p>
            </div>
            <p className="font-bold">Venta: {completedSale.saleNumber}</p>
            <div className="divider border-t border-dashed my-2" />
            {completedSale.items.map(item => (
              <div key={item.product_id} className="row flex justify-between">
                <span>{item.product_name} x{item.quantity}{item.unit_symbol}</span>
                <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
              </div>
            ))}
            <div className="divider border-t border-dashed my-2" />
            <div className="row flex justify-between"><span>Subtotal:</span><span>${completedSale.subtotal.toFixed(2)}</span></div>
            <div className="row flex justify-between"><span>IVA 12%:</span><span>${completedSale.tax.toFixed(2)}</span></div>
            {completedSale.discount > 0 && (
              <div className="row flex justify-between text-red-600"><span>Descuento:</span><span>-${completedSale.discount.toFixed(2)}</span></div>
            )}
            <div className="row flex justify-between font-bold text-lg mt-1">
              <span>TOTAL:</span><span>${completedSale.totalAmount.toFixed(2)}</span>
            </div>
            <div className="divider border-t border-dashed my-2" />
            <p>Pago: {getPaymentLabel(completedSale.payment_method)}</p>
            {completedSale.payment_method === 'cash' && (
              <>
                <div className="row flex justify-between"><span>Recibido:</span><span>${completedSale.payment_details.amount_paid?.toFixed(2)}</span></div>
                <div className="row flex justify-between font-bold"><span>Cambio:</span><span>${completedSale.payment_details.change?.toFixed(2)}</span></div>
              </>
            )}
            {completedSale.payment_method === 'transfer' && (
              <>
                <p>Banco: {completedSale.payment_details.bank_name}</p>
                <p>Ref: {completedSale.payment_details.reference_number}</p>
              </>
            )}
            {(completedSale.payment_method === 'credit_card' || completedSale.payment_method === 'debit_card') && (
              <>
                <p>Titular: {completedSale.payment_details.cardholder_name}</p>
                <p>Tarjeta: **** **** **** {completedSale.payment_details.last_4_digits}</p>
              </>
            )}
            <div className="center text-center mt-3 text-xs">¡Gracias por su compra!</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button
              onClick={() => setCompletedSale(null)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products panel */}
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

      {/* Cart panel */}
      <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart size={20} /> Carrito
        </h2>

        {cartItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Carrito vacío</p>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.product_id} className="border rounded p-2 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm">{item.product_name}</h4>
                      <p className="text-xs text-gray-600">${item.unit_price.toFixed(2)} / {item.unit_symbol}</p>
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
                      step={isWeightUnit(item.unit_id) ? '0.01' : '1'}
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

            {/* Discount */}
            <div className="mb-3">
              <label className="text-xs text-gray-600 font-medium">Descuento ($):</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (12%):</span><span>${tax.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Descuento:</span><span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={openPaymentModal}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded mt-4 transition flex items-center justify-center gap-2"
            >
              <DollarSign size={20} /> Proceder al Pago
            </button>
          </>
        )}
      </div>

      {/* Weight quantity modal */}
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

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">
                {showSummary ? 'Resumen de Venta' : 'Método de Pago'}
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              {!showSummary ? (
                <>
                  {/* Payment method selector */}
                  <p className="text-sm text-gray-600 mb-3 font-medium">Selecciona el método de pago:</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {PAYMENT_METHODS.map(({ id, label, icon: Icon, activeClass, iconClass }) => (
                      <button
                        key={id}
                        onClick={() => { setPaymentMethod(id); setPaymentDetails({}); }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition font-medium text-sm
                          ${paymentMethod === id ? activeClass : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                      >
                        <Icon size={24} className={paymentMethod === id ? iconClass : 'text-gray-400'} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Payment details form */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                    {paymentMethod === 'cash' && (
                      <>
                        <p className="font-medium text-gray-700">Total a cobrar: <span className="text-green-600 text-lg font-bold">${total.toFixed(2)}</span></p>
                        <div>
                          <label className="text-sm text-gray-600">Monto recibido ($):</label>
                          <input
                            type="number"
                            step="0.01"
                            min={total}
                            value={paymentDetails.amount_paid || ''}
                            onChange={(e) => handlePaymentDetailChange('amount_paid', e.target.value)}
                            placeholder={total.toFixed(2)}
                            className="w-full mt-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold text-center"
                          />
                        </div>
                        {paymentDetails.amount_paid && parseFloat(paymentDetails.amount_paid) >= total && (
                          <div className="bg-green-100 rounded p-2 text-center">
                            <p className="text-sm text-gray-600">Cambio a devolver:</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${(parseFloat(paymentDetails.amount_paid) - total).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {paymentMethod === 'transfer' && (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Banco:</label>
                          <input
                            type="text"
                            value={paymentDetails.bank_name || ''}
                            onChange={(e) => handlePaymentDetailChange('bank_name', e.target.value)}
                            placeholder="Ej: Banco Pichincha"
                            className="w-full mt-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Número de referencia / comprobante:</label>
                          <input
                            type="text"
                            value={paymentDetails.reference_number || ''}
                            onChange={(e) => handlePaymentDetailChange('reference_number', e.target.value)}
                            placeholder="Ej: TRF-20260317-001"
                            className="w-full mt-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}

                    {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Nombre del titular:</label>
                          <input
                            type="text"
                            value={paymentDetails.cardholder_name || ''}
                            onChange={(e) => handlePaymentDetailChange('cardholder_name', e.target.value)}
                            placeholder="Nombre como aparece en la tarjeta"
                            className="w-full mt-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Últimos 4 dígitos:</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={paymentDetails.last_4_digits || ''}
                            onChange={(e) => handlePaymentDetailChange('last_4_digits', e.target.value.replace(/\D/g, ''))}
                            placeholder="1234"
                            className="w-full mt-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-center tracking-widest text-lg font-bold"
                          />
                        </div>
                        <p className="text-xs text-gray-500 italic">Solo se registran los últimos 4 dígitos. No se almacenan datos sensibles.</p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={proceedToSummary}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
                  >
                    Ver Resumen →
                  </button>
                </>
              ) : (
                <>
                  {/* Sale summary */}
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 mb-2">Productos:</p>
                      {cartItems.map(item => (
                        <div key={item.product_id} className="flex justify-between text-sm py-0.5">
                          <span>{item.product_name} × {item.quantity} {item.unit_symbol}</span>
                          <span className="font-medium">${(item.quantity * item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-sm"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm"><span>IVA (12%):</span><span>${tax.toFixed(2)}</span></div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-red-600"><span>Descuento:</span><span>-${discountAmount.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1">
                        <span>TOTAL:</span><span className="text-green-600">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 mb-1">Método de pago:</p>
                      <p className="font-bold">{getPaymentLabel(paymentMethod)}</p>
                      {paymentMethod === 'cash' && (
                        <>
                          <p className="text-sm">Recibido: ${parseFloat(paymentDetails.amount_paid).toFixed(2)}</p>
                          <p className="text-sm font-bold text-green-600">Cambio: ${change.toFixed(2)}</p>
                        </>
                      )}
                      {paymentMethod === 'transfer' && (
                        <>
                          <p className="text-sm">Banco: {paymentDetails.bank_name}</p>
                          <p className="text-sm">Ref: {paymentDetails.reference_number}</p>
                        </>
                      )}
                      {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
                        <>
                          <p className="text-sm">Titular: {paymentDetails.cardholder_name}</p>
                          <p className="text-sm">Tarjeta: **** **** **** {paymentDetails.last_4_digits}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setShowSummary(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded transition"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={handleConfirmSale}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded transition flex items-center justify-center gap-2"
                    >
                      {processing ? 'Procesando...' : <><CheckCircle size={20} /> Confirmar Venta</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
