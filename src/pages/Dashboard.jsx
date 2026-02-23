import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Package, DeliveryTruck, Check, WarningTriangle, DollarCircle,
  Clock, MapPin, StatUp, ArrowRight, Plus, Activity
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [chart, setChart] = useState([]);
  const [topZones, setTopZones] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      if (res.success) {
        setStats(res.data?.kpis || {});
        setChart(res.data?.daily_chart || []);
        setTopZones(res.data?.top_zones || []);
        setTopDrivers(res.data?.top_drivers || []);
      }
    } catch (e) {
      console.error('Stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    if (h >= 17 && h < 21) return 'Good evening';
    return 'Good night';
  };

  const formatTime = () => currentTime.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = () => currentTime.toLocaleDateString('en-AE', { weekday: 'long', month: 'long', day: 'numeric' });
  const fmtAED = (v) => `AED ${parseFloat(v || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const maxOrders = Math.max(...chart.map(d => d.orders || 0), 1);

  const lineData = {
    labels: chart.map(d => new Date(d.date).toLocaleDateString('en', { weekday: 'short' })),
    datasets: [{
      label: 'Orders',
      data: chart.map(d => d.orders || 0),
      borderColor: '#244066',
      backgroundColor: 'rgba(36,64,102,0.1)',
      fill: true, tension: 0.4, pointRadius: 4,
      pointBackgroundColor: '#244066',
    }]
  };
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#244066', cornerRadius: 8, padding: 12 } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  const statusData = {
    labels: ['Delivered', 'In Transit', 'Pending', 'Failed'],
    datasets: [{
      data: [stats.delivered_today || 0, stats.active_orders || 0, stats.pending_orders || 0, stats.failed_today || 0],
      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 0,
    }]
  };
  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 12 } } }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="loader-orbital">
            <div className="loader-core"></div>
            <div className="loader-ring loader-ring-1"></div>
            <div className="loader-ring loader-ring-2"></div>
          </div>
          <div className="loader-text" style={{ color: '#244066', fontSize: 16, fontWeight: 600, marginTop: 20 }}>
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <div className="greeting-time">
            <Clock width={16} height={16} />
            <span>{formatTime()}</span>
            <span className="date-divider">&bull;</span>
            <span>{formatDate()}</span>
          </div>
          <h1>{getGreeting()}, {user?.full_name || user?.username}</h1>
          <p className="welcome-subtitle">Here&apos;s your delivery operations overview</p>
        </div>
        <div className="header-actions">
          <Link to="/orders" className="btn-primary">
            <Plus width={18} height={18} />
            New Order
          </Link>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card primary">
          <div className="metric-icon" style={{ background: 'rgba(242,66,27,0.1)', color: '#f2421b' }}>
            <Package width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.orders_today || 0}</span>
            <span className="metric-label">Orders Today</span>
          </div>
          <div className="metric-trend positive">
            <StatUp width={14} height={14} />
            <span>Active: {stats.active_orders || 0}</span>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            <Check width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.delivered_today || 0}</span>
            <span className="metric-label">Delivered Today</span>
          </div>
          <div className="metric-trend positive">
            <StatUp width={14} height={14} />
            <span>Rate: {stats.success_rate || 0}%</span>
          </div>
        </div>

        <div className="metric-card tertiary">
          <div className="metric-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <DeliveryTruck width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value">{stats.available_drivers || 0}</span>
            <span className="metric-label">Available Drivers</span>
          </div>
          <div className="metric-trend">
            <Activity width={14} height={14} />
            <span>Pending: {stats.pending_orders || 0}</span>
          </div>
        </div>

        <div className="metric-card secondary">
          <div className="metric-icon" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
            <DollarCircle width={24} height={24} />
          </div>
          <div className="metric-content">
            <span className="metric-value" style={{ fontSize: 18 }}>{fmtAED(stats.revenue_today)}</span>
            <span className="metric-label">Revenue Today</span>
          </div>
          <div className="metric-trend">
            <StatUp width={14} height={14} />
            <span>Failed: {stats.failed_today || 0}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card sales-chart">
          <div className="chart-header">
            <div>
              <h3>Orders — Last 7 Days</h3>
              <p>Daily order volume trend</p>
            </div>
          </div>
          <div className="chart-body">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="chart-card pipeline-chart">
          <div className="chart-header">
            <div>
              <h3>Order Status Breakdown</h3>
            </div>
          </div>
          <div className="chart-body">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
          <div className="pipeline-total">
            <span className="total-label">Total Today</span>
            <span className="total-value">{stats.orders_today || 0}</span>
          </div>
        </div>
      </div>

      {/* Top Zones & Drivers */}
      <div className="recent-data-row">
        <div className="recent-card">
          <div className="card-header">
            <h3><MapPin width={20} height={20} /> Top Zones</h3>
            <Link to="/zones" className="view-all">View all <ArrowRight width={16} height={16} /></Link>
          </div>
          <div className="card-body">
            {topZones.length === 0 ? (
              <div className="empty-state-mini">
                <MapPin width={32} height={32} />
                <p>No zone data yet</p>
              </div>
            ) : (
              <div className="recent-list">
                {topZones.slice(0, 5).map((zone, i) => (
                  <div key={i} className="recent-item">
                    <div className="recent-avatar" style={{ background: '#244066' }}>
                      {i + 1}
                    </div>
                    <div className="recent-info">
                      <strong>{zone.name}</strong>
                      <span>{zone.emirate}</span>
                    </div>
                    <span className="status-badge" style={{ background: '#fff7ed', color: '#f97316' }}>
                      {zone.orders_count} orders
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="recent-card">
          <div className="card-header">
            <h3><DeliveryTruck width={20} height={20} /> Top Drivers</h3>
            <Link to="/drivers" className="view-all">View all <ArrowRight width={16} height={16} /></Link>
          </div>
          <div className="card-body">
            {topDrivers.length === 0 ? (
              <div className="empty-state-mini">
                <DeliveryTruck width={32} height={32} />
                <p>No driver data yet</p>
              </div>
            ) : (
              <div className="recent-list">
                {topDrivers.slice(0, 5).map((driver, i) => (
                  <div key={i} className="recent-item">
                    <div className="recent-avatar">
                      {driver.full_name?.charAt(0)}
                    </div>
                    <div className="recent-info">
                      <strong>{driver.full_name}</strong>
                      <span>{driver.vehicle_type} &bull; {driver.vehicle_plate}</span>
                    </div>
                    <span className={`status-badge ${driver.status === 'available' ? 'active' : ''}`}
                      style={{ background: driver.status === 'available' ? '#f0fdf4' : '#f1f5f9',
                               color:  driver.status === 'available' ? '#16a34a' : '#64748b' }}>
                      {driver.total_deliveries || 0} delivs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <Link to="/orders" className="quick-action-card">
            <div className="quick-action-icon"><Package width={24} height={24} /></div>
            <span>New Order</span>
          </Link>
          <Link to="/drivers" className="quick-action-card">
            <div className="quick-action-icon"><DeliveryTruck width={24} height={24} /></div>
            <span>Add Driver</span>
          </Link>
          <Link to="/dispatch" className="quick-action-card">
            <div className="quick-action-icon"><MapPin width={24} height={24} /></div>
            <span>Dispatch</span>
          </Link>
          <Link to="/clients" className="quick-action-card">
            <div className="quick-action-icon"><Activity width={24} height={24} /></div>
            <span>Clients</span>
          </Link>
          <Link to="/wallet" className="quick-action-card">
            <div className="quick-action-icon"><DollarCircle width={24} height={24} /></div>
            <span>Wallet</span>
          </Link>
          <Link to="/reports" className="quick-action-card">
            <div className="quick-action-icon"><StatUp width={24} height={24} /></div>
            <span>Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
