import React from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = ({ expenses, stats }) => {
  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  const categoryData = Object.entries(stats.categories || {}).map(([name, info]) => ({
    name,
    value: info.total,
    count: info.count
  }));

  const recentActivities = [
    { id: 1, icon: '💰', title: 'Office Supplies', amount: '$234.50', time: '2 min ago', type: 'expense' },
    { id: 2, icon: '🍽️', title: 'Team Lunch', amount: '$156.00', time: '1 hour ago', type: 'expense' },
    { id: 3, icon: '✈️', title: 'Flight Booking', amount: '$890.00', time: '3 hours ago', type: 'expense' },
    { id: 4, icon: '💻', title: 'Software License', amount: '$299.00', time: '5 hours ago', type: 'expense' },
  ];

  const upcomingSchedule = [
    { id: 1, icon: '📊', title: 'Budget Review Meeting', time: '09:30 AM', status: 'upcoming' },
    { id: 2, icon: '👥', title: 'Team Sync', time: '02:00 PM', status: 'upcoming' },
    { id: 3, icon: '📈', title: 'Monthly Report Due', time: '05:00 PM', status: 'urgent' },
  ];

  return (
    <div className="dashboard-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card-dash">
          <div className="stat-icon-dash" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            💰
          </div>
          <div className="stat-content-dash">
            <div className="stat-label-dash">Total Expenses</div>
            <div className="stat-value-dash">${stats.total_amount?.toFixed(2) || '0.00'}</div>
            <div className="stat-change-dash positive">+12.5% from last month</div>
          </div>
        </div>

        <div className="stat-card-dash">
          <div className="stat-icon-dash" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
            📊
          </div>
          <div className="stat-content-dash">
            <div className="stat-label-dash">Total Transactions</div>
            <div className="stat-value-dash">{stats.total_expenses || 0}</div>
            <div className="stat-change-dash positive">+8.3% from last month</div>
          </div>
        </div>

        <div className="stat-card-dash">
          <div className="stat-icon-dash" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
            📈
          </div>
          <div className="stat-content-dash">
            <div className="stat-label-dash">Average Expense</div>
            <div className="stat-value-dash">${stats.average_amount?.toFixed(2) || '0.00'}</div>
            <div className="stat-change-dash negative">-2.1% from last month</div>
          </div>
        </div>

        <div className="stat-card-dash">
          <div className="stat-icon-dash" style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)' }}>
            🏷️
          </div>
          <div className="stat-content-dash">
            <div className="stat-label-dash">Active Categories</div>
            <div className="stat-value-dash">{Object.keys(stats.categories || {}).length}</div>
            <div className="stat-change-dash">No change</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Financial Overview Chart */}
        <div className="dashboard-card large">
          <div className="card-header-dash">
            <div>
              <h3>Financial Overview</h3>
              <p>Jan 1, 2026 - Jan 28, 2026</p>
            </div>
            <select className="time-filter">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={categoryData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip contentStyle={{ background: 'rgba(10, 14, 39, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="value" stroke="#667eea" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="dashboard-card">
          <div className="card-header-dash">
            <h3>Category Distribution</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(10, 14, 39, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity and Schedule */}
      <div className="dashboard-grid-2">
        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="card-header-dash">
            <h3>Recent Activity</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="activity-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-details">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
                <div className="activity-amount">{activity.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="dashboard-card">
          <div className="card-header-dash">
            <h3>Upcoming Schedule</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="schedule-list">
            {upcomingSchedule.map(item => (
              <div key={item.id} className="schedule-item">
                <div className="schedule-icon">{item.icon}</div>
                <div className="schedule-details">
                  <div className="schedule-title">{item.title}</div>
                  <div className="schedule-time">{item.time}</div>
                </div>
                <span className={`schedule-status ${item.status}`}>
                  {item.status === 'urgent' ? '🔴' : '🟢'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
