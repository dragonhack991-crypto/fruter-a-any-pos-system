import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, updateUserStatus } from '../services/api.js';
import { Plus, Edit2, Trash2, X, AlertCircle, Check, RefreshCw, Copy, Search, Shield, User, UserCheck } from 'lucide-react';

const ROLE_LABELS = { 1: 'Administrador', 2: 'Gerente', 3: 'Cajero' };
const ROLE_COLORS = { 1: 'bg-red-100 text-red-700', 2: 'bg-blue-100 text-blue-700', 3: 'bg-green-100 text-green-700' };

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create/Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', full_name: '', password: '', role_id: 3, is_active: true
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  // Reset password modal
  const [showReset, setShowReset] = useState(null); // user object
  const [tempPassword, setTempPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterRole) params.role_id = filterRole;
      if (filterStatus !== '') params.is_active = filterStatus;
      if (search) params.search = search;
      const res = await getUsers(params);
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [filterRole, filterStatus, search]);

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const openCreate = () => {
    setFormData({ username: '', email: '', full_name: '', password: '', role_id: 3, is_active: true });
    setConfirmPassword('');
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setFormData({ username: user.username, email: user.email, full_name: user.full_name, password: '', role_id: user.role_id, is_active: user.is_active });
    setConfirmPassword('');
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingId && formData.password !== confirmPassword) {
      return showMsg('Las contraseñas no coinciden', true);
    }
    if (!editingId && formData.password.length < 6) {
      return showMsg('La contraseña debe tener al menos 6 caracteres', true);
    }
    try {
      if (editingId) {
        const { username, password, ...updateData } = formData;
        await updateUser(editingId, updateData);
        showMsg('✅ Usuario actualizado correctamente');
      } else {
        await createUser(formData);
        showMsg('✅ Usuario creado: ' + formData.username);
      }
      setShowForm(false);
      loadUsers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error guardando usuario', true);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Desactivar el usuario "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      showMsg('✅ Usuario desactivado');
      loadUsers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error eliminando usuario', true);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active;
    try {
      await updateUserStatus(user.id, newStatus);
      showMsg(`✅ Usuario ${newStatus ? 'activado' : 'desactivado'}`);
      loadUsers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error actualizando estado', true);
    }
  };

  const openReset = (user) => {
    setShowReset(user);
    setTempPassword('');
    setResetDone(false);
    setCopied(false);
  };

  const handleReset = async () => {
    try {
      const res = await resetUserPassword(showReset.id);
      setTempPassword(res.data.tempPassword);
      setResetDone(true);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error reseteando contraseña', true);
      setShowReset(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredUsers = users;

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">👥 Usuarios</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span><AlertCircle className="inline mr-2" size={16} />{error}</span>
          <button onClick={() => setError('')}><X size={18} /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <Check size={18} />{success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por username, email, nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los roles</option>
          <option value="1">Administrador</option>
          <option value="2">Gerente</option>
          <option value="3">Cajero</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Username</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Rol</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Estado</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={`border-t hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-semibold">{user.username}</td>
                <td className="px-4 py-3 text-sm">{user.email}</td>
                <td className="px-4 py-3">{user.full_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${ROLE_COLORS[user.role_id] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[user.role_id] || user.role_name || 'Desconocido'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={user.is_active ? 'Click para desactivar' : 'Click para activar'}
                  >
                    {user.is_active ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(user)} className="p-1.5 hover:bg-blue-100 rounded text-blue-600" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => openReset(user)} className="p-1.5 hover:bg-amber-100 rounded text-amber-600" title="Reset contraseña">
                      <RefreshCw size={16} />
                    </button>
                    <button onClick={() => handleDelete(user)} className="p-1.5 hover:bg-red-100 rounded text-red-600" title="Desactivar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios con esos filtros'}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={!!editingId}
                  required={!editingId}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Min 4 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Rol *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({...formData, role_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Gerente</option>
                  <option value={3}>Cajero</option>
                </select>
              </div>
              {editingId && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Estado</label>
                  <select
                    value={formData.is_active ? '1' : '0'}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === '1'})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              )}
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Contraseña *</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Min 6 chars"
                      />
                      <button
                        type="button"
                        onClick={() => { const p = generatePassword(); setFormData({...formData, password: p}); setConfirmPassword(p); }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs whitespace-nowrap"
                        title="Generar contraseña"
                      >
                        🎲 Auto
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Confirmar *</label>
                    <input
                      type="text"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold">
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg font-semibold">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">🔑 Reset Contraseña</h2>
              <button onClick={() => setShowReset(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6">
              {!resetDone ? (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={20} className="text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700">
                      ¿Resetear la contraseña de <strong>{showReset.username}</strong>? Se generará una contraseña temporal automáticamente.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleReset} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-semibold">
                      Confirmar Reset
                    </button>
                    <button onClick={() => setShowReset(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg font-semibold">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                    <Check size={24} className="mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-green-700 font-semibold">Contraseña reseteada exitosamente</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 text-center">Nueva contraseña temporal para <strong>{showReset.username}</strong>:</p>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-3 mb-4">
                    <code className="flex-1 text-lg font-mono font-bold tracking-widest text-gray-800">{tempPassword}</code>
                    <button onClick={copyToClipboard} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Copiar">
                      <Copy size={18} />
                    </button>
                  </div>
                  {copied && <p className="text-xs text-center text-green-600 mb-2">✓ Copiado al portapapeles</p>}
                  <p className="text-xs text-center text-gray-500 mb-4">⚠️ Comparte esta contraseña con el usuario. Deberá cambiarla en su próximo ingreso.</p>
                  <button onClick={() => setShowReset(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">
                    Cerrar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
