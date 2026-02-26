import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, Check, Xmark, Clock, MapPin, User, Phone,
  NavArrowRight, CheckCircle, WarningTriangle, DollarCircle, Wallet,
  Prohibition, Refresh, Eye, Copy, ArrowRight, Calendar, Timer,
} from 'iconoir-react';
import api from '../lib/api';
import Toast, { useToast } from '../components/Toast';
import './DriverPortal.css';
import { useTranslation } from 'react-i18next';

/* ── Status meta ── */
const STATUS_META = {
  assigned:   { label: 'Assigned',   bg: '#ede9fe', color: '#7c3aed', icon: User,          gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  picked_up:  { label: 'Picked Up',  bg: '#fce7f3', color: '#be185d', icon: Package,       gradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
  in_transit: { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1', icon: DeliveryTruck,  gradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
  delivered:  { label: 'Delivered',  bg: '#dcfce7', color: '#16a34a', icon: Check,          gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  failed:     { label: 'Failed',     bg: '#fee2e2', color: '#dc2626', icon: Xmark,          gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
  returned:   { label: 'Returned',   bg: '#fff7ed', color: '#ea580c', icon: NavArrowRight,  gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  cancelled:  { label: 'Cancelled',  bg: '#f1f5f9', color: '#64748b', icon: Prohibition,    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)' },
};

const NEXT_STATUS = { assigned: 'in_transit', picked_up: 'in_transit', in_transit: 'delivered' };

const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' }) : '';
const fmtAED  = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `AED ${n.toFixed(2)}` : '\u2014'; };
const fmtFull = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

/* ── Progress Steps ── */
function ProgressSteps({ current }) {
  const { t } = useTranslation();
  const steps = ['assigned', 'picked_up', 'in_transit', 'delivered'];
  const idx = steps.indexOf(current);
  const stepLabels = [t('driverDashboard.step_assigned'), t('driverDashboard.step_picked_up'), t('driverDashboard.step_in_transit'), t('driverDashboard.step_delivered')];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '12px 0 8px', padding: '0 4px' }}>
      {steps.map((s, i) => {
        const m = STATUS_META[s];
        const done = i <= idx && idx >= 0;
        const active = i === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? m.color : '#e2e8f0', color: done ? '#fff' : '#94a3b8',
                fontSize: 10, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
                boxShadow: active ? `0 0 0 4px ${m.color}25` : 'none',
              }}>
                {done ? <Check width={13} height={13} /> : i + 1}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: done ? m.color : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {stepLabels[i]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 3, background: i < idx ? m.color : '#e2e8f0', borderRadius: 2, transition: 'all 0.3s', marginBottom: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Dashboard ── */
export default function DriverDashboard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const fmtAED = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `${t('driverDashboard.currency_aed')} ${n.toFixed(2)}` : '\u2014'; };
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('active');
  const [updating, setUpdating] = useState(null);
  const [codInput, setCodInput] = useState({});
  const { toasts, showToast } = useToast();
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError]   = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);   // for debug display
  const [proofUploading, setProofUploading] = useState(null); // order.id being uploaded
  const refreshRef              = useRef(null);
  const gpsRef                  = useRef(null);
  const watchRef                = useRef(null);
  const lastPosRef              = useRef(null);   // persist GPS across re-renders
  const dataRef                 = useRef(null);    // always-current data for sendPing

  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = tab === 'active' ? '' : tab === 'completed' ? 'completed' : 'failed';
      const res = await api.get(`/tracking/my-orders${statusParam ? `?status=${statusParam}` : ''}`);
      if (res.success) { setData(res.data); setNoProfile(false); }
      else if (res.message?.includes('No driver profile')) { setNoProfile(true); }
    } catch (e) {
      if (e?.response?.status === 404 || e?.message?.includes('404')) setNoProfile(true);
      console.error(e);
    }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); fetchOrders(); }, [tab]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchOrders, 30000);
    return () => clearInterval(refreshRef.current);
  }, [fetchOrders]);

  /* ── Keep dataRef always current so GPS ping uses fresh data ── */
  useEffect(() => { dataRef.current = data; }, [data]);

  /* ── Continuous GPS broadcasting (every 10s when driver has active in-transit/picked_up orders) ── */
  const hasActiveTrip = (data?.orders || []).some(o => ['picked_up', 'in_transit'].includes(o.status));
  const driverId = data?.driver?.id;

  useEffect(() => {
    if (!hasActiveTrip || !driverId || !navigator.geolocation) {
      // Stop broadcasting if no active trip
      if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsActive(false);
      setGpsError(null);
      return;
    }

    // Already broadcasting — don't restart
    if (gpsRef.current) return;

    setGpsActive(true);
    setGpsError(null);

    // Use watchPosition for continuous high-accuracy GPS
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
        };
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsError(null);
        console.log('[GPS] Position updated:', pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6), 'accuracy:', pos.coords.accuracy?.toFixed(0) + 'm');
      },
      (err) => {
        console.warn('[GPS] watchPosition Error:', err.code, err.message);
        setGpsError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    const sendPing = async () => {
      // If watchPosition hasn't given us a fresh position, try getCurrentPosition
      if (!lastPosRef.current) {
        console.log('[GPS] No watchPosition fix yet, trying getCurrentPosition...');
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject,
              { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
          });
          lastPosRef.current = {
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            speed: pos.coords.speed, heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
          };
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          console.log('[GPS] getCurrentPosition fallback:', pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        } catch (err) {
          console.warn('[GPS] getCurrentPosition fallback failed:', err.message);
          return;
        }
      }
      const pos = lastPosRef.current;
      const currentData = dataRef.current;
      const currentDriverId = currentData?.driver?.id;
      const activeOrder = (currentData?.orders || []).find(o => ['picked_up', 'in_transit'].includes(o.status));
      if (!currentDriverId) return;
      try {
        await api.patch(`/drivers/${currentDriverId}/location`, {
          lat: pos.lat, lng: pos.lng,
          speed: pos.speed ?? null, heading: pos.heading ?? null,
          order_id: activeOrder?.id || null,
        });
        console.log('[GPS] Ping sent:', pos.lat.toFixed(6), pos.lng.toFixed(6), 'accuracy:', pos.accuracy?.toFixed(0) + 'm');
      } catch (err) { console.warn('[GPS] Ping failed:', err); }
    };

    // First ping after a short delay to let watchPosition acquire a fix
    const initialTimeout = setTimeout(sendPing, 2000);
    gpsRef.current = setInterval(sendPing, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsActive(false);
    };
  }, [hasActiveTrip, driverId]);

  const getGPS = () => new Promise(resolve => {
    // Use cached position from watchPosition if available (faster)
    if (lastPosRef.current) return resolve({ lat: lastPosRef.current.lat, lng: lastPosRef.current.lng });
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  const advanceStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;

    setUpdating(order.id);
    const gps = await getGPS();
    const payload = { status: next, lat: gps?.lat, lng: gps?.lng };

    // COD collection
    if (next === 'delivered' && order.payment_method === 'cod') {
      const amt = codInput[order.id];
      if (amt) payload.cod_collected_amount = parseFloat(amt);
    }

    try {
      const res = await api.patch(`/tracking/${order.tracking_token}/status`, payload);
      if (res.success) {
        showToast(t('driverDashboard.status_updated', { orderNumber: order.order_number, status: t('driverDashboard.status_' + next) }));
        fetchOrders();
      } else {
        showToast(res.message || t('driverDashboard.failed_to_update'), 'error');
      }
    } catch { showToast(t('driverDashboard.network_error'), 'error'); }
    finally { setUpdating(null); }
  };

  /* Proof-of-delivery photo upload */
  const uploadProof = async (orderId, file) => {
    if (!file) return;
    setProofUploading(orderId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/uploads/orders/${orderId}/proof`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast(t('driverDashboard.proof_uploaded_toast'));
        fetchOrders();
      } else {
        showToast(data.message || t('driverDashboard.upload_failed'), 'error');
      }
    } catch {
      showToast(t('driverDashboard.network_error_upload'), 'error');
    } finally {
      setProofUploading(null);
    }
  };

  const markFailed = async (order) => {    const reason = prompt(t('driverDashboard.failure_reason_prompt'));
    setUpdating(order.id);
    const gps = await getGPS();
    try {
      const res = await api.patch(`/tracking/${order.tracking_token}/status`, {
        status: 'failed', lat: gps?.lat, lng: gps?.lng, note: reason || t('driverDashboard.delivery_failed_note'),
      });
      if (res.success) {
        showToast(t('driverDashboard.marked_as_failed', { orderNumber: order.order_number }), 'error');
        fetchOrders();
      } else {
        showToast(res.message || t('driverDashboard.failed_toast'), 'error');
      }
    } catch { showToast(t('driverDashboard.network_error'), 'error'); }
    finally { setUpdating(null); }
  };

  /* Start Trip */
  const startTrip = async () => {
    setStarting(true);
    const gps = await getGPS();
    try {
      const res = await api.post('/tracking/start-trip', { lat: gps?.lat, lng: gps?.lng });
      if (res.success) {
        showToast(res.message || t('driverDashboard.orders_started', { count: res.started }));
        fetchOrders();
      } else {
        showToast(res.message || t('driverDashboard.failed_to_start_trip'), 'error');
      }
    } catch { showToast(t('driverDashboard.network_error'), 'error'); }
    finally { setStarting(false); }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/track/${token}`);
    showToast(t('driverDashboard.tracking_link_copied'));
  };

  const stats = data?.stats || {};
  const allTimeStats = data?.allTimeStats || {};
  const orders = data?.orders || [];
  const driver = data?.driver || {};
  const today = new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' });
  const assignedCount = orders.filter(o => o.status === 'assigned').length;
  const deliveryRate = allTimeStats.total_orders > 0 ? Math.round((allTimeStats.total_delivered / allTimeStats.total_orders) * 100) : 0;

  /* ── No driver profile state ── */
  if (noProfile && !loading) {
    return (
      <div className="dp-no-profile">
        <div className="dp-no-profile-icon">
          <WarningTriangle width={40} height={40} color="#dc2626" />
        </div>
        <h2>{t("driverDashboard.no_profile")}</h2>
        <p>{t('driverDashboard.no_profile_message')}</p>
        <Toast toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="driver-portal">

      {/* ═══ Hero Header ═══ */}
      <div className="dp-hero">
        <div className="dp-hero-top">
          <div>
            <div className="dp-hero-greeting">{today}</div>
            <h2 className="dp-hero-name">
              {driver.name ? t('driverDashboard.greeting', { name: driver.name.split(' ')[0] }) : t('driverDashboard.my_deliveries')}
            </h2>
            <div className="dp-hero-status">
              <span className={`dp-status-dot ${driver.status || 'offline'}`} />
              <span className="dp-status-text">{t('driverDashboard.driver_status_' + (driver.status || 'busy'))}</span>
              {gpsActive && !gpsError && (
                <span className="dp-gps-badge">
                  <span className="dp-gps-dot" />
                  {t('driverDashboard.gps_live')}
                </span>
              )}
              {gpsActive && gpsError && (
                <span className="dp-gps-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#dc2626' }}>
                  <WarningTriangle width={11} height={11} /> {t('driverDashboard.gps_error_label')}
                </span>
              )}
            </div>
            {/* GPS coordinates debug — shows driver their actual tracked position */}
            {gpsActive && gpsCoords && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)} ±{gpsCoords.accuracy?.toFixed(0) || '?'}m
              </div>
            )}
            {gpsActive && gpsError && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5' }}>
                {t('driverDashboard.gps_error_hint', { error: gpsError })}
              </div>
            )}
          </div>
          <div className="dp-hero-actions">
            <button onClick={() => { setLoading(true); fetchOrders(); }} title={t('driverDashboard.refresh')} className="dp-btn-refresh">
              <Refresh width={16} height={16} />
            </button>
            <button onClick={() => navigate('/driver/scan')} className="dp-btn-scan">
              <Eye width={14} height={14} /> {t('driverDashboard.scan')}
            </button>
          </div>
        </div>

        {/* Quick Stats Row Inside Hero — Today */}
        <div className="dp-today-label">{t("driverDashboard.today_performance")}</div>
        <div className="dp-today-grid">
          {[
            { label: t('driverDashboard.stat_active'),    value: stats.active || 0,   icon: <Package width={18} height={18} color="#f97316" />, bg: 'rgba(249,115,22,0.12)' },
            { label: t('driverDashboard.stat_delivered'), value: stats.delivered || 0, icon: <CheckCircle width={18} height={18} color="#16a34a" />, bg: 'rgba(34,197,94,0.12)' },
            { label: t('driverDashboard.stat_failed'),    value: stats.failed || 0,   icon: <Xmark width={18} height={18} color="#dc2626" />, bg: 'rgba(239,68,68,0.12)' },
            { label: t('driverDashboard.stat_revenue'),   value: fmtAED(stats.revenue), icon: <DollarCircle width={18} height={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.12)' },
          ].map(s => (
            <div key={s.label} className="dp-today-card" style={{ background: s.bg }}>
              <div className="tc-icon">{s.icon}</div>
              <div className="tc-value">{s.value}</div>
              <div className="tc-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ All-Time Stats Card ═══ */}
      {allTimeStats.total_orders > 0 && (
        <div className="dp-alltime">
          <div className="dp-alltime-header">
            <h3 className="dp-alltime-title">{t("driverDashboard.overall_performance")}</h3>
            <span className={`dp-rate-badge ${deliveryRate >= 90 ? 'excellent' : deliveryRate >= 70 ? 'good' : 'poor'}`}>
              {t('driverDashboard.success_badge', { rate: deliveryRate })}
            </span>
          </div>
          <div className="dp-alltime-grid">
            {[
              { label: t('driverDashboard.total_orders'), value: allTimeStats.total_orders, color: '#3b82f6', bg: '#eff6ff' },
              { label: t('driverDashboard.stat_delivered'), value: allTimeStats.total_delivered, color: '#16a34a', bg: '#f0fdf4' },
              { label: t('driverDashboard.stat_failed'), value: allTimeStats.total_failed, color: '#dc2626', bg: '#fef2f2' },
              { label: t('driverDashboard.earned'), value: fmtAED(allTimeStats.total_revenue), color: '#0369a1', bg: '#f0f9ff' },
            ].map(s => (
              <div key={s.label} className="dp-alltime-stat" style={{ background: s.bg }}>
                <div className="as-value" style={{ color: s.color }}>{s.value}</div>
                <div className="as-label">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="dp-rate-bar-wrap">
            <div className="dp-rate-bar-label">
              <span>{t("driverDashboard.delivery_success_rate")}</span>
              <span>{deliveryRate}%</span>
            </div>
            <div className="dp-rate-bar">
              <div className="dp-rate-bar-fill" style={{
                width: `${deliveryRate}%`,
                background: deliveryRate >= 90 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : deliveryRate >= 70 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Start Trip Banner ═══ */}
      {tab === 'active' && assignedCount > 0 && (
        <button onClick={startTrip} disabled={starting} className="dp-start-trip">
          <DeliveryTruck width={20} height={20} />
          {starting ? t('driverDashboard.starting_trip') : t(assignedCount > 1 ? 'driverDashboard.start_trip_other' : 'driverDashboard.start_trip_one', { count: assignedCount })}
        </button>
      )}

      {/* ═══ Tabs ═══ */}
      <div className="dp-tabs">
        {[
          { key: 'active',    label: t('driverDashboard.tab_active'),    count: stats.active,    color: '#f97316' },
          { key: 'completed', label: t('driverDashboard.tab_delivered'), count: stats.delivered, color: '#16a34a' },
          { key: 'failed',    label: t('driverDashboard.tab_failed'),    count: stats.failed,    color: '#dc2626' },
        ].map(tabItem => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
            className={`dp-tab ${tab === tabItem.key ? 'active' : ''}`}
            style={tab === tabItem.key ? { color: tabItem.color } : undefined}>
            {tabItem.label}
            {tabItem.count != null && (
              <span className="dp-tab-count" style={{
                background: tab === tabItem.key ? tabItem.color + '15' : '#e2e8f0',
                color: tab === tabItem.key ? tabItem.color : '#94a3b8',
              }}>{tabItem.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Orders List ═══ */}
      {loading ? (
        <div className="dp-loading">
          <div className="dp-spinner" />
          <p className="dp-loading-text">{t("driverDashboard.loading_orders")}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="dp-empty">
          <div className="dp-empty-icon">
            <Package width={40} height={40} style={{ color: '#cbd5e1' }} />
          </div>
          <h3>{tab === 'active' ? t('driverDashboard.no_active_deliveries') : tab === 'completed' ? t('driverDashboard.no_delivered_orders') : t('driverDashboard.no_failed_orders')}</h3>
          <p>{tab === 'active' ? t('driverDashboard.empty_active_hint') : t('driverDashboard.empty_history_hint')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => {
            const m = STATUS_META[order.status] || STATUS_META.assigned;
            const next = NEXT_STATUS[order.status];
            const isUpdating = updating === order.id;
            const showCod = next === 'delivered' && order.payment_method === 'cod';
            const isExpanded = expanded === order.id;

            return (
              <div key={order.id} className="dp-order-card">
                {/* ── Order Header with gradient ── */}
                <div className="dp-order-header" style={{ background: m.gradient }}>
                  <div>
                    <div className="dp-order-number">{order.order_number}</div>
                    <div className="dp-order-time">
                      <Clock width={10} height={10} /> {fmtFull(order.created_at)}
                    </div>
                  </div>
                  <div className="dp-order-badges">
                    <span className="dp-status-pill">{t('driverDashboard.status_' + order.status)}</span>
                    <button onClick={() => copyToken(order.tracking_token)} title={t('driverDashboard.copy_tracking')} className="dp-copy-btn">
                      <Copy width={14} height={14} />
                    </button>
                  </div>
                </div>

                {/* Progress Steps */}
                {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                  <div className="dp-progress-wrap"><ProgressSteps current={order.status} /></div>
                )}

                {/* ── Recipient Info ── */}
                <div className="dp-recipient">
                  <div className="dp-recipient-row">
                    <div className="dp-recipient-avatar" style={{ background: m.bg }}>
                      <User width={18} height={18} color={m.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="dp-recipient-name">{order.recipient_name}</div>
                      <a href={`tel:${order.recipient_phone}`} className="dp-recipient-phone">
                        <Phone width={11} height={11} />
                        {order.recipient_phone}
                      </a>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                      className={`dp-expand-btn ${isExpanded ? 'open' : ''}`}>
                      <ArrowRight width={14} height={14} />
                    </button>
                  </div>

                  {/* Address */}
                  <div className="dp-address">
                    <MapPin width={14} height={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>
                      {order.recipient_address}
                      {order.recipient_area ? `, ${order.recipient_area}` : ''}
                      {order.recipient_emirate ? ` — ${order.recipient_emirate}` : ''}
                    </span>
                  </div>

                  {/* Navigate — uses Google Maps directions so the phone navigates from current GPS location */}
                  {(order.recipient_lat && order.recipient_lng) ? (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.recipient_lat},${order.recipient_lng}`}
                      target="_blank" rel="noreferrer" className="dp-navigate has-coords">
                      <MapPin width={14} height={14} /> {t('driverDashboard.navigate')}
                    </a>
                  ) : order.recipient_address && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.recipient_address + ' ' + (order.recipient_emirate || 'Dubai'))}`}
                      target="_blank" rel="noreferrer" className="dp-navigate no-coords">
                      <MapPin width={14} height={14} /> {t('driverDashboard.navigate')}
                    </a>
                  )}
                </div>

                {/* ── Expanded Details ── */}
                {isExpanded && (
                  <div className="dp-expanded">
                    {/* Order details grid */}
                    <div className="dp-details-grid">
                      {[
                        { label: t('driverDashboard.type'), value: order.order_type?.replace(/_/g, ' ') || t('driverDashboard.standard') },
                        { label: t('driverDashboard.category'), value: order.category || '—' },
                        { label: t('driverDashboard.weight'), value: order.weight_kg ? `${order.weight_kg} kg` : '—' },
                        { label: t('driverDashboard.zone'), value: order.zone_name || '—' },
                        { label: t('driverDashboard.client'), value: order.client_name || '—' },
                        { label: t('driverDashboard.sender'), value: order.sender_name || '—' },
                      ].map(d => (
                        <div key={d.label} className="dp-detail-cell">
                          <div className="dc-label">{d.label}</div>
                          <div className="dc-value">{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Token */}
                    <div className="dp-tracking-row">
                      <div>
                        <div className="dp-tracking-label">{t("driverDashboard.tracking_token")}</div>
                        <div className="dp-tracking-value">{order.tracking_token}</div>
                      </div>
                      <button onClick={() => copyToken(order.tracking_token)} className="dp-copy-link">
                        <Copy width={12} height={12} /> {t('driverDashboard.copy_link')}
                      </button>
                    </div>

                    {/* Timestamps */}
                    {(order.picked_up_at || order.in_transit_at || order.delivered_at || order.failed_at) && (
                      <div className="dp-timestamps">
                        {order.picked_up_at && <div className="dp-timestamp"><Timer width={12} height={12} /> {t('driverDashboard.picked_up_at', { time: fmtFull(order.picked_up_at) })}</div>}
                        {order.in_transit_at && <div className="dp-timestamp"><DeliveryTruck width={12} height={12} /> {t('driverDashboard.in_transit_at', { time: fmtFull(order.in_transit_at) })}</div>}
                        {order.delivered_at && <div className="dp-timestamp" style={{ color: '#16a34a' }}><Check width={12} height={12} /> {t('driverDashboard.delivered_at', { time: fmtFull(order.delivered_at) })}</div>}
                        {order.failed_at && <div className="dp-timestamp" style={{ color: '#dc2626' }}><Xmark width={12} height={12} /> {t('driverDashboard.failed_at', { time: fmtFull(order.failed_at) })}</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Payment Strip ── */}
                <div className="dp-payment-strip">
                  <div className="dp-payment-cell">
                    <div className="pc-label">{t('driverDashboard.payment')}</div>
                    <div className="pc-value" style={{ color: order.payment_method === 'cod' ? '#d97706' : '#2563eb', textTransform: 'uppercase' }}>{order.payment_method || '—'}</div>
                  </div>
                  <div className="dp-payment-cell">
                    <div className="pc-label">{t('driverDashboard.fee')}</div>
                    <div className="pc-value">{fmtAED(order.delivery_fee)}</div>
                  </div>
                  {order.payment_method === 'cod' && parseFloat(order.cod_amount) > 0 && (
                    <div className="dp-payment-cell cod-collect">
                      <div className="pc-label"><Wallet width={12} height={12} style={{ [isRTL?'marginLeft':'marginRight']: 4, verticalAlign: 'middle' }} /> {t('driverDashboard.collect')}</div>
                      <div className="pc-value">{t('driverDashboard.currency_aed')} {parseFloat(order.cod_amount).toFixed(0)}</div>
                    </div>
                  )}
                </div>

                {/* ── Special Instructions ── */}
                {order.special_instructions && (
                  <div className="dp-instructions">
                    <WarningTriangle width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>{t('driverDashboard.note')}</strong> {order.special_instructions}</span>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                {tab === 'active' && (
                  <div className="dp-actions">
                    {showCod && (
                      <div className="dp-cod-box">
                        <label className="dp-cod-label">
                          <Wallet width={13} height={13} /> {t('driverDashboard.cod_amount_collected')}
                        </label>
                        <input type="number" step="0.01" className="dp-cod-input"
                          placeholder={order.cod_amount ? t('driverDashboard.enter_amount_expected', { amount: parseFloat(order.cod_amount).toFixed(0) }) : t('driverDashboard.enter_amount')}
                          value={codInput[order.id] || ''}
                          onChange={e => setCodInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="dp-action-row">
                      {next && (
                        <button onClick={() => advanceStatus(order)} disabled={isUpdating}
                          className="dp-btn-advance"
                          style={{ background: STATUS_META[next]?.gradient || '#f97316', boxShadow: `0 4px 16px ${STATUS_META[next]?.color || '#f97316'}40` }}>
                          {isUpdating ? (
                            <><div className="dp-btn-spinner" /> {t('driverDashboard.processing')}</>
                          ) : (
                            <>
                              {next === 'in_transit' && <><DeliveryTruck width={16} height={16} /> {order.status === 'assigned' ? t('driverDashboard.start_order') : t('driverDashboard.start_delivery')}</>}
                              {next === 'delivered'   && <><CheckCircle width={16} height={16} /> {t('driverDashboard.mark_delivered')}</>}
                            </>
                          )}
                        </button>
                      )}
                      {/* Proof-of-delivery photo upload (shown when in_transit) */}
                      {order.status === 'in_transit' && !order.proof_of_delivery_url && (
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 10, border: '1.5px dashed #94a3b8',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b',
                          background: '#f8fafc',
                        }}>
                          {proofUploading === order.id
                            ? <><div className="dp-btn-spinner" /> {t('driverDashboard.uploading')}</>
                            : <><Eye width={14} height={14} /> {t('driverDashboard.add_proof_photo')}</>
                          }
                          <input
                            type="file" accept="image/*" capture="environment"
                            style={{ display: 'none' }}
                            disabled={!!proofUploading}
                            onChange={e => uploadProof(order.id, e.target.files?.[0])}
                          />
                        </label>
                      )}
                      {order.proof_of_delivery_url && (
                        <a href={order.proof_of_delivery_url} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                          <CheckCircle width={13} height={13} /> {t('driverDashboard.proof_uploaded')}
                        </a>
                      )}
                      {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <button onClick={() => markFailed(order)} disabled={isUpdating} className="dp-btn-fail">
                          <Xmark width={14} height={14} /> {t('driverDashboard.failed_btn')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Completed/Failed timestamp strip ── */}
                {tab !== 'active' && (
                  <div className="dp-completed-strip">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar width={12} height={12} /> {fmtDate(order.created_at)}
                    </span>
                    <span style={{ fontWeight: 600, color: order.delivered_at ? '#16a34a' : '#dc2626' }}>
                      {order.delivered_at && t('driverDashboard.delivered_stamp', { time: fmtTime(order.delivered_at) })}
                      {order.failed_at && t('driverDashboard.failed_stamp', { time: fmtTime(order.failed_at) })}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
