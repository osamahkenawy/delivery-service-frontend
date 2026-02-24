import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, Check, Xmark, Clock, MapPin, User, Phone,
  NavArrowRight, CheckCircle, WarningTriangle, DollarCircle, Wallet,
  Prohibition, Refresh, Eye, Copy, ArrowRight, Calendar, Timer,
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

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
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '10px 0 6px', padding: '0 4px' }}>
      {steps.map((s, i) => {
        const m = STATUS_META[s];
        const done = i <= idx && idx >= 0;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? m.color : '#e2e8f0', color: done ? '#fff' : '#94a3b8',
              fontSize: 10, fontWeight: 700, flexShrink: 0, transition: 'all 0.3s',
            }}>
              {done ? <Check width={12} height={12} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 3, background: i < idx ? m.color : '#e2e8f0', borderRadius: 2, transition: 'all 0.3s' }} />
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
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px',
          borderRadius: 12, fontWeight: 600, fontSize: 14, minWidth: 260, maxWidth: 380,
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          background: t.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', animation: 'slideInRight 0.3s ease',
        }}>
          {t.type === 'success' ? <CheckCircle width={18} height={18} /> : <WarningTriangle width={18} height={18} />}
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes gpsPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
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
  const orders = data?.orders || [];
  const driver = data?.driver || {};
  const today = new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' });
  const assignedCount = orders.filter(o => o.status === 'assigned').length;

  /* ── No driver profile state ── */
  if (noProfile && !loading) {
    return (
      <div style={{ padding: '60px 20px', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <WarningTriangle width={36} height={36} color="#dc2626" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>No Driver Profile</h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Your account is not linked to a driver profile. Please log in with a driver account, or contact your admin to set up your driver profile.
        </p>
        <button onClick={() => navigate('/dashboard')} style={{
          padding: '12px 28px', borderRadius: 10, border: 'none',
          background: '#f97316', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          Go to Dashboard
        </button>
        <Toast toasts={toasts} />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 640, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══ Hero Header ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: 20, padding: '20px 20px', marginBottom: 16, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(249,115,22,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(249,115,22,0.1)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{today}</p>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900 }}>
              {driver.name ? `Hi, ${driver.name.split(' ')[0]}!` : 'My Deliveries'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: driver.status === 'available' ? '#22c55e' : '#f59e0b',
              }} />
              <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500, textTransform: 'capitalize' }}>
                {driver.status || 'Busy'}
              </span>
              {gpsActive && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginLeft:8,
                  background:'rgba(34,197,94,0.2)', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, color:'#4ade80' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'gpsPulse 1.5s ease-in-out infinite' }} />
                  GPS Live
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setLoading(true); fetchOrders(); }} title="Refresh"
              style={{ padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', color: '#fff' }}>
              <Refresh width={16} height={16} />
            </button>
            <button onClick={() => navigate('/driver/scan')}
              style={{ padding: '10px 16px', borderRadius: 12, border: 'none',
                background: '#f97316', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
              <Eye width={14} height={14} /> Scan
            </button>
          </div>
        </div>

        {/* Quick Stats Row Inside Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Active',    value: stats.active || 0,   emoji: '\ud83d\udce6', bg: 'rgba(249,115,22,0.15)' },
            { label: 'Delivered', value: stats.delivered || 0, emoji: '\u2705', bg: 'rgba(34,197,94,0.15)' },
            { label: 'Failed',    value: stats.failed || 0,   emoji: '\u274c', bg: 'rgba(239,68,68,0.15)' },
            { label: 'Revenue',   value: fmtAED(stats.revenue), emoji: '\ud83d\udcb0', bg: 'rgba(14,165,233,0.15)' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 12, padding: '10px 6px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 16 }}>{s.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Start Trip Banner ═══ */}
      {tab === 'active' && assignedCount > 0 && (
        <button onClick={startTrip} disabled={starting}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none', marginBottom: 14,
            background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
            fontWeight: 800, fontSize: 15, cursor: starting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: starting ? 0.7 : 1, boxShadow: '0 6px 20px rgba(22,163,74,.35)',
            animation: 'driverPulse 2s infinite',
          }}>
          <DeliveryTruck width={20} height={20} />
          {starting ? 'Starting Trip...' : `\ud83d\ude80 Start Trip \u2014 ${assignedCount} Order${assignedCount > 1 ? 's' : ''}`}
        </button>
      )}
      <style>{`@keyframes driverPulse{0%,100%{box-shadow:0 6px 20px rgba(22,163,74,.35)}50%{box-shadow:0 6px 30px rgba(22,163,74,.5)}}`}</style>

      {/* ═══ Tabs ═══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: '#f1f5f9', borderRadius: 14, padding: 4 }}>
        {[
          { key: 'active',    label: 'Active',    count: stats.active,    color: '#f97316' },
          { key: 'completed', label: 'Delivered', count: stats.delivered, color: '#16a34a' },
          { key: 'failed',    label: 'Failed',    count: stats.failed,    color: '#dc2626' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? t.color : '#64748b',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
            }}>
            {t.label}
            {t.count != null && <span style={{
              display: 'inline-block', marginLeft: 4, padding: '1px 6px', borderRadius: 8,
              fontSize: 11, fontWeight: 800,
              background: tab === t.key ? t.color + '15' : '#e2e8f0',
              color: tab === t.key ? t.color : '#94a3b8',
            }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══ Orders List ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#f97316', borderRadius: '50%', margin: '0 auto 16px', animation: 'driverSpin 0.8s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontWeight: 600 }}>Loading your orders...</p>
          <style>{`@keyframes driverSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Package width={36} height={36} style={{ color: '#cbd5e1' }} />
          </div>
          <h3 style={{ color: '#1e293b', fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
            {tab === 'active' ? 'No Active Deliveries' : `No ${tab === 'completed' ? 'Delivered' : 'Failed'} Orders`}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            {tab === 'active' ? 'New orders will appear here when assigned to you' : 'Check back later for updates'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const m = STATUS_META[order.status] || STATUS_META.assigned;
            const next = NEXT_STATUS[order.status];
            const isUpdating = updating === order.id;
            const showCod = next === 'delivered' && order.payment_method === 'cod';
            const isExpanded = expanded === order.id;

            return (
              <div key={order.id} style={{
                background: '#fff', borderRadius: 18, overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
                transition: 'all 0.2s',
              }}>
                {/* ── Order Header with gradient ── */}
                <div style={{
                  background: m.gradient, color: '#fff',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.3 }}>{order.order_number}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock width={10} height={10} /> {fmtFull(order.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                    }}>
                      {m.label}
                    </span>
                    <button onClick={() => copyToken(order.tracking_token)} title="Copy tracking link"
                      style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex' }}>
                      <Copy width={14} height={14} />
                    </button>
                  </div>
                </div>

                {/* Progress Steps */}
                {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                  <div style={{ padding: '4px 16px 0' }}>
                    <ProgressSteps current={order.status} />
                  </div>
                )}

                {/* ── Recipient Info ── */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: m.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <User width={16} height={16} color={m.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{order.recipient_name}</div>
                      <a href={`tel:${order.recipient_phone}`} style={{ color: '#f97316', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                        <Phone width={11} height={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        {order.recipient_phone}
                      </a>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                      style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
                        cursor: 'pointer', display: 'flex', color: '#64748b', transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}>
                      <ArrowRight width={14} height={14} />
                    </button>
                  </div>

                  {/* Address */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10 }}>
                    <MapPin width={14} height={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      {order.recipient_address}
                      {order.recipient_area ? `, ${order.recipient_area}` : ''}
                      {order.recipient_emirate ? ` \u2014 ${order.recipient_emirate}` : ''}
                    </span>
                  </div>

                  {/* Navigate */}
                  {(order.recipient_lat && order.recipient_lng) ? (
                    <a href={`https://maps.google.com/?q=${order.recipient_lat},${order.recipient_lng}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px', borderRadius: 10, marginTop: 8,
                        background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', color: '#1d4ed8',
                        fontWeight: 700, fontSize: 13, textDecoration: 'none',
                        border: '1px solid #bfdbfe',
                      }}>
                      <MapPin width={14} height={14} /> Navigate in Google Maps
                    </a>
                  ) : order.recipient_address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(order.recipient_address + ' ' + (order.recipient_emirate || 'Dubai'))}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '10px', borderRadius: 10, marginTop: 8,
                        background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 13,
                        textDecoration: 'none', border: '1px solid #e2e8f0',
                      }}>
                      <MapPin width={14} height={14} /> Search in Maps
                    </a>
                  )}
                </div>

                {/* ── Expanded Details ── */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 12px', animation: 'driverFadeIn 0.2s ease' }}>
                    <style>{`@keyframes driverFadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

                    {/* Order details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Type', value: order.order_type?.replace(/_/g, ' ') || 'Standard', emoji: '\ud83d\udce6' },
                        { label: 'Category', value: order.category || '\u2014', emoji: '\ud83c\udff7\ufe0f' },
                        { label: 'Weight', value: order.weight_kg ? `${order.weight_kg} kg` : '\u2014', emoji: '\u2696\ufe0f' },
                        { label: 'Zone', value: order.zone_name || '\u2014', emoji: '\ud83d\uddfa\ufe0f' },
                        { label: 'Client', value: order.client_name || '\u2014', emoji: '\ud83c\udfe2' },
                        { label: 'Sender', value: order.sender_name || '\u2014', emoji: '\ud83d\udce4' },
                      ].map(d => (
                        <div key={d.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 2 }}>{d.emoji} {d.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Token */}
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', border: '1px solid #f1f5f9', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tracking Token</div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', fontWeight: 600, marginTop: 2 }}>{order.tracking_token}</div>
                      </div>
                      <button onClick={() => copyToken(order.tracking_token)} style={{
                        background: '#f97316', border: 'none', borderRadius: 6, padding: '5px 10px',
                        color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Copy width={12} height={12} /> Copy Link
                      </button>
                    </div>

                    {/* Timestamps */}
                    {(order.picked_up_at || order.in_transit_at || order.delivered_at || order.failed_at) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {order.picked_up_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                            <Timer width={12} height={12} /> Picked up: {fmtFull(order.picked_up_at)}
                          </div>
                        )}
                        {order.in_transit_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                            <DeliveryTruck width={12} height={12} /> In transit: {fmtFull(order.in_transit_at)}
                          </div>
                        )}
                        {order.delivered_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a' }}>
                            <Check width={12} height={12} /> Delivered: {fmtFull(order.delivered_at)}
                          </div>
                        )}
                        {order.failed_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626' }}>
                            <Xmark width={12} height={12} /> Failed: {fmtFull(order.failed_at)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Payment Strip ── */}
                <div style={{
                  display: 'flex', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b',
                }}>
                  <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Payment</div>
                    <div style={{ fontWeight: 700, marginTop: 2, textTransform: 'uppercase', color: order.payment_method === 'cod' ? '#d97706' : '#2563eb' }}>{order.payment_method || '\u2014'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Fee</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{fmtAED(order.delivery_fee)}</div>
                  </div>
                  {order.payment_method === 'cod' && parseFloat(order.cod_amount) > 0 && (
                    <div style={{ flex: 1.5, padding: '10px 16px', textAlign: 'center', background: '#fffbeb' }}>
                      <div style={{ fontWeight: 600, fontSize: 10, color: '#92400e', textTransform: 'uppercase' }}>{'\ud83d\udcb5'} Collect</div>
                      <div style={{ fontWeight: 800, marginTop: 2, color: '#92400e' }}>AED {parseFloat(order.cod_amount).toFixed(0)}</div>
                    </div>
                  )}
                </div>

                {/* ── Special Instructions ── */}
                {order.special_instructions && (
                  <div style={{ padding: '10px 16px', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <WarningTriangle width={14} height={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span><strong>Note:</strong> {order.special_instructions}</span>
                  </div>
                )}

                {/* ── Action Buttons ── */}
                {tab === 'active' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                    {showCod && (
                      <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px', marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <Wallet width={13} height={13} /> COD Amount Collected (AED)
                        </label>
                        <input type="number" step="0.01" placeholder={`Enter amount${order.cod_amount ? ' (Expected: ' + parseFloat(order.cod_amount).toFixed(0) + ')' : ''}`}
                          value={codInput[order.id] || ''}
                          onChange={e => setCodInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10,
                            border: '1.5px solid #fcd34d', fontSize: 15, fontWeight: 700,
                            color: '#92400e', background: '#fffbeb', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {next && (
                        <button onClick={() => advanceStatus(order)} disabled={isUpdating}
                          style={{
                            flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                            background: STATUS_META[next]?.gradient || '#f97316', color: '#fff',
                            cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 800,
                            fontSize: 14, opacity: isUpdating ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            boxShadow: `0 4px 14px ${STATUS_META[next]?.color || '#f97316'}40`,
                          }}>
                          {isUpdating ? (
                            <>
                              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'driverSpin 0.8s linear infinite' }} />
                              Processing...
                            </>
                          ) : (
                            <>
                              {next === 'in_transit' && <><DeliveryTruck width={16} height={16} /> {order.status === 'assigned' ? 'Start Order' : 'Start Delivery'}</>}
                              {next === 'delivered'   && <><CheckCircle width={16} height={16} /> Mark Delivered</>}
                            </>
                          )}
                        </button>
                      )}
                      {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <button onClick={() => markFailed(order)} disabled={isUpdating}
                          style={{
                            flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #fecaca',
                            background: '#fff5f5', color: '#dc2626', cursor: isUpdating ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 5,
                          }}>
                          <Xmark width={14} height={14} /> Failed
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Completed/Failed timestamp strip ── */}
                {tab !== 'active' && (
                  <div style={{
                    padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar width={12} height={12} /> {fmtDate(order.created_at)}
                    </span>
                    <span style={{ fontWeight: 600, color: order.delivered_at ? '#16a34a' : '#dc2626' }}>
                      {order.delivered_at && `\u2713 Delivered ${fmtTime(order.delivered_at)}`}
                      {order.failed_at && `\u2717 Failed ${fmtTime(order.failed_at)}`}
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
