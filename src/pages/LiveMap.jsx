import { useState, useEffect, useRef, useContext } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../App';
import { connectSocket, disconnectSocket } from '../lib/socketClient';
import api from '../lib/api';
import './CRMPages.css';

/* ── Fix leaflet marker icon paths (Vite) ────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLOR = {
  available: '#22c55e',
  busy:      '#f97316',
  returning: '#8b5cf6',
  break:     '#0ea5e9',
  offline:   '#94a3b8',
};

function driverIcon(status) {
  const color = STATUS_COLOR[status] || '#94a3b8';
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `<div style="
      width:36px; height:36px; border-radius:50%;
      background:${color}; border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex; align-items:center; justify-content:center;
      font-size:16px;">🚚</div>`,
  });
}

/* Recenter map helper */
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center]);
  return null;
}

const STATUS_LABELS = {
  available: 'Available',
  busy:      'On Delivery',
  returning: 'Returning',
  break:     'On Break',
  offline:   'Offline',
};

export default function LiveMap() {
  const { tenant } = useContext(AuthContext);
  const [drivers, setDrivers]  = useState({});   // keyed by driver_id
  const [filter, setFilter]    = useState('all');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected]   = useState(false);
  const socketRef = useRef(null);

  /* ── Load initial driver locations ────────────────────────── */
  useEffect(() => {
    api.get('/drivers/live-locations').then(res => {
      if (res.success) {
        const map = {};
        res.data.forEach(d => { map[d.id] = d; });
        setDrivers(map);
      }
    });
  }, []);

  /* ── Socket.io subscription ────────────────────────────────── */
  useEffect(() => {
    if (!tenant?.id) return;

    const socket = connectSocket(tenant.id);
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onLocation = (data) => {
      setDrivers(prev => ({
        ...prev,
        [data.driver_id]: {
          ...(prev[data.driver_id] || {}),
          last_lat: data.lat,
          last_lng: data.lng,
          speed:    data.speed,
          heading:  data.heading,
          last_ping: data.timestamp,
        },
      }));
      setLastUpdate(new Date());
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('driver:location', onLocation);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('driver:location', onLocation);
    };
  }, [tenant]);

  const allDrivers = Object.values(drivers);
  const filtered   = filter === 'all' ? allDrivers : allDrivers.filter(d => d.status === filter);
  const withGPS    = filtered.filter(d => d.last_lat && d.last_lng);

  const counts = allDrivers.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="page-heading">Live Map</h2>
          <p className="page-subheading">
            {withGPS.length} driver{withGPS.length !== 1 ? 's' : ''} on map
            {lastUpdate && (
              <span style={{ marginLeft: 12, fontSize: '.75rem', color: 'var(--text-muted)' }}>
                — last update {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem',
            padding: '5px 12px', borderRadius: 99, fontWeight: 600,
            background: connected ? '#dcfce7' : '#fee2e2',
            color: connected ? '#16a34a' : '#dc2626',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setFilter('all')}
          style={{ padding: '5px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem', background: filter === 'all' ? '#244066' : 'var(--bg-hover)', color: filter === 'all' ? '#fff' : 'var(--text-secondary)' }}>
          All ({allDrivers.length})
        </button>
        {Object.entries(STATUS_COLOR).filter(([s]) => s !== 'offline').map(([s, c]) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '5px 14px', borderRadius: 99, border: `2px solid ${filter === s ? c : 'transparent'}`, cursor: 'pointer', fontWeight: 600, fontSize: '.8rem', background: filter === s ? c + '20' : 'var(--bg-hover)', color: filter === s ? c : 'var(--text-secondary)' }}>
            {STATUS_LABELS[s]} {counts[s] ? `(${counts[s]})` : '(0)'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Map */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', height: 560 }}>
          <MapContainer
            center={[25.2, 55.3]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withGPS.map(d => (
              <Marker
                key={d.id}
                position={[parseFloat(d.last_lat), parseFloat(d.last_lng)]}
                icon={driverIcon(d.status)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      🚚 {d.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                      {d.vehicle_type?.replace('_', ' ')} · {d.phone}
                    </div>
                    {d.zone_name && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        📍 Zone: {d.zone_name}
                      </div>
                    )}
                    {d.current_order && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f97316' }}>
                        📦 {d.current_order}
                      </div>
                    )}
                    <div style={{ marginTop: 8, padding: '3px 8px', borderRadius: 99, display: 'inline-block', fontSize: 11, fontWeight: 700, background: (STATUS_COLOR[d.status] || '#94a3b8') + '20', color: STATUS_COLOR[d.status] || '#94a3b8' }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </div>
                    {d.speed != null && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        Speed: {parseFloat(d.speed).toFixed(0)} km/h
                      </div>
                    )}
                    {d.last_ping && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Last ping: {new Date(d.last_ping).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Driver list sidebar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 560 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Drivers
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '.875rem' }}>
                No drivers active
              </div>
            ) : filtered.map(d => (
              <div key={d.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: (STATUS_COLOR[d.status] || '#94a3b8') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  🚚
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.full_name}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                    {d.zone_name || 'No zone'}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700, background: (STATUS_COLOR[d.status] || '#94a3b8') + '20', color: STATUS_COLOR[d.status] || '#94a3b8' }}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                  {!d.last_lat && (
                    <div style={{ fontSize: '.65rem', color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>No GPS</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
