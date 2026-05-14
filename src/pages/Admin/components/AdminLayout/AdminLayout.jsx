import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../../../../components/Header/Header';
import './AdminLayout.scss';

const AdminLayout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/tribes', label: 'Tribus', icon: '🏛️' },
    { path: '/admin/events', label: 'Événements', icon: '🎉' },
    { path: '/admin/dinos', label: 'Espèces', icon: '🦖' },
  ];

  return (
    <>
      <Header />
      <div className="admin-layout">
        <aside className="admin-layout__sidebar">
          <h2 className="admin-layout__title">
            <span className="admin-layout__title-icon">⚙️</span>
            Administration
          </h2>
          <nav className="admin-layout__nav">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-layout__nav-item ${
                  location.pathname === item.path ? 'admin-layout__nav-item--active' : ''
                }`}
              >
                <span className="admin-layout__nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="admin-layout__content">
          {children}
        </main>
      </div>
    </>
  );
};

export default AdminLayout;
