    import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, Check, Xmark, MapPin, User,
  CheckCircle, WarningTriangle, DollarCircle, Refresh,
  NavArrowRight, Calendar, Clock, QrCode,
} from 'iconoir-react';
import api from '../lib/api';
import Toast, { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import './DriverPortal.css';
import './DriverHome.css';

/* ── Status meta ── */
const STATUS_META = {
  assigned:   { label: 'Assigned',   color: '#7c3aed', bg: '#ede9fe' },
  picked_up:  { label: 'Picked Up',  color: '#be185d', bg: '#fce7f3' },
  in_transit: { label: 'In Transit', color: '#0369a1', bg: '#e0f2fe' },
  delivered:  { label: 'Delivered',  color: '#16a34a', bg: '#dcfce7' },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fee2e2' },
  returned:   { label: 'Returned',   color: '#ea580c', bg: '#fff7ed' },
  cancelled:  { label: 'Cancelled',  color: '#64748b', bg: '#f1f5f9' },
};

const fmtAEDVal = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? n.toFixed(2) : '0.00'; };
const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' }) : '';
const fmtTime   = d => d ? new Date(d).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '';

export default function DriverHome() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/tracking/my-orders');
      if (res.success) { setData(res.data); setNoProfile(false); }
      else if (res.message?.includes('No driver profile')) setNoProfile(true);
    } catch (e) {
      if (e?.response?.status === 404) setNoProfile(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Loader ── */
  if (loading) {
    return (
      <div className="dh-loader">
        <div className="dp-spinner" style={{ width: 36, height: 36 }} />
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 14 }}>{t('driverDashboard.loading_orders')}</p>
      </div>
    );
  }

  /* ── No profile ── */
  if (noProfile) {
    return (
      <div className="dp-no-profile">
        <div className="dp-no-profile-icon"><WarningTriangle width={40} height={40} color="#dc2626" /></div>
        <h2 style={{ textAlign: 'center' }}>{t('driverDashboard.no_profile')}</h2>
        <p>{t('driverDashboard.no_profile_message')}</p>
        <Toast toasts={toasts} />
      </div>
    );
  }

  const stats        = data?.stats        || {};
  const allTimeStats = data?.allTimeStats || {};
  const driver       = data?.driver       || {};
  const recentOrders = (data?.orders || []).slice(0, 5);
  const today        = new Date().toLocaleDateString(isRTL ? 'ar-AE' : 'en-AE', { weekday: 'long', day: 'numeric', month: 'long' });
  const deliveryRate = allTimeStats.total_orders > 0
    ? Math.round((allTimeStats.total_delivered / allTimeStats.total_orders) * 100) : 0;
  const activeOrders = (data?.orders || []).filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status));

  return (
    <div className="driver-portal">

      {/* ═══ Hero ═══ */}
      <div className="dp-hero">
        <div className="dp-hero-top">
          <div>
            <div className="dp-hero-greeting">{today}</div>
            <h2 className="dp-hero-name">
              {driver.name
                ? t('driverDashboard.greeting', { name: driver.name.split(' ')[0] })
                : t('driverHome.welcome')}
            </h2>
            <div className="dp-hero-status">
              <span className={`dp-status-dot ${driver.status || 'offline'}`} />
              <span className="dp-status-text">
                {t('driverDashboard.driver_status_' + (driver.status || 'busy'))}
              </span>
              {driver.vehicle_type && (
                <span className="dp-gps-badge">
                  <DeliveryTruck width={11} height={11} /> {driver.vehicle_type}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title={t('driverDashboard.refresh')}
            className="dp-btn-refresh"
          >
            <Refresh width={16} height={16} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
          </button>
        </div>

        {/* Today's KPI row */}
        <div className="dp-today-label">{t('driverDashboard.today_performance')}</div>
        <div className="dp-today-grid">
          {[
            { label: t('driverDashboard.stat_active'),    value: stats.active    || 0, icon: <Package      width={18} height={18} color="#f97316" />, bg: 'rgba(249,115,22,0.12)' },
            { label: t('driverDashboard.stat_delivered'), value: stats.delivered || 0, icon: <CheckCircle  width={18} height={18} color="#16a34a" />, bg: 'rgba(34,197,94,0.12)'  },
            { label: t('driverDashboard.stat_failed'),    value: stats.failed    || 0, icon: <Xmark        width={18} height={18} color="#dc2626" />, bg: 'rgba(239,68,68,0.12)'  },
            { label: t('driverDashboard.stat_revenue'),   value: `AED ${fmtAEDVal(stats.revenue)}`, icon: <DollarCircle width={18} height={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.12)' },
          ].map(s => (
            <div key={s.label} className="dp-today-card" style={{ background: s.bg }}>
              <div className="tc-icon">{s.icon}</div>
              <div className="tc-value">{s.value}</div>
              <div className="tc-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="dh-quick-actions">
        <button className="dh-action-card dh-action-primary" onClick={() => navigate('/driver/orders')}>
          <div className="dh-action-icon">
            <Package width={26} height={26} />
          </div>
          <div className="dh-action-body">
            <div className="dh-action-title">{t('driverHome.my_orders')}</div>
            <div className="dh-action-sub">
              {activeOrders.length > 0
                ? t('driverHome.active_orders_count', { count: activeOrders.length })
                : t('driverHome.no_active_orders')}
            </div>
          </div>
          <NavArrowRight width={20} height={20} className="dh-action-arrow" />
        </button>

        <button className="dh-action-card dh-action-secondary" onClick={() => navigate('/driver/scan')}>
          <div className="dh-action-icon">
            <QrCode width={26} height={26} />
          </div>
          <div className="dh-action-body">
            <div className="dh-action-title">{t('driverHome.scan_shipment')}</div>
            <div className="dh-action-sub">{t('driverHome.scan_sub')}</div>
          </div>
          <NavArrowRight width={20} height={20} className="dh-action-arrow" />
        </button>
      </div>

      {/* ═══ All-Time Performance ═══ */}
      {allTimeStats.total_orders > 0 && (
        <div className="dp-alltime">
          <div className="dp-alltime-header">
            <h3 className="dp-alltime-title">{t('driverDashboard.overall_performance')}</h3>
            <span className={`dp-rate-badge ${deliveryRate >= 90 ? 'excellent' : deliveryRate >= 70 ? 'good' : 'poor'}`}>
              {t('driverDashboard.success_badge', { rate: deliveryRate })}
            </span>
          </div>
          <div className="dp-alltime-grid">
            {[
              { label: t('driverDashboard.total_orders'),    value: allTimeStats.total_orders,    color: '#3b82f6', bg: '#eff6ff' },
              { label: t('driverDashboard.stat_delivered'),  value: allTimeStats.total_delivered, color: '#16a34a', bg: '#f0fdf4' },
              { label: t('driverDashboard.stat_failed'),     value: allTimeStats.total_failed,    color: '#dc2626', bg: '#fef2f2' },
              { label: t('driverDashboard.earned'),          value: `AED ${fmtAEDVal(allTimeStats.total_revenue)}`, color: '#0369a1', bg: '#f0f9ff' },
            ].map(s => (
              <div key={s.label} className="dp-alltime-stat" style={{ background: s.bg }}>
                <div className="as-value" style={{ color: s.color }}>{s.value}</div>
                <div className="as-label">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Delivery success rate bar */}
          <div className="dp-rate-bar-wrap">
            <div className="dp-rate-bar-label">
              <span>{t('driverDashboard.delivery_success_rate')}</span>
              <span>{deliveryRate}%</span>
            </div>
            <div className="dp-rate-bar">
              <div
                className="dp-rate-bar-fill"
                style={{
                  width: `${deliveryRate}%`,
                  background: deliveryRate >= 90
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : deliveryRate >= 70
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Recent Orders ═══ */}
      <div className="dh-recent-section">
        <div className="dh-section-header">
          <h3 className="dh-section-title">{t('driverHome.recent_orders')}</h3>
          <button className="dh-view-all" onClick={() => navigate('/driver/orders')}>
            {t('driverHome.view_all')} <NavArrowRight width={14} height={14} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="dp-empty" style={{ padding: '32px 20px' }}>
            <div className="dp-empty-icon">
              <Package width={36} height={36} style={{ color: '#cbd5e1' }} />
            </div>
            <h3 style={{ fontSize: 15 }}>{t('driverDashboard.no_active_deliveries')}</h3>
            <p style={{ fontSize: 13 }}>{t('driverDashboard.empty_active_hint')}</p>
          </div>
        ) : (
          <div className="dh-orders-list">
            {recentOrders.map(order => {
              const m = STATUS_META[order.status] || STATUS_META.assigned;
              return (
                <div key={order.id} className="dh-order-row">
                  {/* Status dot */}
                  <div className="dh-order-dot" style={{ background: m.bg }}>
                    <Package width={16} height={16} color={m.color} />
                  </div>

                  {/* Order info */}
                  <div className="dh-order-info">
                    <div className="dh-order-num">{order.order_number}</div>
                    <div className="dh-order-recipient">
                      <User width={11} height={11} style={{ opacity: 0.5 }} /> {order.recipient_name}
                    </div>
                    <div className="dh-order-addr">
                      <MapPin width={11} height={11} style={{ opacity: 0.5 }} />{' '}
                      {[order.recipient_area, order.recipient_emirate].filter(Boolean).join(', ') || order.recipient_address || '—'}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="dh-order-right">
                    <span className="dh-status-pill" style={{ background: m.bg, color: m.color }}>
                      {t('driverDashboard.status_' + order.status)}
                    </span>
                    <div className="dh-order-time">
                      <Clock width={10} height={10} />{' '}
                      {order.delivered_at
                        ? fmtDate(order.delivered_at)
                        : fmtDate(order.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Driver Profile Summary ═══ */}
      {driver.name && (
        <div className="dh-profile-card">
          <div className="dh-profile-avatar">
            <User width={28} height={28} color="#244066" />
          </div>
          <div className="dh-profile-info">
            <div className="dh-profile-name">{driver.name}</div>
            {driver.phone && (
              <div className="dh-profile-detail">📞 {driver.phone}</div>
            )}
            {driver.vehicle_type && (
              <div className="dh-profile-detail">🚚 {driver.vehicle_type}{driver.plate_number ? ` · ${driver.plate_number}` : ''}</div>
            )}
          </div>
          <div className={`dh-profile-status ${driver.status || 'offline'}`}>
            <span className={`dp-status-dot ${driver.status || 'offline'}`} />
            {t('driverDashboard.driver_status_' + (driver.status || 'offline'))}
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
