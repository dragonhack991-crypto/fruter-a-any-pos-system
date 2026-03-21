import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api.js';
import { Plus, Edit2, Trash2, X, AlertCircle, Check } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_id: 3
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await getUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.username || !formData.email || !formData.full_name) {
        setError('Completa todos los campos requeridos');
        return;
      }

      if (editingId) {
        await updateUser(editingId, formData);
        setSuccess('Usuario actualizado ✓');
      } else {
        if (!formData.password) {
          setError('La contraseña es requerida para nuevos usuarios');
          return;
        }
        await createUser(formData);
        setSuccess('Usuario creado ✓');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role_id: 3
      });
      
      await loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando usuario');
      console.error(err);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      password: '',
      role_id: user.role_id
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este usuario?')) {
      try {
        await deleteUser(id);
        setSuccess('Usuario eliminado ✓');
        await loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Error eliminando usuario');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">👥 Usuarios</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              username: '',
              email: '',
              full_name: '',
              password: '',
              role_id: 3
            });
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold"
        >
          <Plus size={20} /> Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={20} /></button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700 flex items-center gap-2">
          <Check size={20} /> {success}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1">Nombre Completo *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {!editingId && (
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!editingId}
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1">Rol</label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Administrador</option>
                <option value={2}>Gerente</option>
                <option value={3}>Cajero</option>
              </select>
            </div>

            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold"
              >
                {editingId ? 'Actualizar' : 'Crear'} Usuario
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Username</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Rol</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{user.username}</td>
                <td className="px-6 py-3 text-sm">{user.email}</td>
                <td className="px-6 py-3">{user.full_name}</td>
                <td className="px-6 py-3 text-sm capitalize">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Cajero'}
                  </span>
                </td>
                <td className="px-6 py-3 text-center flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 hover:bg-blue-100 rounded text-blue-600"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
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
    </div>
  );
}