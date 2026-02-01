import React, { useState } from 'react';
import './Header.css';

const Header = ({ currentPage, userProfile }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, icon: '💰', title: 'New expense added', time: '2 min ago', unread: true },
    { id: 2, icon: '📊', title: 'Monthly report ready', time: '1 hour ago', unread: true },
    { id: 3, icon: '👥', title: 'Team member joined', time: '3 hours ago', unread: false },
    { id: 4, icon: '⚠️', title: 'Budget limit warning', time: '5 hours ago', unread: false },
  ];

  const pageTitles = {
    dashboard: 'Dashboard Overview',
    expenses: 'Expense Management',
    analytics: 'Analytics & Insights',
    reports: 'Financial Reports',
    budget: 'Budget Planning',
    categories: 'Category Management',
    team: 'Team Members',
    calendar: 'Calendar & Schedule',
    invoices: 'Invoice Management',
    settings: 'Settings & Preferences',
  };

  return (
    <header className="app-header-bar">
      <div className="header-left">
        <h1 className="page-title">{pageTitles[currentPage] || 'Dashboard'}</h1>
        <div className="breadcrumb">
          <span>Home</span>
          <span className="separator">/</span>
          <span className="current">{pageTitles[currentPage]}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <input type="text" placeholder="Search anything..." />
          <span className="search-icon">🔍</span>
        </div>

        <div className="header-actions">
          <button className="action-btn">
            <span>🌙</span>
          </button>

          <button className="action-btn">
            <span>🔔</span>
            <span className="notification-badge">4</span>
          </button>

          <button className="action-btn">
            <span>⚙️</span>
          </button>

          <div className="user-menu">
            <div className="user-avatar-small">
              <img src={userProfile.avatar || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff'} alt="User" />
            </div>
            <div className="user-details">
              <div className="user-name-small">{userProfile.name}</div>
              <div className="user-role-small">{userProfile.role}</div>
            </div>
            <span className="dropdown-arrow">▼</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
