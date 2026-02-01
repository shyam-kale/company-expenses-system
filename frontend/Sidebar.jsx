import React from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, setCurrentPage, userProfile }) => {
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', badge: null },
    { id: 'expenses', icon: '💰', label: 'Expenses', badge: '12' },
    { id: 'analytics', icon: '📈', label: 'Analytics', badge: null },
    { id: 'reports', icon: '📋', label: 'Reports', badge: 'New' },
    { id: 'budget', icon: '💳', label: 'Budget', badge: null },
    { id: 'categories', icon: '🏷️', label: 'Categories', badge: null },
    { id: 'team', icon: '👥', label: 'Team', badge: '5' },
    { id: 'calendar', icon: '📅', label: 'Calendar', badge: null },
    { id: 'invoices', icon: '🧾', label: 'Invoices', badge: null },
    { id: 'settings', icon: '⚙️', label: 'Settings', badge: null },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">💼</span>
          <span className="logo-text">ExpenseFlow</span>
        </div>
      </div>

      <div className="user-profile">
        <div className="user-avatar">
          <img src={userProfile.avatar || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff'} alt="User" />
          <div className="status-dot"></div>
        </div>
        <div className="user-info">
          <div className="user-name">{userProfile.name}</div>
          <div className="user-role">{userProfile.role}</div>
        </div>
      </div>

      <div className="sidebar-search">
        <input type="text" placeholder="Search..." />
        <span className="search-icon">🔍</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="storage-info">
          <div className="storage-header">
            <span>Storage</span>
            <span>75%</span>
          </div>
          <div className="storage-bar">
            <div className="storage-fill" style={{ width: '75%' }}></div>
          </div>
          <div className="storage-text">7.5 GB of 10 GB used</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
