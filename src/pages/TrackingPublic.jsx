import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

let leafletLoaded = false;
function ensureLeaflet() {
  if (leafletLoaded || typeof window === 'undefined') return;
  leafletLoaded = true;
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  if (!document.getElementById('leaflet-zoom-spacing')) {
    const style = document.createElement('style');
    style.id = 'leaflet-zoom-spacing';
    style.textContent = '.leaflet-control-zoom { display: flex; flex-direction: column; gap: 8px; } .leaflet-control-zoom-in, .leaflet-control-zoom-out { margin: 0 !important; }';
    document.head.appendChild(style);
  }
  if (!document.getElementById('leaflet-js')) {
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.head.appendChild(script);
  }
}

const STATUS_STEPS = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'];
const STATUS_LABELS = {
  pending: 'Order Placed', confirmed: 'Confirmed', assigned: 'Driver Assigned',
  picked_up: 'Picked Up', in_transit: 'On The Way', delivered: 'Delivered',
  failed: 'Delivery Failed', returned: 'Returned', cancelled: 'Cancelled',
};
const STATUS_EMOJI = {
  pending: '🕐', confirmed: '✅', assigned: '👤', picked_up: '📦',
  in_transit: '🚗', delivered: '🎉', failed: '❌', returned: '↩️', cancelled: '🚫',
};
const LIVE_STATUSES = new Set(['picked_up', 'in_transit']);

