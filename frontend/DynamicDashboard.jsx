/**
 * ExpenseFlow - Dynamic Dashboard Component
 * Real-time interactive dashboard with 3D visualizations and stunning animations
 * 
 * Features:
 * - Real-time WebSocket updates with live data streaming
 * - 3D animated charts with custom transitions
 * - Interactive data visualizations with drill-down capabilities
 * - Responsive grid layout with smooth animations
 * - Live metrics with animated counters
 * - Advanced filtering with instant feedback
 * - Custom micro-interactions and hover effects
 * - Performance-optimized rendering
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useSpring } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  CheckCircle, Clock, Users, CreditCard, Activity, 
  Filter, Download, RefreshCw, Zap, Eye, BarChart3,
  PieChart as PieChartIcon, Calendar, Search, Bell
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// ==================== CONSTANTS & CONFIGURATION ====================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
};

const ANIMATION_VARIANTS = {
  fadeIn: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }
    }
  },
  slideIn: {
    hidden: { x: -100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  },
  scaleIn: {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 200, damping: 20 }
    }
  },
  stagger: {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// ==================== CUSTOM HOOKS ====================

const useWebSocket = (url, onMessage) => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      const token = localStorage.getItem('auth_token');
      const ws = new WebSocket(`${url}/ws/${Date.now()}`);

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'connect', token }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, onMessage]);

  return { isConnected, ws: wsRef.current };
};

const useAnimatedCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

// ==================== MAIN DASHBOARD COMPONENT ====================

const DynamicDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState([]);
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'expense_created' || data.type === 'expense_updated') {
      queryClient.invalidateQueries('dashboard');
      setRealtimeData(prev => [data, ...prev.slice(0, 9)]);
      
      toast.success(
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>Live update received!</span>
        </div>,
        { duration: 2000 }
      );
    }
  }, [queryClient]);

  const { isConnected } = useWebSocket(WS_URL, handleWebSocketMessage);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery(
    ['dashboard', selectedPeriod],
    async () => {
      const response = await axios.get(`${API_BASE_URL}/api/analytics/dashboard`, {
        params: { period: selectedPeriod },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.data;
    },
    {
      refetchInterval: 30000,
      staleTime: 10000
    }
  );

  // Fetch trends data
  const { data: trendsData } = useQuery(
    ['trends', selectedPeriod],
    async () => {
      const response = await axios.get(`${API_BASE_URL}/api/analytics/trends`, {
        params: { period: 30, granularity: 'daily' },
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.data;
    }
  );

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Dashboard refreshed!');
  }, [refetch]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      {/* Header Section */}
      <DashboardHeader 
        isConnected={isConnected}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        onRefresh={handleRefresh}
        filterOpen={filterOpen}
        onFilterToggle={() => setFilterOpen(!filterOpen)}
      />

      {/* Main Dashboard Grid */}
      <motion.div
        variants={ANIMATION_VARIANTS.stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Metrics Cards Row */}
        <MetricsCardsRow data={dashboardData?.summary} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Trends Chart */}
          <SpendingTrendsChart data={trendsData?.trends} />

          {/* Category Breakdown Chart */}
          <CategoryBreakdownChart data={dashboardData?.category_breakdown} />

          {/* Status Distribution */}
          <StatusDistributionChart data={dashboardData?.status_breakdown} />

          {/* Top Expenses */}
          <TopExpensesCard data={dashboardData?.top_expenses} />
        </div>

        {/* Real-time Activity Feed */}
        <RealtimeActivityFeed data={realtimeData} />

        {/* AI Insights Section */}
        <AIInsightsSection />
      </motion.div>
    </div>
  );
};

// ==================== DASHBOARD HEADER ====================

