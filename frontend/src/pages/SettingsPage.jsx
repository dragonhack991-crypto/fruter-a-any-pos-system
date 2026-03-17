import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api.js';
import { Save, Store, Lock, Bell, User, AlertCircle, X } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: '',
    tax_rate: 12,
    currency: 'USD',
    language: 'es',
    theme: 'light'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      setSettings(res.data.data || {
        storeName: '',
        tax_rate: 12,
        currency: 'USD',
        language: 'es',
        theme: 'light'
      });
    } catch (err) {
      setError('Error cargando configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(settings);
      setSuccess('✅ Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">⚙️ Configuración</h1>
      <p className="text-gray-600 mb-6">Personaliza tu tienda y configura opciones de venta</p>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TIENDA */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Store size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold">Información de la Tienda</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la Tienda
              </label>
              <input
                type="text"
                value={settings.storeName || ''}
                onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Mi Frutería"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Moneda
              </label>
              <select
                value={settings.currency || 'USD'}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="CRC">CRC (₡)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MXN">MXN ($)</option>
                <option value="COP">COP ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* IMPUESTOS Y VENTAS */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle size={24} className="text-green-600" />
            <h2 className="text-xl font-bold">Impuestos y Ventas</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tasa de IVA (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.tax_rate || 12}
                  onChange={(e) => setSettings({...settings, tax_rate: parseFloat(e.target.value) || 12})}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-lg font-bold text-gray-700">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Este porcentaje se aplicará automáticamente en todas las ventas POS
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-800">
                📊 Ejemplo: Una venta de $100 con {settings.tax_rate}% IVA = ${(100 + (100 * settings.tax_rate / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* IDIOMA Y TEMA */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <User size={24} className="text-purple-600" />
            <h2 className="text-xl font-bold">Interfaz</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Idioma
              </label>
              <select
                value={settings.language || 'es'}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tema
              </label>
              <select
                value={settings.theme || 'light'}
                onChange={(e) => setSettings({...settings, theme: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="light">Claro ☀️</option>
                <option value="dark">Oscuro 🌙</option>
                <option value="auto">Automático</option>
              </select>
            </div>
          </div>
        </div>

        {/* INFORMACIÓN */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={24} className="text-orange-600" />
            <h2 className="text-xl font-bold">Información del Sistema</h2>
          </div>

          <div className="space-y-3 text-sm">
            <p><strong>Versión:</strong> 1.0.0</p>
            <p><strong>Base de Datos:</strong> MySQL</p>
            <p><strong>Estado:</strong> ✅ Conectado</p>
            <p className="text-gray-600 text-xs">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
      </div>

      {/* BOTÓN GUARDAR */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Save size={20} />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
        <button
          onClick={loadSettings}
          className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition font-semibold"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}