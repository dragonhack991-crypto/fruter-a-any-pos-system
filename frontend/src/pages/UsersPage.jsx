import { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, updateUserStatus } from '../services/api.js';
import { Trash2, Edit2, Plus, X, Key, Power } from 'lucide-react';
import '../styles/users.css';

const ROLES = [
  { id: 1, name: 'admin', label: 'Administrador' },
  { id: 2, name: 'manager', label: 'Gerente' },
  { id: 3, name: 'cashier', label: 'Cajero' }
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role_id: 3,
    phone: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsers();
      setUsers(res.data.users || []);
    } catch (error) {
      setError('Error cargando usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (msg, type) => {
    if (type === 'success') {
      setSuccess(msg);
      setError('');
    } else {
      setError(msg);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await updateUser(editingId, {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          role_id: formData.role_id
        });
        mostrarMensaje('✅ Usuario actualizado correctamente', 'success');
      } else {
        if (!formData.password) {
          mostrarMensaje('❌ La contraseña es requerida', 'error');
          return;
        }
        if (formData.password.length < 6) {
          mostrarMensaje('❌ La contraseña debe tener al menos 6 caracteres', 'error');
          return;
        }
        await createUser(formData);
        mostrarMensaje('✅ Usuario creado correctamente', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadUsers();
    } catch (error) {
      mostrarMensaje(error.response?.data?.error || '❌ Error al guardar usuario', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteUser(id);
        mostrarMensaje('✅ Usuario eliminado correctamente', 'success');
        loadUsers();
      } catch (error) {
        mostrarMensaje(error.response?.data?.error || '❌ Error al eliminar', 'error');
      }
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      full_name: user.full_name,
      role_id: user.role_id,
      phone: user.phone || ''
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || !confirmPassword) {
      mostrarMensaje('❌ Completa todos los campos', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      mostrarMensaje('❌ Las contraseñas no coinciden', 'error');
      return;
    }

    if (newPassword.length < 6) {
      mostrarMensaje('❌ La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      await resetUserPassword(userId, newPassword);
      mostrarMensaje('✅ Contraseña actualizada correctamente', 'success');
      setShowResetPassword(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      mostrarMensaje(error.response?.data?.error || '❌ Error al cambiar contraseña', 'error');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await updateUserStatus(user.id, !user.is_active);
      mostrarMensaje(
        user.is_active ? '✅ Usuario desactivado' : '✅ Usuario activado',
        'success'
      );
      loadUsers();
    } catch (error) {
      mostrarMensaje('❌ Error al cambiar estado', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role_id: 3,
      phone: ''
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando usuarios...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">👥 Gestión de Usuarios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{editingId ? '✏️ Editar' : '➕ Crear'} Usuario</h2>
            <button onClick={closeForm} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Usuario</label>
              <input
                type="text"
                placeholder="nombre_usuario"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                disabled={!!editingId}
                required
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Nombre Completo</label>
              <input
                type="text"
                placeholder="Juan Pérez"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Teléfono</label>
              <input
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Rol</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({...formData, role_id: parseInt(e.target.value)})}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {ROLES.map(role => (
                  <option key={role.id} value={role.id}>{role.label}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg md:col-span-2 font-bold transition"
            >
              {editingId ? 'Actualizar' : 'Crear'} Usuario
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Usuario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-bold text-gray-800">{user.username}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-3">{user.full_name}</td>
                <td className="px-6 py-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    {ROLES.find(r => r.id === user.role_id)?.label}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Editar usuario"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setShowResetPassword(user.id)}
                      className="text-orange-600 hover:text-orange-800 transition"
                      title="Cambiar contraseña"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`transition ${user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                    >
                      <Power size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay usuarios registrados
          </div>
        )}
      </div>

      {/* Modal de Resetear Contraseña */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">🔑 Cambiar Contraseña</h3>
            <p className="text-gray-600 mb-4">
              Ingresa la nueva contraseña para {users.find(u => u.id === showResetPassword)?.full_name}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Nueva Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleResetPassword(showResetPassword);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
                >
                  Cambiar
                </button>
                <button
                  onClick={() => {
                    setShowResetPassword(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}