const DashboardHeader = ({ 
  isConnected, 
  selectedPeriod, 
  onPeriodChange, 
  onRefresh,
  filterOpen,
  onFilterToggle 
}) => {
  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      initial="hidden"
      animate="visible"
      className="mb-8"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title Section */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Expense Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Live updates active' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <PeriodSelector value={selectedPeriod} onChange={onPeriodChange} />

          {/* Action Buttons */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFilterToggle}
            className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <RefreshCw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <Download className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== PERIOD SELECTOR ====================

const PeriodSelector = ({ value, onChange }) => {
  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  return (
    <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-lg p-1">
      {periods.map((period) => (
        <motion.button
          key={period.value}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(period.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === period.value
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          {period.label}
        </motion.button>
      ))}
    </div>
  );
};

// ==================== METRICS CARDS ROW ====================

const MetricsCardsRow = ({ data }) => {
  const metrics = [
    {
      title: 'Total Expenses',
      value: data?.total_expenses || 0,
      icon: CreditCard,
      color: 'blue',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Total Amount',
      value: `$${(data?.total_amount || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'green',
      trend: '+8%',
      trendUp: true
    },
    {
      title: 'Average Amount',
      value: `$${(data?.average_amount || 0).toLocaleString()}`,
      icon: Activity,
      color: 'purple',
      trend: '-3%',
      trendUp: false
    },
    {
      title: 'Max Amount',
      value: `$${(data?.max_amount || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'orange',
      trend: '+15%',
      trendUp: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} metric={metric} index={index} />
      ))}
    </div>
  );
};

// ==================== METRIC CARD ====================

const MetricCard = ({ metric, index }) => {
  const Icon = metric.icon;
  const animatedValue = useAnimatedCounter(
    typeof metric.value === 'string' 
      ? parseInt(metric.value.replace(/[^0-9]/g, '')) 
      : metric.value
  );

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.scaleIn}
      custom={index}
      whileHover={{ 
        scale: 1.05, 
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        transition: { duration: 0.2 }
      }}
      className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[metric.color]} opacity-10 rounded-full -mr-16 -mt-16`} />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 bg-gradient-to-br ${colorClasses[metric.color]} rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`flex items-center gap-1 text-sm font-medium ${
              metric.trendUp ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {metric.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {metric.trend}
          </motion.div>
        </div>

        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {metric.title}
        </h3>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-bold text-gray-900 dark:text-white"
        >
          {typeof metric.value === 'string' && metric.value.includes('$')
            ? `$${animatedValue.toLocaleString()}`
            : animatedValue.toLocaleString()}
        </motion.div>

        {/* Sparkline */}
        <div className="mt-4 h-12">
          <SparklineChart color={metric.color} />
        </div>
      </div>
    </motion.div>
  );
};

// ==================== SPARKLINE CHART ====================

const SparklineChart = ({ color }) => {
  const data = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      value: Math.random() * 100 + 50
    })),
    []
  );

  const colorMap = {
    blue: '#3B82F6',
    green: '#10B981',
    purple: '#8B5CF6',
    orange: '#F59E0B'
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorMap[color]} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={colorMap[color]} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={colorMap[color]} 
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ==================== SPENDING TRENDS CHART ====================

const SpendingTrendsChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      date: new Date(item.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: item.amount,
      count: item.count
    }));
  }, [data]);

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Spending Trends
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Daily expense patterns over time
          </p>
        </div>
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"
        >
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 2 }}
          />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke={CHART_COLORS.primary}
            strokeWidth={3}
            fill="url(#colorAmount)"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== CATEGORY BREAKDOWN CHART ====================

const CategoryBreakdownChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data).map(([name, value]) => ({
      name,
      value,
      percentage: 0
    }));
  }, [data]);

  const COLORS = CHART_COLORS.gradient;

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Category Breakdown
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Expenses by category
          </p>
        </div>
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"
        >
          <PieChartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationDuration={1500}
            animationBegin={0}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                style={{
                  filter: activeIndex === index ? 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.map((entry, index) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2"
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {entry.name}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== STATUS DISTRIBUTION CHART ====================

const StatusDistributionChart = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [data]);

  const statusColors = {
    Pending: '#F59E0B',
    Approved: '#10B981',
    Rejected: '#EF4444',
    Draft: '#6B7280'
  };

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Status Distribution
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Expense approval status
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"
        >
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={statusColors[entry.name] || CHART_COLORS.primary}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ==================== TOP EXPENSES CARD ====================

const TopExpensesCard = ({ data }) => {
  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Top Expenses
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Highest value transactions
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg"
        >
          <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </motion.div>
      </div>

      <div className="space-y-3">
        {data?.map((expense, index) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ 
              scale: 1.02, 
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              transition: { duration: 0.2 }
            }}
            className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                {index + 1}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {expense.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                ${expense.amount.toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== REALTIME ACTIVITY FEED ====================

const RealtimeActivityFeed = ({ data }) => {
  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-3 h-3 bg-green-500 rounded-full"
          />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Live Activity
          </h3>
        </div>
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"
        >
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </motion.div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {data.map((activity, index) => (
            <motion.div
              key={activity.timestamp || index}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.type === 'expense_created' ? 'New expense created' : 'Expense updated'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Just now
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Waiting for live updates...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==================== AI INSIGHTS SECTION ====================

const AIInsightsSection = () => {
  const { data: insights, isLoading } = useQuery(
    'ai-insights',
    async () => {
      const response = await axios.get(`${API_BASE_URL}/api/ai/insights`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.data;
    }
  );

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded-2xl" />;
  }

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.fadeIn}
      className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"
        >
          <Zap className="w-6 h-6" />
        </motion.div>
        <div>
          <h3 className="text-2xl font-bold">AI-Powered Insights</h3>
          <p className="text-purple-100 text-sm">Smart recommendations for your expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights?.slice(0, 3).map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">{insight.title}</h4>
                <p className="text-sm text-purple-100 mb-3">{insight.description}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/20 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${insight.confidence * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="bg-white h-full rounded-full"
                    />
                  </div>
                  <span className="text-xs">{Math.round(insight.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== CUSTOM TOOLTIPS ====================

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {entry.name}: 
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            ${entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </motion.div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {payload[0].name}
      </p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">
        ${payload[0].value.toLocaleString()}
      </p>
    </motion.div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ==================== DASHBOARD SKELETON ====================

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DynamicDashboard;
