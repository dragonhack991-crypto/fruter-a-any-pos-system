import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api.js';
import { Save, X } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await getSettings();
      setSettings(res.data.data || {});
    } catch (err) {
      setError('Error cargando configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      setSuccess('✅ Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error guardando configuración');
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ Configuración</h1>

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

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {/* Nombre de la Tienda */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre de la Tienda
          </label>
          <input
            type="text"
            value={settings.storeName || ''}
            onChange={(e) => setSettings({...settings, storeName: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* IVA / Tax Rate */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tasa de IVA (%)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.tax_rate || 12}
              onChange={(e) => setSettings({...settings, tax_rate: parseFloat(e.target.value)})}
              className="w-32 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-gray-600">Porcentaje</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Este IVA se aplicará automáticamente en todas las ventas
          </p>
        </div>

        {/* Moneda */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Moneda
          </label>
          <select
            value={settings.currency || 'USD'}
            onChange={(e) => setSettings({...settings, currency: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="USD">USD ($)</option>
            <option value="CRC">CRC (₡)</option>
            <option value="EUR">EUR (€)</option>
            <option value="MXN">MXN ($)</option>
          </select>
        </div>

        {/* Idioma */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Idioma
          </label>
          <select
            value={settings.language || 'es'}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Tema */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tema
          </label>
          <select
            value={settings.theme || 'light'}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </div>

        {/* Botón Guardar */}
        <button
          onClick={handleSave}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
        >
          <Save size={20} /> Guardar Configuración
        </button>
      </div>
    </div>
  );
}