export default function TrackingPublic() {
  const { token } = useParams();
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markerRef = useRef(null);
  const timerRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const socketRef = useRef(null);

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  const fetchOrder = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${apiBase}/tracking/${token}`);
      const data = await r.json();
      if (data.success) { setOrder(data.data); setError(''); setLastRefresh(new Date()); }
      else setError(data.message || 'Order not found');
    } catch { setError('Unable to load tracking information'); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    if (!token) { setError('Invalid tracking link'); setLoading(false); return; }
    ensureLeaflet();
    fetchOrder();
  }, [token]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (order && LIVE_STATUSES.has(order.status)) {
      timerRef.current = setInterval(() => fetchOrder(true), 15000);
    }
    return () => clearInterval(timerRef.current);
  }, [order?.status]);

  /* ── Socket.IO for real-time driver location ── */
  useEffect(() => {
    if (!token || !order || !LIVE_STATUSES.has(order.status)) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return;
    }
    const base = (import.meta.env.VITE_API_URL || '/api').replace('/api', '');
    const socket = io(base, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-tracking', token);
    });

    socket.on('driver:location', (data) => {
      setOrder(prev => prev ? {
        ...prev,
        driver_location: { lat: data.lat, lng: data.lng, recorded_at: data.timestamp },
      } : prev);
      setLastRefresh(new Date());
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, order?.status]);

  useEffect(() => {
    if (!order?.driver_location || !mapRef.current) return;
    const { lat, lng } = order.driver_location;
    if (!lat || !lng) return;
    const initMap = () => {
      const L = window.L;
      if (!L) return setTimeout(initMap, 300);
      if (!mapObjRef.current) {
        mapObjRef.current = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapObjRef.current);
      }
      const driverIcon = L.divIcon({
        className: '',
        html: '<div style="background:#f97316;border:3px solid #fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚗</div>',
        iconSize: [40, 40], iconAnchor: [20, 20],
      });
      if (markerRef.current) { markerRef.current.setLatLng([lat, lng]); }
      else {
        markerRef.current = L.marker([lat, lng], { icon: driverIcon }).addTo(mapObjRef.current)
          .bindPopup(`<div style="min-width:180px;font-family:Inter,system-ui,sans-serif">
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:8px 8px 0 0;color:#fff;font-weight:700;font-size:13px">
              <span style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:11px">🚗</span>
              Your Driver
            </div>
            <div style="padding:8px 10px;font-size:12px;color:#374151">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${order.driver_name || 'Driver'}</div>
              ${order.driver_phone ? `<div style="color:#6b7280">📱 ${order.driver_phone}</div>` : ''}
            </div>
          </div>`);
      }
      if (order.recipient_lat && order.recipient_lng) {
        const destIcon = L.divIcon({
          className: '',
          html: '<div style="background:#1d4ed8;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>',
          iconSize: [36, 36], iconAnchor: [18, 18],
        });
        L.marker([order.recipient_lat, order.recipient_lng], { icon: destIcon }).addTo(mapObjRef.current)
          .bindPopup(`<div style="min-width:180px;font-family:Inter,system-ui,sans-serif">
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:8px 8px 0 0;color:#fff;font-weight:700;font-size:13px">
              <span style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:11px">📍</span>
              Delivery Location
            </div>
            <div style="padding:8px 10px;font-size:12px;color:#374151">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${order.recipient_name || ''}</div>
              <div style="color:#6b7280">${order.recipient_address || ''}</div>
              ${order.recipient_area ? `<div style="color:#9ca3af;font-size:11px;margin-top:2px">🏙️ ${order.recipient_area}${order.recipient_emirate ? ', ' + order.recipient_emirate : ''}</div>` : ''}
            </div>
          </div>`);
        mapObjRef.current.fitBounds([[lat, lng], [order.recipient_lat, order.recipient_lng]], { padding: [40, 40] });
      } else {
        mapObjRef.current.setView([lat, lng], 14);
      }
    };
    initMap();
  }, [order?.driver_location?.lat, order?.driver_location?.lng]);

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isFinal = order && ['delivered', 'failed', 'returned', 'cancelled'].includes(order.status);
  const isLive = order && LIVE_STATUSES.has(order.status);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#f97316', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🚚</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>Trasealla</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Delivery Tracking</div>
          </div>
        </div>
        {lastRefresh && isLive && (
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'right' }}>
            <div>🔄 Auto-updating</div>
            <div>{lastRefresh.toLocaleTimeString()}</div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <div style={{ color: '#64748b', fontSize: 18 }}>Loading tracking info...</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ color: '#dc2626', fontSize: 18, fontWeight: 700 }}>{error}</div>
            <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Check your tracking link or contact support</div>
          </div>
        )}

        {order && !loading && (
          <>
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16, textAlign: 'center',
              borderTop: '4px solid ' + (isFinal && order.status === 'delivered' ? '#16a34a' : isFinal ? '#dc2626' : '#f97316') }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{STATUS_EMOJI[order.status] || '📦'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{STATUS_LABELS[order.status] || order.status}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Order #{order.order_number}</div>
              {isLive && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef3c7', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  Driver is live — map updates every 30s
                </div>
              )}
              {order.status === 'delivered' && order.delivered_at && (
                <div style={{ marginTop: 10, color: '#16a34a', fontWeight: 600, fontSize: 14 }}>
                  Delivered {new Date(order.delivered_at).toLocaleString()}
                </div>
              )}
            </div>

            {!isFinal && currentStep >= 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
                <div style={{ position: 'relative', paddingBottom: 32 }}>
                  <div style={{ position: 'absolute', top: 14, left: '8%', right: '8%', height: 2, background: '#e2e8f0' }} />
                  <div style={{ position: 'absolute', top: 14, left: '8%', height: 2, background: '#f97316', width: (currentStep / (STATUS_STEPS.length - 1) * 84) + '%', transition: 'width 0.6s ease' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx <= currentStep;
                      const active = idx === currentStep;
                      return (
                        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#f97316' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                            color: done ? '#fff' : '#94a3b8', border: active ? '3px solid #ea580c' : 'none',
                            zIndex: 1, position: 'relative', boxShadow: active ? '0 0 0 4px rgba(249,115,22,0.2)' : 'none' }}>
                            {done ? (active ? STATUS_EMOJI[step] : '✓') : idx + 1}
                          </div>
                          <div style={{ fontSize: 10, textAlign: 'center', color: done ? '#f97316' : '#94a3b8', fontWeight: done ? 700 : 400, lineHeight: 1.2 }}>
                            {STATUS_LABELS[step]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {order.driver_location && (
              <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>🗺️ Live Driver Location</span>
                  {lastRefresh && <span style={{ fontSize: 12, color: '#94a3b8' }}>as of {lastRefresh.toLocaleTimeString()}</span>}
                </div>
                <div ref={mapRef} style={{ height: 260, width: '100%' }} />
              </div>
            )}

            {order.driver_name && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#c2410c', marginBottom: 12 }}>🚚 Your Driver</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f97316', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {order.driver_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{order.driver_name}</div>
                    {order.driver_phone && (
                      <a href={'tel:' + order.driver_phone} style={{ color: '#f97316', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'block', marginTop: 2 }}>
                        📞 {order.driver_phone}
                      </a>
                    )}
                    {order.vehicle_type && (
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{order.vehicle_type} · {order.vehicle_plate}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📦 Order Details</div>
              {[
                { label: 'Recipient', value: order.recipient_name },
                { label: 'Address',   value: order.recipient_address },
                { label: 'Emirate',   value: order.recipient_emirate },
                { label: 'Type',      value: order.order_type?.replace(/_/g, ' ') },
                { label: 'Payment',   value: order.payment_method?.toUpperCase() },
                order.cod_amount > 0 ? { label: 'COD Amount', value: 'AED ' + parseFloat(order.cod_amount).toFixed(2), highlight: true } : null,
                order.scheduled_at ? { label: 'Scheduled', value: new Date(order.scheduled_at).toLocaleString() } : null,
              ].filter(Boolean).map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: item.highlight ? 800 : 500, color: item.highlight ? '#f97316' : 'inherit' }}>{item.value || '—'}</span>
                </div>
              ))}
            </div>

            {order.status_logs?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🕐 Shipment Journey</div>
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: '#f1f5f9' }} />
                  {order.status_logs.map((log, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: 18 }}>
                      <div style={{ position: 'absolute', left: -21, top: 4, width: 10, height: 10, borderRadius: '50%',
                        background: idx === order.status_logs.length - 1 ? '#f97316' : '#cbd5e1' }} />
                      <div style={{ fontWeight: 600, fontSize: 14, color: idx === order.status_logs.length - 1 ? '#f97316' : '#1e293b' }}>
                        {STATUS_EMOJI[log.status]} {STATUS_LABELS[log.status] || log.status}
                      </div>
                      {(log.note || log.notes) && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{log.note || log.notes}</div>}
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLive && (
              <button onClick={() => fetchOrder(true)}
                style={{ width: '100%', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#64748b' }}>
                🔄 Refresh Now
              </button>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: 12, borderTop: '1px solid #f1f5f9' }}>
        Powered by <strong>Trasealla</strong> Delivery Platform
      </div>
    </div>
  );
}
