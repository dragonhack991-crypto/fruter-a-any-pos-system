import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  Warehouse,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Productos', icon: Package },
    { path: '/inventory', label: 'Inventario', icon: Warehouse },
    { path: '/sales', label: 'Ventas', icon: ShoppingCart },
    { path: '/purchases', label: 'Compras', icon: Truck },
    { path: '/suppliers', label: 'Proveedores', icon: Truck },
    { path: '/users', label: 'Usuarios', icon: Users },
    { path: '/settings', label: 'Configuración', icon: Settings }
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-900 to-blue-800 text-white h-screen flex flex-col transition-all duration-300 shadow-lg fixed left-0 top-0 z-40 overflow-y-auto`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-blue-700 flex items-center justify-between">
          {isOpen && <h1 className="text-2xl font-bold">🍎 Frutera</h1>}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
          >
            {isOpen ? <ChevronDown size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
                title={!isOpen ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700 text-xs text-blue-200">
          {isOpen && <p>© 2026 Fruter POS</p>}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Offset para el contenido principal */}
      <div className={isOpen ? 'ml-64' : 'ml-20'} />
    </>
  );
}