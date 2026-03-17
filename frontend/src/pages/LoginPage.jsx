import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { login } from '../services/api';
import { AlertCircle, Lock, User, Loader } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    console.log('🔐 DEBUG - username:', username, 'password:', password);
    
    // Llamar directamente con los parámetros correctos
    const response = await login(username, password);
    
    console.log('✅ Respuesta del servidor:', response.data);
    
    const { token, user } = response.data.data;
    
    if (!token || !user) {
      throw new Error('Token o usuario no recibidos');
    }
    
    console.log('💾 Guardando token y usuario');
    setAuth(token, user);
    navigate('/', { replace: true });
  } catch (err) {
    console.error('❌ Error en login:', err.response?.data || err.message);
    setError(err.response?.data?.error || err.message || 'Error al iniciar sesión');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">🍎</h1>
          <h1 className="text-3xl font-bold text-gray-800">Frutería Any</h1>
          <p className="text-gray-600 mt-2">Sistema POS</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Iniciando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
          <p className="font-semibold mb-2">Credenciales de prueba:</p>
          <p>Usuario: <strong>admin</strong></p>
          <p>Contraseña: <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
}