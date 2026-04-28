import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import InventoryAdjustmentsPage from './pages/InventoryAdjustmentsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import UsersPage from './pages/UsersPage';
import SuppliersPage from './pages/SuppliersPage';
import SettingsPage from './pages/SettingsPage';
import POSPage from './pages/POSPage';
import ProfitsPage from './pages/ProfitsPage';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!isAuthenticated) {
    return <LoginPage setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-64 h-full flex-shrink-0
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-base font-bold text-gray-800">🍎 Sistema POS</h1>
          <div className="flex-1" />
        </div>

        {/* Desktop Navbar */}
        <div className="hidden md:block flex-shrink-0">
          <Navbar user={user} onLogout={handleLogout} />
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
            <Route path="/profits" element={<ProfitsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}