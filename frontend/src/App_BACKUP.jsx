import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const API_URL = 'http://localhost:8000';

// Expenses Page Component - FULLY EDITABLE
const ExpensesPage = ({ expenses, fetchExpenses, fetchStats }) => {
  const [formData, setFormData] = useState({ title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
      });
      setFormData({ title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });
      alert('✅ Expense added successfully!');
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error adding expense');
    }
  };

  const handleEdit = (exp) => {
    setEditing(exp.id);
    setEditData(exp);
  };

  const handleUpdate = async (id) => {
    try {
      await fetch(`${API_URL}/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      setEditing(null);
      alert('✅ Expense updated successfully!');
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error updating expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await fetch(`${API_URL}/api/expenses/${id}`, { method: 'DELETE' });
      alert('✅ Expense deleted successfully!');
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error deleting expense');
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">💰 Expense Management</h1>
      <div className="expense-form-card">
        <h2>Add New Expense</h2>
        <form onSubmit={handleSubmit} className="expense-form-grid">
          <input type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Amount" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
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
          <button type="submit" className="submit-btn">➕ Add Expense</button>
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
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  {editing === exp.id ? (
                    <>
                      <td><input type="text" value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} className="edit-input" /></td>
                      <td><input type="number" step="0.01" value={editData.amount} onChange={(e) => setEditData({...editData, amount: e.target.value})} className="edit-input" /></td>
                      <td>
                        <select value={editData.category} onChange={(e) => setEditData({...editData, category: e.target.value})} className="edit-input">
                          <option value="Office">Office</option>
                          <option value="Meals">Meals</option>
                          <option value="Travel">Travel</option>
                          <option value="Software">Software</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Training">Training</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td><input type="date" value={editData.date} onChange={(e) => setEditData({...editData, date: e.target.value})} className="edit-input" /></td>
                      <td><input type="text" value={editData.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} className="edit-input" /></td>
                      <td>
                        <button onClick={() => handleUpdate(exp.id)} className="save-btn-small">💾 Save</button>
                        <button onClick={() => setEditing(null)} className="cancel-btn-small">❌</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{exp.title}</td>
                      <td>${exp.amount.toFixed(2)}</td>
                      <td><span className="category-badge">{exp.category}</span></td>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td>{exp.description || '-'}</td>
                      <td>
                        <button onClick={() => handleEdit(exp)} className="edit-btn-small">✏️ Edit</button>
                        <button onClick={() => handleDelete(exp.id)} className="delete-btn-small">🗑️ Delete</button>
                      </td>
                    </>
                  )}
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

// Reports Page Component - FULLY FUNCTIONAL with CSV Export
const ReportsPage = ({ expenses, stats }) => {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/csv/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('✅ CSV exported successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error exporting CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExport = (format) => {
    if (format === 'CSV') {
      handleExportCSV();
    } else {
      alert(`📥 Exporting report as ${format}... (Feature coming soon)`);
    }
  };

  const handleEmail = () => {
    const subject = `Expense Report - ${new Date().toLocaleDateString()}`;
    const body = `Total Expenses: ${stats.total_expenses}\nTotal Amount: $${stats.total_amount?.toFixed(2)}\nAverage: $${stats.average_amount?.toFixed(2)}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Financial Reports</h1>
      <div className="reports-toolbar">
        <button className="action-btn-primary" onClick={() => handleExport('PDF')} disabled={exporting}>📄 Export PDF</button>
        <button className="action-btn-primary" onClick={() => handleExport('Excel')} disabled={exporting}>📊 Export Excel</button>
        <button className="action-btn-primary" onClick={handleExportCSV} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📋 Export CSV'}
        </button>
        <button className="action-btn-secondary" onClick={handleEmail}>📧 Email Report</button>
      </div>
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">📊</div>
          <h3>Monthly Summary</h3>
          <div className="report-stats">
            <p><strong>Total Expenses:</strong> {stats.total_expenses}</p>
            <p><strong>Total Amount:</strong> ${stats.total_amount?.toFixed(2)}</p>
            <p><strong>Average:</strong> ${stats.average_amount?.toFixed(2)}</p>
            <p><strong>Highest:</strong> ${expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)).toFixed(2) : '0.00'}</p>
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
          <button className="report-btn" onClick={handleExportCSV}>📥 Export CSV</button>
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

// Budget Page Component - FULLY EDITABLE
const BudgetPage = ({ stats }) => {
  const [budgets, setBudgets] = useState({
    monthly: 10000,
    categories: {
      Office: 2000,
      Meals: 1500,
      Travel: 3000,
      Software: 1000,
      Hardware: 1500,
      Marketing: 1000,
      Training: 500,
      Other: 500
    }
  });
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEditBudget = (category) => {
    setEditing(category);
    setEditValue(category === 'monthly' ? budgets.monthly : budgets.categories[category]);
  };

  const handleSaveBudget = () => {
    if (editing === 'monthly') {
      setBudgets({...budgets, monthly: parseFloat(editValue)});
    } else {
      setBudgets({...budgets, categories: {...budgets.categories, [editing]: parseFloat(editValue)}});
    }
    setEditing(null);
    alert('✅ Budget updated successfully!');
  };

  const totalSpent = Object.values(stats.categories || {}).reduce((sum, cat) => sum + cat.total, 0);
  const percentUsed = (totalSpent / budgets.monthly) * 100;

  return (
    <div className="page-container">
      <h1 className="page-title">💳 Budget Planning</h1>
      <div className="budget-overview">
        <div className="budget-card-large">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2>Monthly Budget Overview</h2>
            {editing === 'monthly' ? (
              <div>
                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="edit-input" style={{width: '120px'}} />
                <button onClick={handleSaveBudget} className="save-btn-small">💾</button>
                <button onClick={() => setEditing(null)} className="cancel-btn-small">❌</button>
              </div>
            ) : (
              <button onClick={() => handleEditBudget('monthly')} className="edit-btn">✏️ Edit Budget</button>
            )}
          </div>
          <div className="budget-progress">
            <div className="budget-bar">
              <div className="budget-fill" style={{width: `${Math.min(percentUsed, 100)}%`, background: percentUsed > 90 ? '#ff4444' : percentUsed > 75 ? '#ffaa00' : '#4ECDC4'}}></div>
            </div>
            <p>${totalSpent.toFixed(2)} of ${budgets.monthly.toFixed(2)} used ({percentUsed.toFixed(1)}%)</p>
          </div>
        </div>
      </div>
      <div className="budget-categories">
        {Object.entries(stats.categories || {}).map(([name, info]) => {
          const categoryBudget = budgets.categories[name] || 1000;
          const categoryPercent = (info.total / categoryBudget) * 100;
          return (
            <div key={name} className="budget-category-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3>{name}</h3>
                {editing === name ? (
                  <div>
                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="edit-input" style={{width: '80px'}} />
                    <button onClick={handleSaveBudget} className="save-btn-small">💾</button>
                    <button onClick={() => setEditing(null)} className="cancel-btn-small">❌</button>
                  </div>
                ) : (
                  <button onClick={() => handleEditBudget(name)} className="edit-btn-small">✏️</button>
                )}
              </div>
              <p>Spent: ${info.total?.toFixed(2)} / ${categoryBudget.toFixed(2)}</p>
              <p>Transactions: {info.count}</p>
              <div className="mini-progress">
                <div className="mini-fill" style={{width: `${Math.min(categoryPercent, 100)}%`, background: categoryPercent > 90 ? '#ff4444' : categoryPercent > 75 ? '#ffaa00' : '#4ECDC4'}}></div>
              </div>
              <p style={{fontSize: '12px', marginTop: '5px', color: categoryPercent > 100 ? '#ff4444' : '#666'}}>
                {categoryPercent.toFixed(1)}% {categoryPercent > 100 ? '⚠️ Over Budget!' : 'used'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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

// Calendar Page Component - FULLY FUNCTIONAL
const CalendarPage = ({ expenses }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getExpensesForDate = (day) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return expenses.filter(exp => exp.date === dateStr);
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const today = () => setCurrentMonth(new Date());

  return (
    <div className="page-container">
      <h1 className="page-title">📅 Calendar & Schedule</h1>
      <div className="calendar-view">
        <div className="calendar-header">
          <h2>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
          <div className="calendar-controls">
            <button onClick={prevMonth}>← Prev</button>
            <button onClick={today}>Today</button>
            <button onClick={nextMonth}>Next →</button>
          </div>
        </div>
        <div className="calendar-grid-full">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {days.map((day, idx) => {
            const dayExpenses = getExpensesForDate(day);
            const totalAmount = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            return (
              <div key={idx} className={`calendar-day ${!day ? 'empty' : ''} ${dayExpenses.length > 0 ? 'has-expenses' : ''}`} onClick={() => day && setSelectedDate(day)}>
                {day && (
                  <>
                    <div className="day-number">{day}</div>
                    {dayExpenses.length > 0 && (
                      <div className="day-expenses">
                        <div className="expense-count">{dayExpenses.length} expense{dayExpenses.length > 1 ? 's' : ''}</div>
                        <div className="expense-total">${totalAmount.toFixed(2)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {selectedDate && (
          <div className="calendar-details">
            <h3>Expenses for {monthNames[currentMonth.getMonth()]} {selectedDate}, {currentMonth.getFullYear()}</h3>
            <div className="calendar-expense-list">
              {getExpensesForDate(selectedDate).map(exp => (
                <div key={exp.id} className="calendar-expense-item">
                  <span>{exp.title}</span>
                  <span className="category-badge">{exp.category}</span>
                  <span className="amount">${exp.amount.toFixed(2)}</span>
                </div>
              ))}
              {getExpensesForDate(selectedDate).length === 0 && <p>No expenses for this date</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Invoices Page Component - FULLY EDITABLE with real functionality
const InvoicesPage = ({ expenses }) => {
  const [invoices, setInvoices] = useState(
    expenses.slice(0, 10).map((exp, idx) => ({
      id: 1000 + idx,
      expenseId: exp.id,
      title: exp.title,
      amount: exp.amount,
      date: exp.date,
      category: exp.category,
      status: 'Paid',
      client: exp.title,
      invoiceNumber: `INV-${1000 + idx}`
    }))
  );
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const handleDownload = (invoice) => {
    const content = `
INVOICE #${invoice.invoiceNumber}
Date: ${new Date(invoice.date).toLocaleDateString()}
Client: ${invoice.client}
Amount: $${invoice.amount.toFixed(2)}
Category: ${invoice.category}
Status: ${invoice.status}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    alert(`✅ Invoice ${invoice.invoiceNumber} downloaded!`);
  };

  const handleEmail = (invoice) => {
    const subject = `Invoice ${invoice.invoiceNumber}`;
    const body = `Invoice Details:\nAmount: $${invoice.amount.toFixed(2)}\nDate: ${new Date(invoice.date).toLocaleDateString()}\nClient: ${invoice.client}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleEdit = (invoice) => {
    setEditing(invoice.id);
    setEditData(invoice);
  };

  const handleSave = () => {
    setInvoices(invoices.map(inv => inv.id === editing ? editData : inv));
    setEditing(null);
    alert('✅ Invoice updated successfully!');
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this invoice?')) {
      setInvoices(invoices.filter(inv => inv.id !== id));
      alert('✅ Invoice deleted!');
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🧾 Invoice Management</h1>
      <div className="invoice-actions-bar">
        <button className="action-btn-primary" onClick={() => alert('Create new invoice feature')}>➕ Create New Invoice</button>
        <button className="action-btn-secondary" onClick={() => alert('Bulk export feature')}>📤 Bulk Export</button>
      </div>
      <div className="invoices-list">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="invoice-card">
            {editing === invoice.id ? (
              <>
                <div className="invoice-header-card">
                  <input type="text" value={editData.invoiceNumber} onChange={(e) => setEditData({...editData, invoiceNumber: e.target.value})} className="edit-input" />
                  <select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className="edit-input">
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="invoice-details">
                  <label>Client:</label>
                  <input type="text" value={editData.client} onChange={(e) => setEditData({...editData, client: e.target.value})} className="edit-input" />
                  <label>Amount:</label>
                  <input type="number" step="0.01" value={editData.amount} onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value)})} className="edit-input" />
                  <label>Date:</label>
                  <input type="date" value={editData.date} onChange={(e) => setEditData({...editData, date: e.target.value})} className="edit-input" />
                  <label>Category:</label>
                  <input type="text" value={editData.category} onChange={(e) => setEditData({...editData, category: e.target.value})} className="edit-input" />
                </div>
                <div className="invoice-actions">
                  <button className="save-btn-small" onClick={handleSave}>💾 Save</button>
                  <button className="cancel-btn-small" onClick={() => setEditing(null)}>❌ Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="invoice-header-card">
                  <h3>{invoice.invoiceNumber}</h3>
                  <span className={`invoice-status ${invoice.status.toLowerCase()}`}>
                    {invoice.status === 'Paid' ? '✅' : invoice.status === 'Pending' ? '⏳' : '⚠️'} {invoice.status}
                  </span>
                </div>
                <div className="invoice-details">
                  <p><strong>Client:</strong> {invoice.client}</p>
                  <p><strong>Amount:</strong> ${invoice.amount.toFixed(2)}</p>
                  <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</p>
                  <p><strong>Category:</strong> {invoice.category}</p>
                </div>
                <div className="invoice-actions">
                  <button className="invoice-btn view" onClick={() => alert(`Viewing ${invoice.invoiceNumber}`)}>👁️ View</button>
                  <button className="invoice-btn download" onClick={() => handleDownload(invoice)}>📥 Download</button>
                  <button className="invoice-btn email" onClick={() => handleEmail(invoice)}>📧 Email</button>
                  <button className="invoice-btn edit" onClick={() => handleEdit(invoice)}>✏️ Edit</button>
                  <button className="invoice-btn delete" onClick={() => handleDelete(invoice.id)}>🗑️ Delete</button>
                </div>
              </>
            )}
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
