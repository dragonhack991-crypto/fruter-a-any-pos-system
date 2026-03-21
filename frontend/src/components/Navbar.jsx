import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* Left - Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sistema POS</h2>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-900">
                {user?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Settings size={18} />
                Configuración
              </button>
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <User size={18} />
                Mi Perfil
              </button>
              <hr className="my-2" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 font-semibold"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}