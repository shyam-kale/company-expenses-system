import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import './App.css';

// ==================== CONSTANTS ====================
const API_URL = 'http://localhost:8000';

const COLORS = {
  primary: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
  categories: {
    Office: '#3b82f6',
    Meals: '#f59e0b',
    Travel: '#10b981',
    Software: '#8b5cf6',
    Hardware: '#ec4899',
    Marketing: '#f97316',
    Training: '#14b8a6',
    Other: '#6b7280'
  },
  gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b']
};

const CATEGORY_ICONS = {
  Office: '🏢',
  Meals: '🍽️',
  Travel: '✈️',
  Software: '💻',
  Hardware: '🖥️',
  Marketing: '📢',
  Training: '📚',
  Other: '📦'
};

// ==================== UTILITY FUNCTIONS ====================
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getPercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(1);
};

// ==================== ANIMATED STAT CARD COMPONENT ====================
const AnimatedStatCard = ({ title, value, icon, change, color, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), delay);
    
    // Animate number counting
    if (typeof value === 'number') {
      let start = 0;
      const duration = 1000;
      const increment = value / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setAnimatedValue(value);
          clearInterval(timer);
        } else {
          setAnimatedValue(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [value, delay]);

  return (
    <div 
      className={`stat-card ${isVisible ? 'visible' : ''}`}
      style={{ 
        animationDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${color}15, ${color}05)`
      }}
    >
      <div className="stat-card-header">
        <div className="stat-icon" style={{ background: `${color}20` }}>
          {icon}
        </div>
        <div className="stat-trend">
          {change > 0 ? '📈' : change < 0 ? '📉' : '➡️'}
          <span className={change > 0 ? 'positive' : change < 0 ? 'negative' : ''}>
            {Math.abs(change)}%
          </span>
        </div>
      </div>
      <div className="stat-content">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value" style={{ color }}>
          {typeof value === 'number' ? animatedValue : value}
        </div>
        <div className="stat-label">Updated just now</div>
      </div>
      <div className="stat-sparkline" style={{ background: `${color}10` }}></div>
    </div>
  );
};

// ==================== EXPENSE FORM COMPONENT ====================
const ExpenseForm = ({ onSubmit, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.date) newErrors.date = 'Date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });
      
      if (response.ok) {
        setFormData({
          title: '',
          amount: '',
          category: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        setErrors({});
        onSuccess?.();
        onSubmit?.();
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="expense-form-container">
      <div className="form-header">
        <h2>➕ Add New Expense</h2>
        <p>Track your spending with detailed categorization</p>
      </div>
      
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="title">
              Expense Title *
              {errors.title && <span className="error-text">{errors.title}</span>}
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Office Supplies"
              className={errors.title ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">
              Amount (USD) *
              {errors.amount && <span className="error-text">{errors.amount}</span>}
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={errors.amount ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">
              Category *
              {errors.category && <span className="error-text">{errors.category}</span>}
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Select category</option>
              {Object.keys(CATEGORY_ICONS).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">
              Date *
              {errors.date && <span className="error-text">{errors.date}</span>}
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={errors.date ? 'error' : ''}
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add any additional details..."
            rows="3"
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-small"></span>
              Processing...
            </>
          ) : (
            <>
              <span>💾</span>
              Add Expense
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// ==================== EXPENSE LIST COMPONENT ====================
const ExpenseList = ({ expenses, onDelete }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Filter by category
    if (filter !== 'all') {
      filtered = filtered.filter(exp => exp.category === filter);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(exp =>
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return filtered;
  }, [expenses, filter, sortBy, searchTerm]);

  return (
    <div className="expense-list-container">
      <div className="list-header">
        <h2>📋 Expense History</h2>
        
        <div className="list-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_ICONS).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </div>

      <div className="expense-list">
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No expenses found</h3>
            <p>Try adjusting your filters or add a new expense</p>
          </div>
        ) : (
          filteredExpenses.map((expense, index) => (
            <div 
              key={expense.id} 
              className="expense-item"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="expense-icon">
                {CATEGORY_ICONS[expense.category] || '📦'}
              </div>
              
              <div className="expense-details">
                <h3>{expense.title}</h3>
                <p className="expense-description">
                  {expense.description || 'No description provided'}
                </p>
                <div className="expense-meta">
                  <span className="expense-date">📅 {formatDate(expense.date)}</span>
                  <span 
                    className="expense-category-badge"
                    style={{ 
                      background: `${COLORS.categories[expense.category]}20`,
                      color: COLORS.categories[expense.category]
                    }}
                  >
                    {expense.category}
                  </span>
                </div>
              </div>

              <div className="expense-amount-section">
                <div className="expense-amount">
                  {formatCurrency(expense.amount)}
                </div>
                <button 
                  className="delete-btn"
                  onClick={() => onDelete?.(expense.id)}
                  title="Delete expense"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==================== CHARTS COMPONENT ====================
const ChartsSection = ({ expenses, stats }) => {
  // Prepare data for charts
  const categoryData = useMemo(() => {
    const data = Object.entries(stats.categories || {}).map(([name, info]) => ({
      name,
      value: info.total,
      count: info.count
    }));
    return data.sort((a, b) => b.value - a.value);
  }, [stats]);

  const trendData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expenses.filter(exp => exp.date === dateStr);
      const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: total,
        count: dayExpenses.length
      });
    }
    return last7Days;
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const months = {};
    expenses.forEach(exp => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short' });
      if (!months[month]) months[month] = 0;
      months[month] += exp.amount;
    });
    
    return Object.entries(months).map(([month, amount]) => ({
      month,
      amount
    }));
  }, [expenses]);

  return (
    <div className="charts-section">
      <div className="chart-grid">
        {/* Category Distribution Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🥧 Spending by Category</h3>
            <p>Distribution of expenses across categories</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS.categories[entry.name] || COLORS.gradient[index % COLORS.gradient.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  background: 'rgba(10, 14, 39, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Line Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 7-Day Spending Trend</h3>
            <p>Daily expense tracking over the past week</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  background: 'rgba(10, 14, 39, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#667eea" 
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Bar Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Category Breakdown</h3>
            <p>Total spending per category</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  background: 'rgba(10, 14, 39, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#764ba2" radius={[8, 8, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.categories[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>💹 Monthly Overview</h3>
            <p>Spending comparison across months</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  background: 'rgba(10, 14, 39, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#f093fb" 
                strokeWidth={3}
                dot={{ fill: '#f093fb', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP COMPONENT ====================
function App() {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    total_expenses: 0,
    total_amount: 0,
    average_amount: 0,
    categories: {}
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/expenses`);
      const data = await response.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showNotification('Error loading expenses', 'error');
    }
  }, []);

  // Fetch stats
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

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Delete expense
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        showNotification('Expense deleted successfully', 'success');
        fetchExpenses();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showNotification('Error deleting expense', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [fetchExpenses, fetchStats]);

  // Auto-refresh every 10 seconds
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
        <p>Preparing your financial dashboard</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.type === 'success' ? '✅' : '❌'}</span>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <span className="title-icon">💼</span>
              ExpenseFlow
            </h1>
            <p className="app-subtitle">Professional Expense Management System</p>
          </div>
          <div className="header-right">
            <div className="connection-status">
              <div className="status-dot"></div>
              <span>Connected</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Stats Cards */}
        <section className="stats-section">
          <AnimatedStatCard
            title="Total Expenses"
            value={stats.total_expenses}
            icon="📊"
            change={12.5}
            color="#667eea"
            delay={0}
          />
          <AnimatedStatCard
            title="Total Amount"
            value={formatCurrency(stats.total_amount)}
            icon="💰"
            change={8.3}
            color="#10b981"
            delay={100}
          />
          <AnimatedStatCard
            title="Average Expense"
            value={formatCurrency(stats.average_amount)}
            icon="📈"
            change={-2.1}
            color="#f59e0b"
            delay={200}
          />
          <AnimatedStatCard
            title="Categories"
            value={Object.keys(stats.categories).length}
            icon="🏷️"
            change={0}
            color="#8b5cf6"
            delay={300}
          />
        </section>

        {/* Charts */}
        <ChartsSection expenses={expenses} stats={stats} />

        {/* Expense Form */}
        <ExpenseForm 
          onSubmit={() => {
            fetchExpenses();
            fetchStats();
          }}
          onSuccess={() => showNotification('Expense added successfully!', 'success')}
        />

        {/* Expense List */}
        <ExpenseList 
          expenses={expenses} 
          onDelete={handleDelete}
        />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>© 2026 ExpenseFlow - Built with React & FastAPI</p>
        <p>Real-time expense tracking and analytics</p>
      </footer>
    </div>
  );
}

export default App;
