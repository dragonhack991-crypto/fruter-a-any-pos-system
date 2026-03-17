import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, Bell, User } from 'lucide-react';
import '../styles/layout.css';

function Layout({ children, menuItems }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🍎 Frutera</h1>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="nav-item"
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon && <item.icon size={20} />}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>

          <div className="topbar-title">
            <h2>Sistema POS</h2>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              <span className="badge-dot">3</span>
            </button>

            <div className="user-menu">
              <button 
                className="icon-btn" 
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User size={20} />
              </button>

              {showUserMenu && (
                <div className="dropdown-menu">
                  <a href="/profile">
                    <User size={18} /> Perfil
                  </a>
                  <a href="/settings">
                    <Settings size={18} /> Configuración
                  </a>
                  <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;