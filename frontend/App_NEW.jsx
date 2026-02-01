import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    total_expenses: 0,
    total_amount: 0,
    average_amount: 0,
    categories: {}
  });
  const [loading, setLoading] = useState(true);
  const [userProfile] = useState({
    name: 'John Doe',
    role: 'Admin',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=667eea&color=fff'
  });

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/expenses`);
      const data = await response.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [fetchExpenses, fetchStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchExpenses();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchExpenses, fetchStats]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Loading ExpenseFlow...</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        userProfile={userProfile}
      />
      <div className="main-content">
        <Header 
          currentPage={currentPage}
          userProfile={userProfile}
        />
        <div className="page-content">
          {currentPage === 'dashboard' && (
            <Dashboard expenses={expenses} stats={stats} />
          )}
          {currentPage === 'expenses' && (
            <div className="coming-soon">
              <h1>💰 Expenses Page</h1>
              <p>Advanced expense management coming soon...</p>
            </div>
          )}
          {currentPage === 'analytics' && (
            <div className="coming-soon">
              <h1>📈 Analytics Page</h1>
              <p>Advanced analytics coming soon...</p>
            </div>
          )}
          {currentPage === 'reports' && (
            <div className="coming-soon">
              <h1>📋 Reports Page</h1>
              <p>Report builder coming soon...</p>
            </div>
          )}
          {currentPage === 'budget' && (
            <div className="coming-soon">
              <h1>💳 Budget Page</h1>
              <p>Budget management coming soon...</p>
            </div>
          )}
          {currentPage === 'categories' && (
            <div className="coming-soon">
              <h1>🏷️ Categories Page</h1>
              <p>Category management coming soon...</p>
            </div>
          )}
          {currentPage === 'team' && (
            <div className="coming-soon">
              <h1>👥 Team Page</h1>
              <p>Team management coming soon...</p>
            </div>
          )}
          {currentPage === 'calendar' && (
            <div className="coming-soon">
              <h1>📅 Calendar Page</h1>
              <p>Calendar view coming soon...</p>
            </div>
          )}
          {currentPage === 'invoices' && (
            <div className="coming-soon">
              <h1>🧾 Invoices Page</h1>
              <p>Invoice management coming soon...</p>
            </div>
          )}
          {currentPage === 'settings' && (
            <div className="coming-soon">
              <h1>⚙️ Settings Page</h1>
              <p>Settings panel coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
