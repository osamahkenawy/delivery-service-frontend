import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, Check, Xmark, Clock, MapPin, User, Phone,
  NavArrowRight, CheckCircle, WarningTriangle, DollarCircle, Wallet,
  Prohibition, Refresh, Eye,
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

/* ── Status meta ── */
const STATUS_META = {
  assigned:   { label: 'Assigned',   bg: '#ede9fe', color: '#7c3aed', icon: User,          action: 'Pick Up' },
  picked_up:  { label: 'Picked Up',  bg: '#fce7f3', color: '#be185d', icon: Package,       action: 'Start Delivery' },
  in_transit: { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1', icon: DeliveryTruck,  action: 'Mark Delivered' },
  delivered:  { label: 'Delivered',  bg: '#dcfce7', color: '#16a34a', icon: Check,          action: null },
  failed:     { label: 'Failed',     bg: '#fee2e2', color: '#dc2626', icon: Xmark,          action: null },
  returned:   { label: 'Returned',   bg: '#fff7ed', color: '#ea580c', icon: NavArrowRight,  action: null },
  cancelled:  { label: 'Cancelled',  bg: '#f1f5f9', color: '#64748b', icon: Prohibition,    action: null },
};

const NEXT_STATUS = {
  assigned:   'in_transit',
  picked_up:  'in_transit',
  in_transit: 'delivered',
};

const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short' }) : '';
const fmtAED  = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `AED ${n.toFixed(2)}` : '\u2014'; };

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
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
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
  const refreshRef              = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = tab === 'active' ? '' : tab === 'completed' ? 'completed' : 'failed';
      const res = await api.get(`/tracking/my-orders${statusParam ? `?status=${statusParam}` : ''}`);
      if (res.success) setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); fetchOrders(); }, [tab]);
  useEffect(() => {
    refreshRef.current = setInterval(fetchOrders, 30000);
    return () => clearInterval(refreshRef.current);
  }, [fetchOrders]);

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
    setUpdating(order.id);
    const gps = await getGPS();
    try {
      const res = await api.patch(`/tracking/${order.tracking_token}/status`, {
        status: 'failed', lat: gps?.lat, lng: gps?.lng, note: 'Delivery failed',
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

  /* Start Trip — batch-advance all assigned orders to in_transit */
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

  const stats = data?.stats || {};
  const orders = data?.orders || [];
  const driver = data?.driver || {};

  return (
    <div style={{ padding: '20px 20px 80px', maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#1e293b' }}>My Deliveries</h2>
          <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: 13 }}>
            {driver.name || 'Driver'} \u2014 {driver.status === 'available' ? '\ud83d\udfe2 Available' : '\ud83d\udfe1 Busy'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setLoading(true); fetchOrders(); }} title="Refresh"
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Refresh width={16} height={16} color="#475569" />
          </button>
          <button onClick={() => navigate('/driver/scan')}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none',
              background: '#f97316', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye width={15} height={15} /> Scan
          </button>
        </div>
      </div>

      {/* Start Trip Banner */}
      {tab === 'active' && orders.some(o => o.status === 'assigned') && (
        <button onClick={startTrip} disabled={starting}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none', marginBottom: 16,
            background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
            fontWeight: 800, fontSize: 15, cursor: starting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: starting ? 0.7 : 1, boxShadow: '0 4px 14px rgba(22,163,74,.3)',
          }}>
          <DeliveryTruck width={18} height={18} />
          {starting ? 'Starting...' : `Start Trip — ${orders.filter(o => o.status === 'assigned').length} order(s)`}
        </button>
      )}

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Active',    value: stats.active || 0,   color: '#f97316', Icon: DeliveryTruck },
          { label: 'Delivered', value: stats.delivered || 0, color: '#16a34a', Icon: CheckCircle },
          { label: 'Failed',    value: stats.failed || 0,   color: '#dc2626', Icon: Xmark },
          { label: 'Revenue',   value: fmtAED(stats.revenue), color: '#0369a1', Icon: DollarCircle },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 12, padding: '12px 10px', textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${s.color}`,
          }}>
            <s.Icon width={18} height={18} color={s.color} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'active',    label: 'Active',    count: stats.active },
          { key: 'completed', label: 'Delivered', count: stats.delivered },
          { key: 'failed',    label: 'Failed',    count: stats.failed },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 20, border: tab === t.key ? '2px solid #f97316' : '1px solid #e2e8f0',
              background: tab === t.key ? '#fff7ed' : '#fff', color: tab === t.key ? '#f97316' : '#64748b',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            {t.label} {t.count != null ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Package width={48} height={48} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <h3 style={{ color: '#1e293b', fontSize: 16, fontWeight: 700 }}>
            {tab === 'active' ? 'No active deliveries' : `No ${tab} orders today`}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            {tab === 'active' ? 'You\'ll see assigned orders here' : 'Check back later'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => {
            const m = STATUS_META[order.status] || STATUS_META.assigned;
            const next = NEXT_STATUS[order.status];
            const isUpdating = updating === order.id;
            const showCod = next === 'delivered' && order.payment_method === 'cod';

            return (
              <div key={order.id} style={{
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${m.color}`,
              }}>
                {/* Order header */}
                <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>{order.order_number}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                      {order.tracking_token}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px',
                    borderRadius: 20, fontSize: 12, fontWeight: 700, background: m.bg, color: m.color,
                  }}>
                    <m.icon width={12} height={12} />{m.label}
                  </span>
                </div>

                {/* Recipient */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <User width={14} height={14} color="#94a3b8" />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{order.recipient_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Phone width={14} height={14} color="#94a3b8" />
                    <a href={`tel:${order.recipient_phone}`} style={{ color: '#f97316', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                      {order.recipient_phone}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MapPin width={14} height={14} color="#94a3b8" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                      {order.recipient_address}
                      {order.recipient_area ? `, ${order.recipient_area}` : ''}
                      {order.recipient_emirate ? ` \u2014 ${order.recipient_emirate}` : ''}
                    </span>
                  </div>

                  {/* Navigate button */}
                  {(order.recipient_lat && order.recipient_lng) ? (
                    <a href={`https://maps.google.com/?q=${order.recipient_lat},${order.recipient_lng}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8,
                        background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: 12,
                        textDecoration: 'none', marginTop: 10,
                      }}>
                      <MapPin width={13} height={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                      Navigate
                    </a>
                  ) : order.recipient_address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(order.recipient_address + ' ' + (order.recipient_emirate || 'Dubai'))}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: 'block', textAlign: 'center', padding: '8px', borderRadius: 8,
                        background: '#dbeafe', color: '#1d4ed8', fontWeight: 600, fontSize: 12,
                        textDecoration: 'none', marginTop: 10,
                      }}>
                      <MapPin width={13} height={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                      Search in Maps
                    </a>
                  )}
                </div>

                {/* Payment / details strip */}
                <div style={{
                  display: 'flex', gap: 0, borderTop: '1px solid #f1f5f9',
                  fontSize: 12, color: '#64748b',
                }}>
                  <div style={{ flex: 1, padding: '8px 16px', borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Type</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{order.order_type?.replace(/_/g, ' ') || 'Standard'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 16px', borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Payment</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{order.payment_method?.toUpperCase()}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Fee</div>
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{fmtAED(order.delivery_fee)}</div>
                  </div>
                </div>

                {/* COD amount */}
                {order.payment_method === 'cod' && parseFloat(order.cod_amount) > 0 && (
                  <div style={{
                    padding: '8px 16px', background: '#fef3c7', borderTop: '1px solid #fcd34d',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  }}>
                    <Wallet width={14} height={14} color="#d97706" />
                    <span style={{ fontWeight: 700, color: '#92400e' }}>
                      Collect: AED {parseFloat(order.cod_amount).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Special instructions */}
                {order.special_instructions && (
                  <div style={{
                    padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9',
                    fontSize: 12, color: '#64748b',
                  }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>Note: </span>
                    {order.special_instructions}
                  </div>
                )}

                {/* Action buttons */}
                {tab === 'active' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                    {/* COD input */}
                    {showCod && (
                      <div style={{
                        background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10,
                        padding: '10px 12px', marginBottom: 10,
                      }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
                          COD Amount Collected
                        </label>
                        <input type="number" step="0.01" placeholder="Enter amount received"
                          value={codInput[order.id] || ''}
                          onChange={e => setCodInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 8,
                            border: '1px solid #fcd34d', fontSize: 14, fontWeight: 700,
                            color: '#92400e', background: '#fffbeb', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      {next && (
                        <button onClick={() => advanceStatus(order)} disabled={isUpdating}
                          style={{
                            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                            background: STATUS_META[next]?.color || '#f97316', color: '#fff',
                            cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 800,
                            fontSize: 14, opacity: isUpdating ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          }}>
                          {isUpdating ? 'Processing...' : (
                            <>
                              {next === 'in_transit' && order.status === 'assigned' && <><DeliveryTruck width={15} height={15} /> Start Order</>}
                              {next === 'in_transit' && order.status === 'picked_up' && <><DeliveryTruck width={15} height={15} /> Start Delivery</>}
                              {next === 'delivered'   && <><CheckCircle width={15} height={15} /> Deliver</>}
                            </>
                          )}
                        </button>
                      )}
                      {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <button onClick={() => markFailed(order)} disabled={isUpdating}
                          style={{
                            flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #fecaca',
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

                {/* Timestamp for completed/failed */}
                {tab !== 'active' && (
                  <div style={{
                    padding: '8px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8',
                    display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>{fmtDate(order.created_at)}</span>
                    <span>
                      {order.delivered_at && `Delivered ${fmtTime(order.delivered_at)}`}
                      {order.failed_at && `Failed ${fmtTime(order.failed_at)}`}
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
