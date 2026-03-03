/* ══════════════════════════════════════════════════════════════
 * ClientDashboard.jsx — Merchant Dashboard with KPI Cards
 * ══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../App';
import { Package, DeliveryTruck, CheckCircle, Clock, Plus, DollarCircle, WarningTriangle } from 'iconoir-react';
import api from '../../lib/api';
import './ClientPages.css';

export default function ClientDashboard() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/client-portal/stats');
        if (res.success) setStats(res.data);
        else setError('Failed to load dashboard data');
      } catch { setError('Connection error'); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="cp-loading"><div className="cp-spinner" /></div>;
  }

  const s = stats || {};

  return (
    <div className="cp-page">
      {error && <div className="ca-alert ca-alert-error" style={{ marginBottom: 16 }}><WarningTriangle width={16} height={16} /> {error}</div>}

      {/* Welcome banner */}
      <div className="cp-welcome-banner">
        <div>
          <h1 className="cp-welcome-title">Welcome back, {user?.full_name || 'Merchant'} 👋</h1>
          <p className="cp-welcome-sub">Here's your shipping overview for today</p>
        </div>
        <Link to="/merchant/create-order" className="cp-btn cp-btn-primary">
          <Plus width={18} height={18} /> New Order
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="cp-kpi-grid">
        <div className="cp-kpi-card cp-kpi-blue">
          <div className="cp-kpi-icon"><Package width={24} height={24} /></div>
          <div className="cp-kpi-data">
            <span className="cp-kpi-value">{s.orders_today || 0}</span>
            <span className="cp-kpi-label">Orders Today</span>
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-orange">
          <div className="cp-kpi-icon"><DeliveryTruck width={24} height={24} /></div>
          <div className="cp-kpi-data">
            <span className="cp-kpi-value">{s.in_transit || 0}</span>
            <span className="cp-kpi-label">In Transit</span>
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-green">
          <div className="cp-kpi-icon"><CheckCircle width={24} height={24} /></div>
          <div className="cp-kpi-data">
            <span className="cp-kpi-value">{s.delivered || 0}</span>
            <span className="cp-kpi-label">Delivered</span>
          </div>
        </div>
        <div className="cp-kpi-card cp-kpi-red">
          <div className="cp-kpi-icon"><WarningTriangle width={24} height={24} /></div>
          <div className="cp-kpi-data">
            <span className="cp-kpi-value">{s.failed || 0}</span>
            <span className="cp-kpi-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="cp-stats-row">
        <div className="cp-stat-card">
          <h3 className="cp-stat-title">Order Summary</h3>
          <div className="cp-stat-grid">
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.total_orders || 0}</span>
              <span className="cp-stat-lbl">Total Orders</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.pending || 0}</span>
              <span className="cp-stat-lbl">Pending</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.assigned || 0}</span>
              <span className="cp-stat-lbl">Assigned</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.picked_up || 0}</span>
              <span className="cp-stat-lbl">Picked Up</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.returned || 0}</span>
              <span className="cp-stat-lbl">Returned</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.cancelled || 0}</span>
              <span className="cp-stat-lbl">Cancelled</span>
            </div>
          </div>
        </div>

        <div className="cp-stat-card">
          <h3 className="cp-stat-title">Financial Overview</h3>
          <div className="cp-stat-grid">
            <div className="cp-stat-item">
              <span className="cp-stat-num">AED {Number(s.total_delivery_fees || 0).toLocaleString()}</span>
              <span className="cp-stat-lbl">Total Delivery Fees</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">AED {Number(s.total_cod || 0).toLocaleString()}</span>
              <span className="cp-stat-lbl">Total COD</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">AED {Number(s.spend_this_month || 0).toLocaleString()}</span>
              <span className="cp-stat-lbl">This Month</span>
            </div>
            <div className="cp-stat-item">
              <span className="cp-stat-num">{s.orders_this_month || 0}</span>
              <span className="cp-stat-lbl">Orders This Month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="cp-quick-actions">
        <h3 className="cp-section-title">Quick Actions</h3>
        <div className="cp-action-grid">
          <Link to="/merchant/create-order" className="cp-action-card">
            <Plus width={24} height={24} />
            <span>Create Single Order</span>
          </Link>
          <Link to="/merchant/bulk-import" className="cp-action-card">
            <Package width={24} height={24} />
            <span>Bulk Import CSV</span>
          </Link>
          <Link to="/merchant/barcodes" className="cp-action-card">
            <Package width={24} height={24} />
            <span>Pre-print Barcodes</span>
          </Link>
          <Link to="/merchant/tracking" className="cp-action-card">
            <Clock width={24} height={24} />
            <span>Track Shipment</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
