import { useState, useEffect, useRef } from 'react';
import { getPurchases, createPurchase, deletePurchase, getSuppliers, getProducts } from '../services/api.js';
import { Trash2, Plus, X, ChevronDown, Search, QrCode } from 'lucide-react';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([
    { id: 1, name: 'Kilogramo', symbol: 'kg' },
    { id: 2, name: 'Pieza', symbol: 'pz' },
    { id: 3, name: 'Caja', symbol: 'caja' },
    { id: 4, name: 'Libra', symbol: 'lb' },
    { id: 5, name: 'Gramo', symbol: 'gr' }
  ]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [scannerInput, setScannerInput] = useState('');
  const [showScannerMode, setShowScannerMode] = useState(false);
  const scannerRef = useRef(null);
  
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', product_name: '', barcode: '', unit_id: 1, quantity: '', unit_cost: '' }],
    notes: ''
  });

  const [productSearch, setProductSearch] = useState({});
  const [showProductSuggestions, setShowProductSuggestions] = useState({});
  const [showNewProductForm, setShowNewProductForm] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  // Enfocar el scanner automáticamente
  useEffect(() => {
    if (showScannerMode && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [showScannerMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        getPurchases(),
        getSuppliers(),
        getProducts()
      ]);
      
      setPurchases(purchasesRes.data.data || []);
      setSuppliers(suppliersRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } catch (err) {
      setError('Error cargando datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar lectura de código de barras
  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter' && scannerInput.trim()) {
      e.preventDefault();
      processBarcodeScanned(scannerInput.trim());
      setScannerInput('');
    }
  };

  // Procesar código de barras escaneado
  const processBarcodeScanned = (barcode) => {
    const foundProduct = products.find(p => p.barcode === barcode);

    if (!foundProduct) {
      setError(`⚠️ Producto con código ${barcode} no encontrado`);
      return;
    }

    // Buscar si el producto ya existe en los items
    const existingItemIndex = purchaseForm.items.findIndex(
      item => item.product_id === foundProduct.id
    );

    if (existingItemIndex !== -1) {
      // Si existe, incrementar cantidad
      const newItems = [...purchaseForm.items];
      newItems[existingItemIndex].quantity = (
        parseFloat(newItems[existingItemIndex].quantity) || 0
      ) + 1;
      setPurchaseForm({ ...purchaseForm, items: newItems });
      setSuccess(`✅ ${foundProduct.name}: cantidad incrementada`);
    } else {
      // Si no existe, agregarlo
      const newItem = {
        product_id: foundProduct.id,
        product_name: foundProduct.name,
        barcode: foundProduct.barcode,
        unit_id: foundProduct.unit_id || 1,
        quantity: '1',
        unit_cost: foundProduct.unit_cost || ''
      };
      setPurchaseForm({
        ...purchaseForm,
        items: [...purchaseForm.items, newItem]
      });
      setSuccess(`✅ ${foundProduct.name} agregado a la compra`);
    }

    // Auto-enfoque al scanner
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  };

  const handleAddItem = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { product_id: '', product_name: '', barcode: '', unit_id: 1, quantity: '', unit_cost: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    setPurchaseForm({
      ...purchaseForm,
      items: purchaseForm.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...purchaseForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  const handleProductSearch = (index, searchTerm) => {
    handleItemChange(index, 'product_name', searchTerm);
    setProductSearch({ ...productSearch, [index]: searchTerm });
    setShowProductSuggestions({ ...showProductSuggestions, [index]: true });
  };

  const selectProduct = (index, product) => {
    handleItemChange(index, 'product_id', product.id);
    handleItemChange(index, 'product_name', product.name);
    handleItemChange(index, 'barcode', product.barcode || '');
    handleItemChange(index, 'unit_id', product.unit_id || 1);
    setShowProductSuggestions({ ...showProductSuggestions, [index]: false });
    setProductSearch({ ...productSearch, [index]: '' });
  };

  const createNewProduct = async (index) => {
    const item = purchaseForm.items[index];
    if (!item.product_name || !item.barcode) {
      setError('Ingresa nombre del producto y código de barras');
      return;
    }

    try {
      const newProduct = {
        id: Math.max(...products.map(p => p.id), 0) + 1,
        name: item.product_name,
        barcode: item.barcode,
        unit_symbol: units.find(u => u.id === parseInt(item.unit_id))?.symbol || 'pz',
        category_id: 1,
        unit_id: parseInt(item.unit_id)
      };
      
      setProducts([...products, newProduct]);
      selectProduct(index, newProduct);
      setShowNewProductForm({ ...showNewProductForm, [index]: false });
      setSuccess(`✅ Producto "${item.product_name}" creado`);
    } catch (err) {
      setError('Error al crear producto');
    }
  };

  const getFilteredProducts = (searchTerm) => {
    if (!searchTerm) return products.slice(0, 5);
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
    ).slice(0, 5);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!purchaseForm.supplier_id) {
      setError('⚠️ Debe seleccionar un proveedor');
      return;
    }

    const validItems = purchaseForm.items.filter(item => 
      item.product_id && parseFloat(item.quantity) > 0 && parseFloat(item.unit_cost) > 0
    );

    if (validItems.length === 0) {
      setError('⚠️ Debe agregar al menos un producto a la compra');
      return;
    }

    try {
      const dataToSend = {
        supplier_id: parseInt(purchaseForm.supplier_id),
        purchase_date: purchaseForm.purchase_date,
        items: validItems.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseFloat(item.quantity),
          unit_cost: parseFloat(item.unit_cost)
        })),
        notes: purchaseForm.notes,
        expected_delivery_date: null
      };

      console.log('📤 Enviando COMPRA:', dataToSend);
      await createPurchase(dataToSend);
      setSuccess('✅ Compra registrada correctamente');
      setShowForm(false);
      resetPurchaseForm();
      loadData();
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.error || 'Error al guardar compra');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta compra?')) {
      try {
        await deletePurchase(id);
        setSuccess('✅ Compra eliminada correctamente');
        loadData();
      } catch (err) {
        setError(err.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseForm({
      supplier_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      items: [{ product_id: '', product_name: '', barcode: '', unit_id: 1, quantity: '', unit_cost: '' }],
      notes: ''
    });
    setProductSearch({});
    setShowProductSuggestions({});
    setShowNewProductForm({});
    setScannerInput('');
    setShowScannerMode(false);
  };

  const closePurchaseForm = () => {
    setShowForm(false);
    resetPurchaseForm();
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando...</div>;

  const totalAmount = purchaseForm.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unit_cost) || 0;
    return sum + (qty * cost);
  }, 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Compras</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Nueva Compra
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

      {/* FORMULARIO DE COMPRA */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Nueva Compra</h2>
            <button onClick={closePurchaseForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitPurchase} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor *</label>
                <select
                  value={purchaseForm.supplier_id}
                  onChange={(e) => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecciona un proveedor</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Compra *</label>
                <input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* SCANNER DE CÓDIGO DE BARRAS */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <QrCode size={24} className="text-blue-600" />
                  <h3 className="font-bold text-lg text-gray-800">📱 Scanner de Código de Barras</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScannerMode(!showScannerMode)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    showScannerMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {showScannerMode ? '❌ Desactivar' : '✅ Activar'}
                </button>
              </div>

              {showScannerMode && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    💡 Haz clic en el campo y escanea productos. Se agregarán automáticamente o incrementarán cantidad.
                  </p>
                  <input
                    ref={scannerRef}
                    type="text"
                    placeholder="Escanea un código de barras aquí..."
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyPress={handleBarcodeInput}
                    className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg font-semibold"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona <strong>ENTER</strong> después de escanear
                  </p>
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Productos 📦</h3>
              
              {purchaseForm.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 bg-white border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    {/* Producto con Autocomplete */}
                    <div className="relative md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Producto *</label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Busca o escribe producto..."
                          value={item.product_name}
                          onChange={(e) => handleProductSearch(index, e.target.value)}
                          onFocus={() => setShowProductSuggestions({ ...showProductSuggestions, [index]: true })}
                          className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      {/* Sugerencias */}
                      {showProductSuggestions[index] && productSearch[index] && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                          {getFilteredProducts(productSearch[index]).length > 0 ? (
                            <>
                              {getFilteredProducts(productSearch[index]).map(prod => (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => selectProduct(index, prod)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0"
                                >
                                  <div className="font-semibold">{prod.name}</div>
                                  <div className="text-xs text-gray-500">{prod.barcode || 'Sin código'}</div>
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNewProductForm({ ...showNewProductForm, [index]: true });
                                  setShowProductSuggestions({ ...showProductSuggestions, [index]: false });
                                }}
                                className="w-full text-left px-3 py-2 bg-green-50 text-green-700 font-semibold hover:bg-green-100 border-t"
                              >
                                ➕ Crear nuevo producto
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewProductForm({ ...showNewProductForm, [index]: true });
                                setShowProductSuggestions({ ...showProductSuggestions, [index]: false });
                              }}
                              className="w-full text-left px-3 py-2 bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                            >
                              ➕ Crear "{productSearch[index]}"
                            </button>
                          )}
                        </div>
                      )}

                      {/* Formulario Nuevo Producto */}
                      {showNewProductForm[index] && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-3">
                          <h4 className="font-bold mb-2 text-sm">Nuevo Producto</h4>
                          <input
                            type="text"
                            placeholder="Nombre"
                            value={item.product_name}
                            onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                            className="w-full px-2 py-1 border rounded mb-2 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Código de barras"
                            value={item.barcode}
                            onChange={(e) => handleItemChange(index, 'barcode', e.target.value)}
                            className="w-full px-2 py-1 border rounded mb-2 text-sm"
                          />
                          <select
                            value={item.unit_id}
                            onChange={(e) => handleItemChange(index, 'unit_id', e.target.value)}
                            className="w-full px-2 py-1 border rounded mb-2 text-sm"
                          >
                            {units.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => createNewProduct(index)}
                              className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                            >
                              ✅ Crear
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowNewProductForm({ ...showNewProductForm, [index]: false })}
                              className="flex-1 bg-gray-300 text-gray-800 px-2 py-1 rounded text-sm hover:bg-gray-400"
                            >
                              ❌ Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Unidad de Medida */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad *</label>
                      <select
                        value={item.unit_id || 1}
                        onChange={(e) => handleItemChange(index, 'unit_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
                      >
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.symbol}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>

                    {/* Costo Unitario */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Costo *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={item.unit_cost}
                          onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                          required
                          className="w-full pl-6 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        />
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Subtotal</label>
                      <div className="px-3 py-2 bg-gray-100 rounded-lg font-bold text-green-600 text-xs">
                        ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}
                      </div>
                    </div>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="text-green-600 hover:text-green-800 font-bold mt-4 flex items-center gap-2"
              >
                <Plus size={18} /> Agregar producto
              </button>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
              <textarea
                placeholder="Ej: Pedido urgente, Fecha de entrega estimada..."
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({...purchaseForm, notes: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="2"
              />
            </div>

            {/* Resumen */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between font-bold text-lg">
                <span>Total de Compra:</span>
                <span className="text-green-600">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition text-lg"
            >
              ✅ Registrar Compra
            </button>
          </form>
        </div>
      )}

      {/* TABLA DE COMPRAS */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">N° Compra</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Proveedor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map(purchase => {
              const total = purchase.total_amount || 0;
              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                received: 'bg-green-100 text-green-800',
                cancelled: 'bg-red-100 text-red-800'
              };
              
              return (
                <tbody key={purchase.id}>
                  <tr className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 font-bold text-blue-600">{purchase.purchase_number}</td>
                    <td className="px-6 py-3">{purchase.supplier_name}</td>
                    <td className="px-6 py-3 text-sm">{new Date(purchase.purchase_date).toLocaleDateString('es-ES')}</td>
                    <td className="px-6 py-3 font-bold text-green-600">${parseFloat(total).toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[purchase.status] || 'bg-gray-100 text-gray-800'}`}>
                        {purchase.status === 'pending' ? '⏳ Pendiente' : purchase.status === 'received' ? '✅ Recibida' : '❌ Cancelada'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
                        className="text-gray-600 hover:text-gray-800 mr-3 transition"
                      >
                        <ChevronDown size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id)}
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>

                  {expandedId === purchase.id && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-3">
                          <h4 className="font-bold text-gray-800">📦 Detalles de la Compra:</h4>
                          <div className="space-y-2 text-gray-700">
                            {purchase.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between bg-white p-2 rounded">
                                <span>{item.product_name}</span>
                                <span>{item.quantity} × ${parseFloat(item.unit_cost).toFixed(2)} = <strong>${(item.quantity * item.unit_cost).toFixed(2)}</strong></span>
                              </div>
                            ))}
                          </div>
                          {purchase.notes && (
                            <div className="mt-2 p-2 bg-white rounded">
                              <strong>📝 Notas:</strong> {purchase.notes}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
        {purchases.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay compras registradas
          </div>
        )}
      </div>
    </div>
  );
}