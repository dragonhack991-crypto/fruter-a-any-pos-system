import { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';

/**
 * BulkSaleModal - Modal para venta de productos a granel
 * Props:
 *   product: objeto del producto (con sale_type, unit_price, name)
 *   onAdd: (item) => void  - callback con el item a agregar al carrito
 *   onClose: () => void
 */
export default function BulkSaleModal({ product, onAdd, onClose }) {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  if (!product) return null;

  const saleType = product.sale_type || 'unidad';
  const unitPrice = parseFloat(product.unit_price) || 0;

  const unitLabel = {
    kilogramo: 'kilogramos (kg)',
    gramo: 'gramos (gr)',
    litro: 'litros (L)',
    ml: 'mililitros (ml)',
    unidad: 'unidades'
  }[saleType] || saleType;

  const shortLabel = {
    kilogramo: 'kg',
    gramo: 'gr',
    litro: 'L',
    ml: 'ml',
    unidad: 'pz'
  }[saleType] || saleType;

  // Precio base por unidad mínima del tipo de venta
  // Si el precio es por kg, y venden en gramos, convertir
  const pricePerUnit = unitPrice; // siempre el precio es por la unidad de venta del producto

  const parsedQty = parseFloat(quantity) || 0;
  const subtotal = parsedQty > 0 ? parsedQty * pricePerUnit : 0;

  const handleAdd = () => {
    if (!quantity || parsedQty <= 0) {
      setError('Ingresa una cantidad válida mayor a 0');
      return;
    }
    setError('');
    onAdd({
      product_id: product.id,
      product_name: `${product.name} (${parsedQty} ${shortLabel})`,
      unit_price: pricePerUnit,
      quantity: parsedQty,
      sale_type: saleType,
      is_iva: !!product.is_iva,
      is_ieps: !!product.is_ieps,
      ieps_rate: parseFloat(product.ieps_rate) || 0
    });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <Scale size={22} className="text-blue-600" />
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-500 capitalize">Venta por {saleType}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Precio unitario */}
          <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-blue-700">Precio por {shortLabel}:</span>
            <span className="font-bold text-blue-800 text-lg">${pricePerUnit.toFixed(2)}</span>
          </div>

          {/* Input de cantidad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Cantidad en {unitLabel}:
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={`Ej: ${saleType === 'gramo' ? '500' : saleType === 'kilogramo' ? '1.5' : '1'}`}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold text-center"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {/* Subtotal dinámico */}
          {parsedQty > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm text-green-600">Subtotal:</p>
              <p className="text-2xl font-bold text-green-700">${subtotal.toFixed(2)}</p>
              <p className="text-xs text-green-500 mt-0.5">
                {parsedQty} {shortLabel} × ${pricePerUnit.toFixed(2)}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!quantity || parsedQty <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg transition"
            >
              Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
