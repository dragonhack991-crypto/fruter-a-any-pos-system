import { useState, useEffect, useRef } from 'react';
import { getSettings, updateAppSettings, getTaxSettings, updateTaxSettings, changePassword, getLogo, uploadLogo } from '../services/api.js';
import { Save, Eye, EyeOff, AlertCircle, Check, Upload, Image } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    storeName: '',
    currency: 'MXN',
    language: 'es',
    theme: 'light'
  });

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    iva_rate: 12,
    ieps_rate: 0,
    apply_iva_by_default: true,
    apply_ieps_by_default: false
  });

  // Password Settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Logo
  const [currentLogo, setCurrentLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    try {
      const res = await getLogo();
      if (res.data.success && res.data.data.logo) {
        setCurrentLogo(res.data.data.logo);
      }
    } catch {
      // Logo not set yet
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [settingsRes, taxRes] = await Promise.all([
        getSettings(),
        getTaxSettings()
      ]);

      if (settingsRes.data.data) {
        setGeneralSettings(settingsRes.data.data);
      }

      if (taxRes.data.data) {
        setTaxSettings(taxRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG, GIF o WebP');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      setError('El logo no puede superar 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) {
      setError('Selecciona una imagen primero');
      return;
    }
    try {
      setError('');
      setLogoLoading(true);
      await uploadLogo(logoPreview);
      setCurrentLogo(logoPreview);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      setSuccess('✅ Logo guardado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando logo');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaxChange = (e) => {
    const { name, value, type } = e.target;
    setTaxSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? e.target.checked : parseFloat(value)
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await updateAppSettings(generalSettings);
      setSuccess('Configuración general guardada ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando configuración');
      console.error(err);
    }
  };

  const handleSaveTax = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      // Validar rangos
      if (taxSettings.iva_rate < 0 || taxSettings.iva_rate > 100) {
        setError('IVA debe estar entre 0 y 100');
        return;
      }
      if (taxSettings.ieps_rate < 0 || taxSettings.ieps_rate > 100) {
        setError('IEPS debe estar entre 0 y 100');
        return;
      }

      await updateTaxSettings(taxSettings);
      setSuccess('Configuración de impuestos guardada ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando configuración');
      console.error(err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setError('Todos los campos son requeridos');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });

      setSuccess('Contraseña cambiada exitosamente ✓');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cambiando contraseña');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ Configuración</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-700 flex items-center gap-2">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b">
        {[
          { id: 'general', label: 'General' },
          { id: 'logo', label: '🖼️ Logo' },
          { id: 'taxes', label: 'Impuestos' },
          { id: 'password', label: 'Contraseña' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración General</h2>
          
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la Tienda
              </label>
              <input
                type="text"
                name="storeName"
                value={generalSettings.storeName}
                onChange={handleGeneralChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Moneda
              </label>
              <select
                name="currency"
                value={generalSettings.currency}
                onChange={handleGeneralChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="CRC">CRC - Colón Costarricense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="COP">COP - Peso Colombiano</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Idioma
              </label>
              <select
                name="language"
                value={generalSettings.language}
                onChange={handleGeneralChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                name="theme"
                value={generalSettings.theme}
                onChange={handleGeneralChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
                <option value="auto">Automático</option>
              </select>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              <Save size={20} /> Guardar Configuración
            </button>
          </form>
        </div>
      )}

      {/* LOGO SETTINGS */}
      {activeTab === 'logo' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🖼️ Logo de la Tienda</h2>

          <div className="space-y-6">
            {/* Current logo preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Logo Actual</label>
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo actual" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center text-gray-400">
                    <Image size={40} className="mx-auto mb-2" />
                    <p className="text-xs">Sin logo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload new logo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subir Nuevo Logo</label>
              <p className="text-xs text-gray-500 mb-3">Formatos permitidos: JPG, PNG, GIF, WebP. Máximo 1MB.</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleLogoFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            {/* Preview of new logo */}
            {logoPreview && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Vista Previa</label>
                <div className="w-32 h-32 border-2 border-blue-300 rounded-lg overflow-hidden bg-gray-50">
                  <img src={logoPreview} alt="Vista previa" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveLogo}
              disabled={!logoPreview || logoLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              <Upload size={20} /> {logoLoading ? 'Guardando...' : 'Guardar Logo'}
            </button>
          </div>
        </div>
      )}

      {/* TAX SETTINGS */}
      {activeTab === 'taxes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">💰 Configuración de Impuestos</h2>
          
          <form onSubmit={handleSaveTax} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tasa IVA (%)
                </label>
                <input
                  type="number"
                  name="iva_rate"
                  value={taxSettings.iva_rate}
                  onChange={handleTaxChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tasa IEPS (%)
                </label>
                <input
                  type="number"
                  name="ieps_rate"
                  value={taxSettings.ieps_rate}
                  onChange={handleTaxChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="apply_iva_by_default"
                  checked={taxSettings.apply_iva_by_default}
                  onChange={handleTaxChange}
                  className="w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-700">Aplicar IVA por defecto en productos nuevos</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="apply_ieps_by_default"
                  checked={taxSettings.apply_ieps_by_default}
                  onChange={handleTaxChange}
                  className="w-4 h-4 rounded"
                />
                <span className="font-semibold text-gray-700">Aplicar IEPS por defecto en productos nuevos</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              <Save size={20} /> Guardar Impuestos
            </button>
          </form>
        </div>
      )}

      {/* PASSWORD SETTINGS */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🔒 Cambiar Contraseña</h2>
          
          <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              <Save size={20} /> Cambiar Contraseña
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
