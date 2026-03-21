import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar (fixed, takes space) */}
      <div className="w-64 fixed left-0 top-0 h-screen z-40">
        <Sidebar />
      </div>

      {/* Main Content Area (offset by sidebar width) */}
      <div className="ml-64 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar user={user} onLogout={handleLogout} />

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory-adjustments" element={<InventoryAdjustmentsPage />} />
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