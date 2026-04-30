import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  Warehouse,
  TrendingDown,
  Receipt,  
  ChevronDown,
  BarChart3,
  Menu
} from 'lucide-react';
import { getLogo } from '../services/api.js';

export default function Sidebar({ isOpen: externalIsOpen, onToggle }) {
  const [isOpen, setIsOpen] = useState(true);
  const [logo, setLogo] = useState(null);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (onToggle) onToggle(next);
  };

  // Sync with external control (mobile overlay)
  useEffect(() => {
    if (externalIsOpen !== undefined) setIsOpen(externalIsOpen);
  }, [externalIsOpen]);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await getLogo();
        if (res.data.success && res.data.data.logo) {
          setLogo(res.data.data.logo);
        }
      } catch {
        // Logo not set
      }
    };
    fetchLogo();
  }, []);

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Productos', icon: Package },
  { path: '/inventory', label: 'Inventario', icon: Warehouse },
  { path: '/inventory-adjustments', label: 'Ajustes', icon: TrendingDown },
  { path: '/sales', label: 'Ventas', icon: ShoppingCart },
  { path: '/pos', label: 'POS', icon: Receipt },
  { path: '/profits', label: 'Ganancias', icon: BarChart3 },
  { path: '/purchases', label: 'Compras', icon: Truck },
  { path: '/suppliers', label: 'Proveedores', icon: Truck },
  { path: '/users', label: 'Usuarios', icon: Users },
  { path: '/settings', label: 'Configuración', icon: Settings }
];

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-gradient-to-b from-blue-900 to-blue-800 text-white h-full flex flex-col transition-all duration-300 shadow-lg overflow-y-auto`}
    >
      {/* Logo/Header */}
      <div className="p-4 border-b border-blue-700 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded" />
            ) : (
              <span className="text-2xl">🍎</span>
            )}
            <h1 className="text-xl font-bold">Frutera</h1>
          </div>
        )}
        {!isOpen && logo && (
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded mx-auto" />
        )}
        {!isOpen && !logo && (
          <span className="text-2xl mx-auto">🍎</span>
        )}
        <button
          onClick={toggle}
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
              {isOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-blue-700 text-xs text-blue-200">
        {isOpen && <p>© 2026 Fruter POS</p>}
      </div>
    </aside>
  );
}