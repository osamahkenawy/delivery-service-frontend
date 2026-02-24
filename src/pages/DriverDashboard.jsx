import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, Check, Xmark, Clock, MapPin, User, Phone,
  NavArrowRight, CheckCircle, WarningTriangle, DollarCircle, Wallet,
  Prohibition, Refresh, Eye, Copy, ArrowRight, Calendar, Timer,
} from 'iconoir-react';
import api from '../lib/api';
import './DriverPortal.css';

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
  const steps = ['assigned', 'picked_up', 'in_transit', 'delivered'];
  const idx = steps.indexOf(current);
  const labels = ['Assigned', 'Picked Up', 'In Transit', 'Delivered'];
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
                {labels[i].split(' ')[0]}
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

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div className="dp-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`dp-toast ${t.type}`}>
          {t.type === 'success' ? <CheckCircle width={18} height={18} /> : <WarningTriangle width={18} height={18} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('active');
  const [updating, setUpdating] = useState(null);
  const [codInput, setCodInput] = useState({});
  const [toasts, setToasts]     = useState([]);
  const [starting, setStarting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const refreshRef              = useRef(null);
  const gpsRef                  = useRef(null);
  const watchRef                = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

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

  /* ── Continuous GPS broadcasting (every 10s when driver has active in-transit/picked_up orders) ── */
  useEffect(() => {
    const orders = data?.orders || [];
    const driver = data?.driver;
    const hasActiveTrip = orders.some(o => ['picked_up', 'in_transit'].includes(o.status));

    if (!hasActiveTrip || !driver?.id || !navigator.geolocation) {
      // Stop broadcasting if no active trip
      if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsActive(false);
      return;
    }

    // Already broadcasting
    if (gpsRef.current) return;

    setGpsActive(true);
    let lastPos = null;

    // Use watchPosition for best accuracy + fallback interval
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed, heading: pos.coords.heading };
      },
      () => {}, // ignore errors silently
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    const sendPing = async () => {
      if (!lastPos) return;
      const activeOrder = orders.find(o => ['picked_up', 'in_transit'].includes(o.status));
      try {
        await api.patch(`/drivers/${driver.id}/location`, {
          lat: lastPos.lat, lng: lastPos.lng,
          speed: lastPos.speed || 0, heading: lastPos.heading || 0,
          order_id: activeOrder?.id || null,
        });
      } catch { /* non-critical */ }
    };

    // Send immediately then every 10 seconds
    sendPing();
    gpsRef.current = setInterval(sendPing, 10000);

    return () => {
      if (gpsRef.current) { clearInterval(gpsRef.current); gpsRef.current = null; }
      if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      setGpsActive(false);
    };
  }, [data]);

  const getGPS = () => new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
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
        showToast(`${order.order_number} \u2192 ${STATUS_META[next]?.label || next}`);
        fetchOrders();
      } else {
        showToast(res.message || 'Failed to update', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setUpdating(null); }
  };

  const markFailed = async (order) => {
    const reason = prompt('Failure reason (optional):');
    setUpdating(order.id);
    const gps = await getGPS();
    try {
      const res = await api.patch(`/tracking/${order.tracking_token}/status`, {
        status: 'failed', lat: gps?.lat, lng: gps?.lng, note: reason || 'Delivery failed',
      });
      if (res.success) {
        showToast(`${order.order_number} marked as failed`, 'error');
        fetchOrders();
      } else {
        showToast(res.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setUpdating(null); }
  };

  /* Start Trip */
  const startTrip = async () => {
    setStarting(true);
    const gps = await getGPS();
    try {
      const res = await api.post('/tracking/start-trip', { lat: gps?.lat, lng: gps?.lng });
      if (res.success) {
        showToast(res.message || `${res.started} order(s) started!`);
        fetchOrders();
      } else {
        showToast(res.message || 'Failed to start trip', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setStarting(false); }
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/track/${token}`);
    showToast('Tracking link copied!');
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
        <h2>No Driver Profile</h2>
        <p>Your account is not linked to a driver profile. Please contact your admin to link your account.</p>
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
              {driver.name ? `Hi, ${driver.name.split(' ')[0]}` : 'My Deliveries'}
            </h2>
            <div className="dp-hero-status">
              <span className={`dp-status-dot ${driver.status || 'offline'}`} />
              <span className="dp-status-text">{driver.status || 'Busy'}</span>
              {gpsActive && (
                <span className="dp-gps-badge">
                  <span className="dp-gps-dot" />
                  GPS Live
                </span>
              )}
            </div>
          </div>
          <div className="dp-hero-actions">
            <button onClick={() => { setLoading(true); fetchOrders(); }} title="Refresh" className="dp-btn-refresh">
              <Refresh width={16} height={16} />
            </button>
            <button onClick={() => navigate('/driver/scan')} className="dp-btn-scan">
              <Eye width={14} height={14} /> Scan
            </button>
          </div>
        </div>

        {/* Quick Stats Row Inside Hero — Today */}
        <div className="dp-today-label">Today's Performance</div>
        <div className="dp-today-grid">
          {[
            { label: 'Active',    value: stats.active || 0,   icon: <Package width={18} height={18} color="#f97316" />, bg: 'rgba(249,115,22,0.12)' },
            { label: 'Delivered', value: stats.delivered || 0, icon: <CheckCircle width={18} height={18} color="#16a34a" />, bg: 'rgba(34,197,94,0.12)' },
            { label: 'Failed',    value: stats.failed || 0,   icon: <Xmark width={18} height={18} color="#dc2626" />, bg: 'rgba(239,68,68,0.12)' },
            { label: 'Revenue',   value: fmtAED(stats.revenue), icon: <DollarCircle width={18} height={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.12)' },
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
            <h3 className="dp-alltime-title">Overall Performance</h3>
            <span className={`dp-rate-badge ${deliveryRate >= 90 ? 'excellent' : deliveryRate >= 70 ? 'good' : 'poor'}`}>
              {deliveryRate}% Success
            </span>
          </div>
          <div className="dp-alltime-grid">
            {[
              { label: 'Total Orders', value: allTimeStats.total_orders, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Delivered', value: allTimeStats.total_delivered, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Failed', value: allTimeStats.total_failed, color: '#dc2626', bg: '#fef2f2' },
              { label: 'Earned', value: fmtAED(allTimeStats.total_revenue), color: '#0369a1', bg: '#f0f9ff' },
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
              <span>Delivery Success Rate</span>
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
          {starting ? 'Starting Trip...' : `Start Trip — ${assignedCount} Order${assignedCount > 1 ? 's' : ''}`}
        </button>
      )}

      {/* ═══ Tabs ═══ */}
      <div className="dp-tabs">
        {[
          { key: 'active',    label: 'Active',    count: stats.active,    color: '#f97316' },
          { key: 'completed', label: 'Delivered', count: stats.delivered, color: '#16a34a' },
          { key: 'failed',    label: 'Failed',    count: stats.failed,    color: '#dc2626' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`dp-tab ${tab === t.key ? 'active' : ''}`}
            style={tab === t.key ? { color: t.color } : undefined}>
            {t.label}
            {t.count != null && (
              <span className="dp-tab-count" style={{
                background: tab === t.key ? t.color + '15' : '#e2e8f0',
                color: tab === t.key ? t.color : '#94a3b8',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Orders List ═══ */}
      {loading ? (
        <div className="dp-loading">
          <div className="dp-spinner" />
          <p className="dp-loading-text">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="dp-empty">
          <div className="dp-empty-icon">
            <Package width={40} height={40} style={{ color: '#cbd5e1' }} />
          </div>
          <h3>{tab === 'active' ? 'No Active Deliveries' : `No ${tab === 'completed' ? 'Delivered' : 'Failed'} Orders`}</h3>
          <p>{tab === 'active' ? 'New orders will appear here when assigned to you.' : 'Your history will appear here.'}</p>
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
                    <span className="dp-status-pill">{m.label}</span>
                    <button onClick={() => copyToken(order.tracking_token)} title="Copy tracking link" className="dp-copy-btn">
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
                      <MapPin width={14} height={14} /> Navigate
                    </a>
                  ) : order.recipient_address && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.recipient_address + ' ' + (order.recipient_emirate || 'Dubai'))}`}
                      target="_blank" rel="noreferrer" className="dp-navigate no-coords">
                      <MapPin width={14} height={14} /> Navigate
                    </a>
                  )}
                </div>

                {/* ── Expanded Details ── */}
                {isExpanded && (
                  <div className="dp-expanded">
                    {/* Order details grid */}
                    <div className="dp-details-grid">
                      {[
                        { label: 'Type', value: order.order_type?.replace(/_/g, ' ') || 'Standard' },
                        { label: 'Category', value: order.category || '—' },
                        { label: 'Weight', value: order.weight_kg ? `${order.weight_kg} kg` : '—' },
                        { label: 'Zone', value: order.zone_name || '—' },
                        { label: 'Client', value: order.client_name || '—' },
                        { label: 'Sender', value: order.sender_name || '—' },
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
                        <div className="dp-tracking-label">Tracking Token</div>
                        <div className="dp-tracking-value">{order.tracking_token}</div>
                      </div>
                      <button onClick={() => copyToken(order.tracking_token)} className="dp-copy-link">
                        <Copy width={12} height={12} /> Copy Link
                      </button>
                    </div>

                    {/* Timestamps */}
                    {(order.picked_up_at || order.in_transit_at || order.delivered_at || order.failed_at) && (
                      <div className="dp-timestamps">
                        {order.picked_up_at && <div className="dp-timestamp"><Timer width={12} height={12} /> Picked up: {fmtFull(order.picked_up_at)}</div>}
                        {order.in_transit_at && <div className="dp-timestamp"><DeliveryTruck width={12} height={12} /> In transit: {fmtFull(order.in_transit_at)}</div>}
                        {order.delivered_at && <div className="dp-timestamp" style={{ color: '#16a34a' }}><Check width={12} height={12} /> Delivered: {fmtFull(order.delivered_at)}</div>}
                        {order.failed_at && <div className="dp-timestamp" style={{ color: '#dc2626' }}><Xmark width={12} height={12} /> Failed: {fmtFull(order.failed_at)}</div>}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Payment Strip ── */}
                <div className="dp-payment-strip">
                  <div className="dp-payment-cell">
                    <div className="pc-label">Payment</div>
                    <div className="pc-value" style={{ color: order.payment_method === 'cod' ? '#d97706' : '#2563eb', textTransform: 'uppercase' }}>{order.payment_method || '—'}</div>
                  </div>
                  <div className="dp-payment-cell">
                    <div className="pc-label">Fee</div>
                    <div className="pc-value">{fmtAED(order.delivery_fee)}</div>
                  </div>
                  {order.payment_method === 'cod' && parseFloat(order.cod_amount) > 0 && (
                    <div className="dp-payment-cell cod-collect">
                      <div className="pc-label"><Wallet width={12} height={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Collect</div>
                      <div className="pc-value">AED {parseFloat(order.cod_amount).toFixed(0)}</div>
                    </div>
                  )}
                </div>

                {/* ── Special Instructions ── */}
                {order.special_instructions && (
                  <div className="dp-instructions">
                    <WarningTriangle width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>Note:</strong> {order.special_instructions}</span>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                {tab === 'active' && (
                  <div className="dp-actions">
                    {showCod && (
                      <div className="dp-cod-box">
                        <label className="dp-cod-label">
                          <Wallet width={13} height={13} /> COD Amount Collected (AED)
                        </label>
                        <input type="number" step="0.01" className="dp-cod-input"
                          placeholder={`Enter amount${order.cod_amount ? ' (Expected: ' + parseFloat(order.cod_amount).toFixed(0) + ')' : ''}`}
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
                            <><div className="dp-btn-spinner" /> Processing...</>
                          ) : (
                            <>
                              {next === 'in_transit' && <><DeliveryTruck width={16} height={16} /> {order.status === 'assigned' ? 'Start Order' : 'Start Delivery'}</>}
                              {next === 'delivered'   && <><CheckCircle width={16} height={16} /> Mark Delivered</>}
                            </>
                          )}
                        </button>
                      )}
                      {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <button onClick={() => markFailed(order)} disabled={isUpdating} className="dp-btn-fail">
                          <Xmark width={14} height={14} /> Failed
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
                      {order.delivered_at && `✓ Delivered ${fmtTime(order.delivered_at)}`}
                      {order.failed_at && `✗ Failed ${fmtTime(order.failed_at)}`}
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
