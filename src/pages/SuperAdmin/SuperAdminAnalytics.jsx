import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building, User, Package, CheckCircle, Clock,
  Xmark, DeliveryTruck, GraphUp, StatsReport, Refresh,
  Calendar, Cash
} from 'iconoir-react';
import './SuperAdmin.css';

const API = import.meta.env.VITE_API_URL || '/api';

const SuperAdminAnalytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`${API}/super-admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Analytics fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString();
  const fmtCur = (n) => `AED ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="sa-loading-page">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const { tenants = {}, users = {}, orders = {}, ordersByMonth = [], topTenants = [], activeSessions = 0 } = data || {};

  const deliveryRate = orders.total_orders > 0
    ? ((orders.delivered / orders.total_orders) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Platform Analytics</h1>
          <p>Comprehensive overview of platform performance</p>
        </div>
        <button className="sa-primary-btn" onClick={fetchAnalytics}>
          <Refresh size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="sa-stats-grid sa-stats-5">
        <div className="sa-stat-card">
          <div className="sa-stat-icon primary"><Building size={22} /></div>
          <div className="sa-stat-content">
            <h3>{fmt(tenants.total_tenants)}</h3>
            <p>Total Tenants</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon success"><User size={22} /></div>
          <div className="sa-stat-content">
            <h3>{fmt(users.total_users)}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon info"><Package size={22} /></div>
          <div className="sa-stat-content">
            <h3>{fmt(orders.total_orders)}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon accent"><Cash size={22} /></div>
          <div className="sa-stat-content">
            <h3>{fmtCur(orders.total_revenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-icon warning"><GraphUp size={22} /></div>
          <div className="sa-stat-content">
            <h3>{activeSessions}</h3>
            <p>Active (24h)</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="sa-analytics-grid">

        {/* Tenant Breakdown */}
        <div className="sa-card">
          <div className="sa-card-header"><h2>Tenant Status</h2></div>
          <div className="sa-breakdown-list">
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot success" /> Active</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill success" style={{ width: `${tenants.total_tenants ? (tenants.active / tenants.total_tenants * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(tenants.active)}</span>
            </div>
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot warning" /> Trial</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill warning" style={{ width: `${tenants.total_tenants ? (tenants.trial / tenants.total_tenants * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(tenants.trial)}</span>
            </div>
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot danger" /> Suspended</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill danger" style={{ width: `${tenants.total_tenants ? (tenants.suspended / tenants.total_tenants * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(tenants.suspended)}</span>
            </div>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="sa-card">
          <div className="sa-card-header"><h2>User Roles</h2></div>
          <div className="sa-breakdown-list">
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot primary" /> Admins</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill primary" style={{ width: `${users.total_users ? (users.admins / users.total_users * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(users.admins)}</span>
            </div>
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot info" /> Dispatchers</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill info" style={{ width: `${users.total_users ? (users.dispatchers / users.total_users * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(users.dispatchers)}</span>
            </div>
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot success" /> Drivers</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill success" style={{ width: `${users.total_users ? (users.drivers / users.total_users * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(users.drivers)}</span>
            </div>
            <div className="sa-breakdown-item">
              <div className="sa-breakdown-label"><span className="sa-dot secondary" /> Active</div>
              <div className="sa-breakdown-bar">
                <div className="sa-bar-fill secondary" style={{ width: `${users.total_users ? (users.active_users / users.total_users * 100) : 0}%` }} />
              </div>
              <span className="sa-breakdown-val">{fmt(users.active_users)}</span>
            </div>
          </div>
        </div>

        {/* Order Performance */}
        <div className="sa-card">
          <div className="sa-card-header"><h2>Order Performance</h2></div>
          <div className="sa-perf-stats">
            <div className="sa-perf-circle">
              <svg viewBox="0 0 36 36" className="sa-circular-chart">
                <path className="sa-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="sa-circle-fg" strokeDasharray={`${deliveryRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <text x="18" y="20.35" className="sa-circle-text">{deliveryRate}%</text>
              </svg>
              <p>Delivery Rate</p>
            </div>
            <div className="sa-perf-details">
              <div className="sa-perf-row"><span>Delivered</span><strong>{fmt(orders.delivered)}</strong></div>
              <div className="sa-perf-row"><span>In Progress</span><strong>{fmt(orders.in_progress)}</strong></div>
              <div className="sa-perf-row"><span>Pending</span><strong>{fmt(orders.pending)}</strong></div>
              <div className="sa-perf-row"><span>Cancelled</span><strong>{fmt(orders.cancelled)}</strong></div>
              <div className="sa-perf-row sa-perf-highlight"><span>Avg Order Value</span><strong>{fmtCur(orders.avg_order_value)}</strong></div>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="sa-card">
          <div className="sa-card-header"><h2>Monthly Trend (Last 6 Months)</h2></div>
          {ordersByMonth.length === 0 ? (
            <div className="sa-empty-state">No data for the selected period</div>
          ) : (
            <div className="sa-bar-chart">
              {ordersByMonth.map((m) => {
                const maxOrders = Math.max(...ordersByMonth.map(x => x.orders), 1);
                return (
                  <div key={m.month} className="sa-bar-col">
                    <div className="sa-bar-value">{m.orders}</div>
                    <div className="sa-bar-track">
                      <div className="sa-bar-inner" style={{ height: `${(m.orders / maxOrders) * 100}%` }} />
                    </div>
                    <div className="sa-bar-label">{m.month.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Tenants Table */}
      <div className="sa-card">
        <div className="sa-card-header"><h2>Top Tenants by Orders</h2></div>
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tenant</th>
                <th>Status</th>
                <th>Users</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topTenants.length === 0 ? (
                <tr><td colSpan="6" className="sa-empty-row">No data</td></tr>
              ) : topTenants.map((tt, i) => (
                <tr key={tt.id}>
                  <td><span className="sa-rank">{i + 1}</span></td>
                  <td>
                    <div className="sa-tenant-name">
                      <div className="sa-tenant-avatar">{tt.name?.charAt(0)}</div>
                      <span>{tt.name}</span>
                    </div>
                  </td>
                  <td><span className={`sa-status-badge ${tt.status === 'active' ? 'success' : tt.status === 'trial' ? 'warning' : 'danger'}`}>{tt.status}</span></td>
                  <td>{fmt(tt.users)}</td>
                  <td><strong>{fmt(tt.order_count)}</strong></td>
                  <td>{fmtCur(tt.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;
