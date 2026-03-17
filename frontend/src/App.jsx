import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TrendingUp, Package, ShoppingCart, Users, BarChart3, Settings, Home, DollarSign, Building2 } from 'lucide-react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import UsersPage from './pages/UsersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import POSPage from './pages/POSPage';
import SuppliersPage from './pages/SuppliersPage';
import './styles/globals.css';

function App() {
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/pos', label: 'Punto de Venta', icon: DollarSign, roles: ['admin', 'manager', 'cashier'] },
    { path: '/products', label: 'Productos', icon: Package },
    { path: '/sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
    { path: '/purchases', label: 'Compras', icon: TrendingUp, roles: ['admin', 'manager'] },
    { path: '/suppliers', label: 'Proveedores', icon: Building2, roles: ['admin', 'manager'] },
    { path: '/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
    { path: '/analytics', label: 'Reportes', icon: BarChart3, roles: ['admin', 'manager'] },
    { path: '/settings', label: 'Configuración', icon: Settings, roles: ['admin'] }
  ];

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout menuItems={menuItems}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/pos" element={<POSPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;