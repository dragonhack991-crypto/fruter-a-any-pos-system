import React, { useState, useEffect } from 'react';
import { Save, Store, Lock, Bell, User, AlertCircle } from 'lucide-react';
import { getSettings, updateProfile, changePassword, updateAppSettings, updateNotifications } from '../services/api';
import '../styles/settings.css';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [appSettings, setAppSettings] = useState({
    storeName: '',
    currency: 'USD',
    language: 'es',
    theme: 'light'
  });

  const [notifications, setNotifications] = useState({
    notificationsEnabled: true
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      if (response.data.success) {
        setProfile({
          fullName: response.data.data.user.fullName,
          email: response.data.data.user.email,
          phone: response.data.data.user.phone
        });
        setAppSettings(response.data.data.appSettings);
      }
    } catch (error) {
      mostrarMensaje('Error cargando configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // Guardar perfil
  const guardarPerfil = async () => {
    try {
      setSaving(true);
      const response = await updateProfile(profile);
      if (response.data.success) {
        mostrarMensaje('✅ Perfil actualizado exitosamente', 'success');
      }
    } catch (error) {
      mostrarMensaje('❌ Error al actualizar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cambiar contraseña
  const cambiarContrasena = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      mostrarMensaje('❌ Todos los campos son requeridos', 'error');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      mostrarMensaje('❌ Las contraseñas no coinciden', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });
      if (response.data.success) {
        mostrarMensaje('✅ Contraseña cambiada exitosamente', 'success');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      mostrarMensaje(error.response?.data?.error || '❌ Error al cambiar contraseña', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Guardar configuración de app
  const guardarConfigApp = async () => {
    try {
      setSaving(true);
      const response = await updateAppSettings(appSettings);
      if (response.data.success) {
        mostrarMensaje('✅ Configuración guardada exitosamente', 'success');
      }
    } catch (error) {
      mostrarMensaje('❌ Error al guardar configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Guardar notificaciones
  const guardarNotificaciones = async () => {
    try {
      setSaving(true);
      const response = await updateNotifications(notifications);
      if (response.data.success) {
        mostrarMensaje('✅ Notificaciones actualizadas', 'success');
      }
    } catch (error) {
      mostrarMensaje('❌ Error al actualizar notificaciones', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-page"><p>Cargando...</p></div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ Configuración</h1>
        <p>Personaliza tu perfil y tienda</p>
      </div>

      {message && (
        <div className={`alert alert-${messageType}`}>
          {message}
        </div>
      )}

      <div className="settings-container">
        {/* Perfil del Usuario */}
        <div className="settings-section">
          <div className="section-header">
            <User size={24} />
            <h2>Mi Perfil</h2>
          </div>

          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="Tu email"
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Tu teléfono"
            />
          </div>

          <button 
            className="btn-primary"
            onClick={guardarPerfil}
            disabled={saving}
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Perfil'}
          </button>
        </div>

        {/* Cambiar Contraseña */}
        <div className="settings-section">
          <div className="section-header">
            <Lock size={24} />
            <h2>Seguridad</h2>
          </div>

          <div className="form-group">
            <label>Contraseña Actual</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              placeholder="Ingresa la nueva contraseña"
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              placeholder="Confirma la nueva contraseña"
            />
          </div>

          <button 
            className="btn-primary"
            onClick={cambiarContrasena}
            disabled={saving}
          >
            <Lock size={20} />
            {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>

        {/* Configuración de Tienda */}
        <div className="settings-section">
          <div className="section-header">
            <Store size={24} />
            <h2>Configuración de Tienda</h2>
          </div>

          <div className="form-group">
            <label>Nombre de la Tienda</label>
            <input
              type="text"
              value={appSettings.storeName}
              onChange={(e) => setAppSettings({ ...appSettings, storeName: e.target.value })}
              placeholder="Nombre de tu tienda"
            />
          </div>

          <div className="form-group">
            <label>Moneda</label>
            <select 
              value={appSettings.currency}
              onChange={(e) => setAppSettings({ ...appSettings, currency: e.target.value })}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MXN">MXN ($)</option>
              <option value="COP">COP ($)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Idioma</label>
            <select 
              value={appSettings.language}
              onChange={(e) => setAppSettings({ ...appSettings, language: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tema</label>
            <select 
              value={appSettings.theme}
              onChange={(e) => setAppSettings({ ...appSettings, theme: e.target.value })}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <button 
            className="btn-primary"
            onClick={guardarConfigApp}
            disabled={saving}
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

        {/* Notificaciones */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={24} />
            <h2>Notificaciones</h2>
          </div>

          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="notifications"
              checked={notifications.notificationsEnabled}
              onChange={(e) => setNotifications({ ...notifications, notificationsEnabled: e.target.checked })}
            />
            <label htmlFor="notifications">Habilitar notificaciones por email</label>
          </div>

          <p className="help-text">
            <AlertCircle size={16} />
            Recibirás notificaciones sobre cambios importantes en tu tienda
          </p>

          <button 
            className="btn-primary"
            onClick={guardarNotificaciones}
            disabled={saving}
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </div>
    </div>
  );
}