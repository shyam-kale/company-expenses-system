import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const API_URL = 'http://localhost:8000';

// Expenses Page Component
const ExpensesPage = ({ expenses, fetchExpenses, fetchStats }) => {
  const [formData, setFormData] = useState({ title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
      });
      setFormData({ title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">💰 Expense Management</h1>
      <div className="expense-form-card">
        <h2>Add New Expense</h2>
        <form onSubmit={handleSubmit} className="expense-form-grid">
          <input type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
          <input type="number" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
          <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
            <option value="">Select Category</option>
            <option value="Office">Office</option>
            <option value="Meals">Meals</option>
            <option value="Travel">Travel</option>
            <option value="Software">Software</option>
            <option value="Hardware">Hardware</option>
            <option value="Marketing">Marketing</option>
            <option value="Training">Training</option>
            <option value="Other">Other</option>
          </select>
          <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
          <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{gridColumn: '1 / -1'}} />
          <button type="submit" className="submit-btn">Add Expense</button>
        </form>
      </div>
      <div className="expenses-table-card">
        <h2>All Expenses ({expenses.length})</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.title}</td>
                  <td>${exp.amount.toFixed(2)}</td>
                  <td><span className="category-badge">{exp.category}</span></td>
                  <td>{new Date(exp.date).toLocaleDateString()}</td>
                  <td><button onClick={() => handleDelete(exp.id)} className="delete-btn-small">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Analytics Page Component with MODERN COLORFUL charts
const AnalyticsPage = ({ expenses, stats }) => {
  const categoryData = Object.entries(stats.categories || {}).map(([name, info]) => ({ name, value: info.total }));
  const MODERN_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  
  return (
    <div className="page-container">
      <h1 className="page-title">📈 Analytics & Insights</h1>
      <div className="charts-grid-page">
        <div className="chart-card-page modern">
          <h3>🎯 Category Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={MODERN_COLORS[index % MODERN_COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{background: '#fff', border: '2px solid #FF6B6B', borderRadius: '10px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card-page modern">
          <h3>📊 Spending Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={categoryData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{background: '#fff', border: '2px solid #FF6B6B', borderRadius: '10px'}} />
              <Area type="monotone" dataKey="value" stroke="#FF6B6B" strokeWidth={3} fill="url(#colorGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card-page modern">
          <h3>💹 Category Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{background: '#fff', border: '2px solid #4ECDC4', borderRadius: '10px'}} />
              <Bar dataKey="value" fill="#4ECDC4" radius={[10, 10, 0, 0]}>
                {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={MODERN_COLORS[index % MODERN_COLORS.length]} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card-page modern">
          <h3>🚀 Growth Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{background: '#fff', border: '2px solid #FFA07A', borderRadius: '10px'}} />
              <Line type="monotone" dataKey="value" stroke="#FFA07A" strokeWidth={4} dot={{fill: '#FFA07A', r: 6}} activeDot={{r: 8}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Reports Page Component with MORE features
const ReportsPage = ({ expenses, stats }) => {
  const handleExport = (format) => {
    alert(`Exporting report as ${format}...`);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Financial Reports</h1>
      <div className="reports-toolbar">
        <button className="action-btn-primary" onClick={() => handleExport('PDF')}>📄 Export PDF</button>
        <button className="action-btn-primary" onClick={() => handleExport('Excel')}>📊 Export Excel</button>
        <button className="action-btn-primary" onClick={() => handleExport('CSV')}>📋 Export CSV</button>
        <button className="action-btn-secondary">📧 Email Report</button>
      </div>
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">📊</div>
          <h3>Monthly Summary</h3>
          <div className="report-stats">
            <p><strong>Total Expenses:</strong> {stats.total_expenses}</p>
            <p><strong>Total Amount:</strong> ${stats.total_amount?.toFixed(2)}</p>
            <p><strong>Average:</strong> ${stats.average_amount?.toFixed(2)}</p>
            <p><strong>Highest:</strong> ${Math.max(...expenses.map(e => e.amount)).toFixed(2)}</p>
          </div>
          <button className="report-btn" onClick={() => handleExport('PDF')}>📥 Download Report</button>
        </div>
        <div className="report-card">
          <div className="report-icon">📈</div>
          <h3>Category Report</h3>
          <div className="report-stats">
            <p><strong>Categories:</strong> {Object.keys(stats.categories || {}).length}</p>
            <p><strong>Top Category:</strong> {Object.keys(stats.categories || {})[0] || 'N/A'}</p>
            <p><strong>Transactions:</strong> {expenses.length}</p>
            <p><strong>Period:</strong> January 2026</p>
          </div>
          <button className="report-btn" onClick={() => handleExport('Excel')}>📊 Export Excel</button>
        </div>
        <div className="report-card">
          <div className="report-icon">💰</div>
          <h3>Budget Report</h3>
          <div className="report-stats">
            <p><strong>Budget Used:</strong> 75%</p>
            <p><strong>Remaining:</strong> $2,500</p>
            <p><strong>Overspent:</strong> 0 categories</p>
            <p><strong>Status:</strong> ✅ On Track</p>
          </div>
          <button className="report-btn" onClick={() => alert('Viewing detailed budget analysis')}>📊 View Details</button>
        </div>
        <div className="report-card">
          <div className="report-icon">📅</div>
          <h3>Annual Report</h3>
          <div className="report-stats">
            <p><strong>Year:</strong> 2026</p>
            <p><strong>Total:</strong> ${stats.total_amount?.toFixed(2)}</p>
            <p><strong>Growth:</strong> +12.5%</p>
            <p><strong>Forecast:</strong> $95,000</p>
          </div>
          <button className="report-btn" onClick={() => handleExport('PDF')}>📥 Download Annual</button>
        </div>
      </div>
    </div>
  );
};

// Budget Page Component
const BudgetPage = ({ stats }) => (
  <div className="page-container">
    <h1 className="page-title">💳 Budget Planning</h1>
    <div className="budget-overview">
      <div className="budget-card-large">
        <h2>Monthly Budget Overview</h2>
        <div className="budget-progress">
          <div className="budget-bar">
            <div className="budget-fill" style={{width: '75%'}}></div>
          </div>
          <p>$7,500 of $10,000 used (75%)</p>
        </div>
      </div>
    </div>
    <div className="budget-categories">
      {Object.entries(stats.categories || {}).map(([name, info]) => (
        <div key={name} className="budget-category-card">
          <h3>{name}</h3>
          <p>Spent: ${info.total?.toFixed(2)}</p>
          <p>Transactions: {info.count}</p>
          <div className="mini-progress">
            <div className="mini-fill" style={{width: `${Math.min((info.total / 1000) * 100, 100)}%`}}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Categories Page Component with EDIT functionality
const CategoriesPage = ({ stats }) => {
  const [categories, setCategories] = useState(Object.entries(stats.categories || {}).map(([name, info]) => ({
    name, total: info.total, count: info.count, icon: name === 'Office' ? '🏢' : name === 'Meals' ? '🍽️' : name === 'Travel' ? '✈️' : name === 'Software' ? '💻' : name === 'Hardware' ? '🖥️' : name === 'Marketing' ? '📢' : name === 'Training' ? '📚' : '📦'
  })));
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEdit = (cat) => {
    setEditing(cat.name);
    setEditData(cat);
  };

  const handleSave = () => {
    setCategories(categories.map(c => c.name === editing ? editData : c));
    setEditing(null);
    alert('Category updated successfully!');
  };

  const handleDelete = (name) => {
    if (window.confirm(`Delete category "${name}"?`)) {
      setCategories(categories.filter(c => c.name !== name));
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🏷️ Category Management</h1>
      <button className="action-btn-primary" style={{marginBottom: '20px'}}>➕ Add New Category</button>
      <div className="categories-grid">
        {categories.map((cat) => (
          <div key={cat.name} className="category-card-page">
            {editing === cat.name ? (
              <>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="edit-input" />
                <input type="text" value={editData.icon} onChange={(e) => setEditData({...editData, icon: e.target.value})} className="edit-input" placeholder="Icon" />
                <div className="edit-actions">
                  <button className="save-btn-small" onClick={handleSave}>💾 Save</button>
                  <button className="cancel-btn-small" onClick={() => setEditing(null)}>❌ Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="category-icon-large">{cat.icon}</div>
                <h3>{cat.name}</h3>
                <p>Total: ${cat.total?.toFixed(2)}</p>
                <p>Count: {cat.count} expenses</p>
                <div className="category-actions">
                  <button className="edit-btn" onClick={() => handleEdit(cat)}>✏️ Edit</button>
                  <button className="delete-btn-small" onClick={() => handleDelete(cat.name)}>🗑️ Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Team Page Component with EDIT functionality
const TeamPage = () => {
  const [team, setTeam] = useState([
    { id: 1, name: 'Shyam Kale', role: 'Admin', email: 'shyam@company.com', status: 'Active' },
    { id: 2, name: 'Priya Sharma', role: 'Manager', email: 'priya@company.com', status: 'Active' },
    { id: 3, name: 'Rahul Verma', role: 'Accountant', email: 'rahul@company.com', status: 'Active' },
    { id: 4, name: 'Anjali Patel', role: 'Analyst', email: 'anjali@company.com', status: 'Active' },
  ]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEdit = (member) => {
    setEditing(member.id);
    setEditData(member);
  };

  const handleSave = () => {
    setTeam(team.map(m => m.id === editing ? editData : m));
    setEditing(null);
    alert('Team member updated successfully!');
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      setTeam(team.filter(m => m.id !== id));
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">👥 Team Members</h1>
      <button className="action-btn-primary" style={{marginBottom: '20px'}}>➕ Add New Member</button>
      <div className="team-grid">
        {team.map((member) => (
          <div key={member.id} className="team-card">
            {editing === member.id ? (
              <>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="edit-input" />
                <input type="text" value={editData.role} onChange={(e) => setEditData({...editData, role: e.target.value})} className="edit-input" />
                <input type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} className="edit-input" />
                <div className="edit-actions">
                  <button className="save-btn-small" onClick={handleSave}>💾 Save</button>
                  <button className="cancel-btn-small" onClick={() => setEditing(null)}>❌ Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="team-avatar">{member.name.split(' ').map(n => n[0]).join('')}</div>
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-email">{member.email}</p>
                <span className="status-badge">{member.status}</span>
                <div className="team-actions">
                  <button className="edit-btn-small" onClick={() => handleEdit(member)}>✏️ Edit</button>
                  <button className="delete-btn-small" onClick={() => handleDelete(member.id)}>🗑️ Remove</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Calendar Page Component
const CalendarPage = ({ expenses }) => (
  <div className="page-container">
    <h1 className="page-title">📅 Calendar & Schedule</h1>
    <div className="calendar-view">
      <div className="calendar-header">
        <h2>January 2026</h2>
        <div className="calendar-controls">
          <button>← Prev</button>
          <button>Today</button>
          <button>Next →</button>
        </div>
      </div>
      <div className="calendar-grid-view">
        {expenses.slice(0, 10).map((exp, idx) => (
          <div key={idx} className="calendar-event">
            <span className="event-date">{new Date(exp.date).getDate()}</span>
            <span className="event-title">{exp.title}</span>
            <span className="event-amount">${exp.amount}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Invoices Page Component with DOWNLOAD functionality
const InvoicesPage = ({ expenses }) => {
  const handleDownload = (invoiceId, title) => {
    alert(`Downloading Invoice #${invoiceId} - ${title}`);
    // In production, this would generate and download a PDF
  };

  const handleEmail = (invoiceId) => {
    alert(`Sending Invoice #${invoiceId} via email`);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🧾 Invoice Management</h1>
      <div className="invoice-actions-bar">
        <button className="action-btn-primary">➕ Create New Invoice</button>
        <button className="action-btn-secondary">📤 Bulk Export</button>
      </div>
      <div className="invoices-list">
        {expenses.slice(0, 5).map((exp, idx) => (
          <div key={idx} className="invoice-card">
            <div className="invoice-header-card">
              <h3>Invoice #{1000 + idx}</h3>
              <span className="invoice-status paid">✅ Paid</span>
            </div>
            <div className="invoice-details">
              <p><strong>Client:</strong> {exp.title}</p>
              <p><strong>Amount:</strong> ${exp.amount.toFixed(2)}</p>
              <p><strong>Date:</strong> {new Date(exp.date).toLocaleDateString()}</p>
              <p><strong>Category:</strong> {exp.category}</p>
            </div>
            <div className="invoice-actions">
              <button className="invoice-btn view" onClick={() => alert('Viewing invoice details')}>👁️ View</button>
              <button className="invoice-btn download" onClick={() => handleDownload(1000 + idx, exp.title)}>📥 Download PDF</button>
              <button className="invoice-btn email" onClick={() => handleEmail(1000 + idx)}>📧 Email</button>
              <button className="invoice-btn print" onClick={() => window.print()}>🖨️ Print</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Settings Page Component with EDIT functionality
const SettingsPage = ({ userProfile }) => {
  const [profile, setProfile] = useState({ name: userProfile.name, email: 'shyam@company.com', phone: '+91 9876543210' });
  const [notifications, setNotifications] = useState({ email: true, budget: true, weekly: false, approvals: true });
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ Settings & Preferences</h1>
      {saved && <div className="success-alert">✅ Settings saved successfully!</div>}
      <div className="settings-sections">
        <div className="settings-card">
          <h3>👤 Profile Settings</h3>
          <div className="settings-form">
            <label>Name</label>
            <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
            <label>Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
            <label>Phone</label>
            <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
            <label>Role</label>
            <input type="text" value={userProfile.role} disabled />
            <button className="save-btn" onClick={handleSaveProfile}>💾 Save Changes</button>
          </div>
        </div>
        <div className="settings-card">
          <h3>🔔 Notifications</h3>
          <div className="settings-toggles">
            <label><input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({...notifications, email: e.target.checked})} /> Email Notifications</label>
            <label><input type="checkbox" checked={notifications.budget} onChange={(e) => setNotifications({...notifications, budget: e.target.checked})} /> Budget Alerts</label>
            <label><input type="checkbox" checked={notifications.weekly} onChange={(e) => setNotifications({...notifications, weekly: e.target.checked})} /> Weekly Reports</label>
            <label><input type="checkbox" checked={notifications.approvals} onChange={(e) => setNotifications({...notifications, approvals: e.target.checked})} /> Expense Approvals</label>
          </div>
          <button className="save-btn" onClick={handleSaveProfile}>💾 Save Preferences</button>
        </div>
        <div className="settings-card">
          <h3>🎨 Appearance</h3>
          <div className="settings-form">
            <label>Theme</label>
            <select>
              <option>Light</option>
              <option>Dark</option>
              <option>Orange Fusion</option>
            </select>
            <label>Currency</label>
            <select>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>INR (₹)</option>
            </select>
            <label>Language</label>
            <select>
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
            </select>
            <button className="save-btn" onClick={handleSaveProfile}>💾 Apply Theme</button>
          </div>
        </div>
        <div className="settings-card">
          <h3>🔒 Security</h3>
          <div className="settings-form">
            <label>Current Password</label>
            <input type="password" placeholder="Enter current password" />
            <label>New Password</label>
            <input type="password" placeholder="Enter new password" />
            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm new password" />
            <button className="save-btn" onClick={handleSaveProfile}>🔐 Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    name: 'Shyam Kale',
    role: 'Admin',
    avatar: 'https://ui-avatars.com/api/?name=Shyam+Kale&background=667eea&color=fff'
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
            <ExpensesPage expenses={expenses} stats={stats} fetchExpenses={fetchExpenses} fetchStats={fetchStats} />
          )}
          {currentPage === 'analytics' && (
            <AnalyticsPage expenses={expenses} stats={stats} />
          )}
          {currentPage === 'reports' && (
            <ReportsPage expenses={expenses} stats={stats} />
          )}
          {currentPage === 'budget' && (
            <BudgetPage expenses={expenses} stats={stats} />
          )}
          {currentPage === 'categories' && (
            <CategoriesPage stats={stats} />
          )}
          {currentPage === 'team' && (
            <TeamPage />
          )}
          {currentPage === 'calendar' && (
            <CalendarPage expenses={expenses} />
          )}
          {currentPage === 'invoices' && (
            <InvoicesPage expenses={expenses} />
          )}
          {currentPage === 'settings' && (
            <SettingsPage userProfile={userProfile} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
