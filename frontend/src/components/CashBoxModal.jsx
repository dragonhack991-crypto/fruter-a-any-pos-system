import { useState } from 'react';
import { X, DollarSign, Unlock, Lock } from 'lucide-react';
import { openCashBox, closeCashBox } from '../services/api.js';

/**
 * CashBoxModal - Modal para apertura y cierre de caja
 * Props:
 *   mode: 'open' | 'close'
 *   activeCashBox: object | null  (la sesión activa, para modo 'close')
 *   onSuccess: (data) => void
 *   onClose: () => void
 */
export default function CashBoxModal({ mode = 'open', activeCashBox = null, onSuccess, onClose }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOpen = mode === 'open';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Ingresa un monto válido (mayor o igual a 0)');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isOpen) {
        res = await openCashBox(parsedAmount);
      } else {
        res = await closeCashBox(parsedAmount, notes);
      }
      onSuccess && onSuccess(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || `Error al ${isOpen ? 'abrir' : 'cerrar'} la caja`);
    } finally {
      setLoading(false);
    }
  };

  const expectedAtClose = activeCashBox
    ? (parseFloat(activeCashBox.opening_amount || 0) + parseFloat(activeCashBox.summary?.total_sales || 0))
    : 0;

  const difference = !isOpen && amount !== ''
    ? (parseFloat(amount) || 0) - expectedAtClose
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {isOpen
              ? <Unlock size={24} className="text-green-600" />
              : <Lock size={24} className="text-orange-600" />
            }
            <h2 className="text-xl font-bold text-gray-800">
              {isOpen ? 'Apertura de Caja' : 'Corte de Caja'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Si es apertura: solo pide fondo de caja */}
          {isOpen && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fondo de Caja Inicial ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-bold"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ingresa el monto de efectivo con el que inicias tu turno.
              </p>
            </div>
          )}

          {/* Si es cierre: muestra resumen y pide monto físico */}
          {!isOpen && activeCashBox && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fondo inicial:</span>
                  <span className="font-semibold">${parseFloat(activeCashBox.opening_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventas del turno:</span>
                  <span className="font-semibold text-green-600">
                    +${parseFloat(activeCashBox.summary?.total_sales || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700 font-semibold">Monto esperado:</span>
                  <span className="font-bold text-blue-700">${expectedAtClose.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Transacciones:</span>
                  <span>{activeCashBox.summary?.transactions_count || 0}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto Físico en Caja ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg font-bold"
                    autoFocus
                  />
                </div>
              </div>

              {difference !== null && (
                <div className={`p-3 rounded-lg text-sm font-semibold flex justify-between items-center
                  ${difference === 0 ? 'bg-green-50 text-green-700 border border-green-200' :
                    difference > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-red-50 text-red-700 border border-red-200'}`}
                >
                  <span>Diferencia:</span>
                  <span>{difference >= 0 ? '+' : ''}{difference.toFixed(2)}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Diferencia por cambio devuelto..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-white transition
                ${isOpen
                  ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                  : 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400'
                }`}
            >
              {loading ? (
                <span>Procesando...</span>
              ) : isOpen ? (
                <><Unlock size={18} /> Abrir Caja</>
              ) : (
                <><Lock size={18} /> Cerrar Caja</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
