import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../App';
import { connectSocket } from '../lib/socketClient';
import api from '../lib/api';
import {
  NavArrowRight, Truck, Phone, MapPin, Package, Clock,
  Expand, Compress, Refresh, Search, User, GpsFixed
} from 'iconoir-react';
import './CRMPages.css';

/* ── Fix leaflet marker icon paths (Vite) ────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ── Status config ───────────────────────────────────────────── */
const STATUS_COLOR = {
  available: '#22c55e',
  busy:      '#f97316',
  returning: '#8b5cf6',
  break:     '#0ea5e9',
  offline:   '#94a3b8',
};

const STATUS_LABELS = {
  available: 'Available',
  busy:      'On Delivery',
  returning: 'Returning',
  break:     'On Break',
  offline:   'Offline',
};

/* ── SVG Driver icon ─────────────────────────────────────────── */
function driverIcon(status, isSelected) {
  const color = STATUS_COLOR[status] || '#94a3b8';
  const size = isSelected ? 44 : 36;
  const ring = isSelected
    ? 'box-shadow:0 0 0 4px ' + color + '44, 0 2px 12px rgba(0,0,0,.45);'
    : 'box-shadow:0 2px 8px rgba(0,0,0,.35);';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:3px solid #fff;' + ring + 'display:flex;align-items:center;justify-content:center;transition:all .3s ease;">' +
      '<svg width="' + (size * 0.5) + '" height="' + (size * 0.5) + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>' +
      '<path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>' +
      '<path d="M5 17H3V6a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5"/>' +
      '</svg></div>',
  });
}

/* ── Delivery destination icon ───────────────────────────────── */
function deliveryIcon() {
  return L.divIcon({
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(45deg)"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>' +
      '</div><div style="width:3px;height:8px;background:#ef4444;border-radius:0 0 2px 2px;"></div></div>',
  });
}

/* ── Pickup icon ─────────────────────────────────────────────── */
function pickupIcon() {
  return L.divIcon({
    className: '',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
    html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
      '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#3b82f6;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.25);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(45deg)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
      '</div><div style="width:2px;height:6px;background:#3b82f6;border-radius:0 0 2px 2px;"></div></div>',
  });
}

/* ── Map helpers ─────────────────────────────────────────────── */
function FitBounds({ bounds }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (bounds && bounds.length >= 2 && !fitted.current) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    }
  }, [bounds]);
  return null;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 15, { duration: 1.2 });
  }, [center]);
  return null;
}

/* ── Haversine (km) ──────────────────────────────────────────── */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(dateStr) {
  if (!dateStr) return '\u2014';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  return Math.floor(diff / 3600) + 'h ago';
}

/* ══════════════════════════════════════════════════════════════ */
export default function LiveMap() {
  const { tenant } = useContext(AuthContext);
  const [drivers, setDrivers]        = useState({});
  const [filter, setFilter]          = useState('all');
  const [lastUpdate, setLastUpdate]  = useState(null);
  const [connected, setConnected]    = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [flyTarget, setFlyTarget]    = useState(null);
  const [showRoutes, setShowRoutes]  = useState(true);
  const [fullscreen, setFullscreen]  = useState(false);
  const [searchTerm, setSearchTerm]  = useState('');
  const [mapStyle, setMapStyle]      = useState('street');
  const socketRef = useRef(null);
  const mapContainerRef = useRef(null);

  const TILE_LAYERS = {
    street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '\u00a9 OpenStreetMap' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '\u00a9 Esri' },
    dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '\u00a9 CartoDB' },
  };

  /* ── Fetch locations ───────────────────────────────────────── */
  const fetchLocations = useCallback(() => {
    api.get('/drivers/live-locations').then(res => {
      if (res.success) {
        const m = {};
        res.data.forEach(d => { m[d.id] = d; });
        setDrivers(m);
        setLastUpdate(new Date());
      }
    });
  }, []);

  useEffect(() => {
    fetchLocations();
    const poll = setInterval(fetchLocations, 10000);
    return () => clearInterval(poll);
  }, [fetchLocations]);

  /* ── Socket.io ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!tenant?.id) return;
    const socket = connectSocket(tenant.id);
    socketRef.current = socket;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onLocation   = (data) => {
      setDrivers(prev => ({
        ...prev,
        [data.driver_id]: {
          ...(prev[data.driver_id] || {}),
          last_lat: data.lat, last_lng: data.lng,
          speed: data.speed, heading: data.heading,
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

  /* ── Derived data ──────────────────────────────────────────── */
  const allDrivers = Object.values(drivers);
  const filtered = (filter === 'all' ? allDrivers : allDrivers.filter(d => d.status === filter))
    .filter(d => !searchTerm || d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const withGPS = filtered.filter(d => d.last_lat && d.last_lng);
  const driversWithRoute = allDrivers.filter(d => d.delivery_lat && d.delivery_lng && d.last_lat && d.last_lng);

  const counts = allDrivers.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});

  const totalActive  = allDrivers.length;
  const withGPSCount = allDrivers.filter(d => d.last_lat && d.last_lng).length;
  const onDelivery   = counts.busy || 0;
  const avgSpeed = (() => {
    const s = allDrivers.filter(d => d.speed > 0).map(d => parseFloat(d.speed));
    return s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(0) : '0';
  })();

  const fitBounds = withGPS.length >= 2
    ? withGPS.map(d => [parseFloat(d.last_lat), parseFloat(d.last_lng)])
    : null;

  const toggleFullscreen = () => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (!fullscreen) el.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(!fullscreen);
  };

  const handleDriverClick = (d) => {
    setSelectedDriver(d.id === selectedDriver ? null : d.id);
    if (d.last_lat && d.last_lng) {
      setFlyTarget([parseFloat(d.last_lat), parseFloat(d.last_lng)]);
      setTimeout(() => setFlyTarget(null), 100);
    }
  };

  const tile = TILE_LAYERS[mapStyle];

  return (
    <div className="page-container" style={{ paddingBottom: 0 }}>
      {/* ── Stats Bar ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Active Drivers', value: totalActive, icon: <User width={18} />, color: '#3b82f6' },
          { label: 'GPS Tracking', value: withGPSCount + '/' + totalActive, icon: <GpsFixed width={18} />, color: '#22c55e' },
          { label: 'On Delivery', value: onDelivery, icon: <Truck width={18} />, color: '#f97316' },
          { label: 'Avg Speed', value: avgSpeed + ' km/h', icon: <Clock width={18} />, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: s.color + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="page-heading" style={{ margin: 0 }}>Live Map</h2>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem',
            padding: '4px 10px', borderRadius: 99, fontWeight: 600,
            background: connected ? '#dcfce7' : '#fef3c7',
            color: connected ? '#16a34a' : '#d97706',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#22c55e' : '#f59e0b',
              display: 'inline-block',
              animation: connected ? 'pulse 2s infinite' : 'none',
            }} />
            {connected ? 'Live' : 'Polling'}
          </span>
          {lastUpdate && (
            <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {Object.keys(TILE_LAYERS).map(key => (
              <button key={key} onClick={() => setMapStyle(key)} style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: '.7rem', fontWeight: 600,
                background: mapStyle === key ? '#244066' : 'transparent',
                color: mapStyle === key ? '#fff' : 'var(--text-muted)',
                textTransform: 'capitalize', transition: 'all .2s',
              }}>{key}</button>
            ))}
          </div>
          <button onClick={() => setShowRoutes(!showRoutes)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600,
            background: showRoutes ? '#f970161a' : 'var(--bg-hover)',
            color: showRoutes ? '#f97316' : 'var(--text-muted)',
          }}>
            <NavArrowRight width={14} /> Routes
          </button>
          <button onClick={fetchLocations} title="Refresh" style={{
            display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: 'var(--bg-hover)', color: 'var(--text-muted)',
          }}>
            <Refresh width={14} />
          </button>
          <button onClick={toggleFullscreen} title="Fullscreen" style={{
            display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: 'var(--bg-hover)', color: 'var(--text-muted)',
          }}>
            {fullscreen ? <Compress width={14} /> : <Expand width={14} />}
          </button>
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => setFilter('all')}
          style={{ padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '.75rem', background: filter === 'all' ? '#244066' : 'var(--bg-hover)', color: filter === 'all' ? '#fff' : 'var(--text-secondary)', transition: 'all .2s' }}>
          All ({allDrivers.length})
        </button>
        {Object.entries(STATUS_COLOR).filter(([s]) => s !== 'offline').map(([s, c]) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '4px 12px', borderRadius: 99, border: '2px solid ' + (filter === s ? c : 'transparent'), cursor: 'pointer', fontWeight: 600, fontSize: '.75rem', background: filter === s ? c + '20' : 'var(--bg-hover)', color: filter === s ? c : 'var(--text-secondary)', transition: 'all .2s' }}>
            {STATUS_LABELS[s]} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* ── Map + Sidebar ────────────────────────────────────── */}
      <div ref={mapContainerRef} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12 }}>
        {/* MAP */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', height: fullscreen ? '100vh' : 580, position: 'relative' }}>
          <MapContainer center={[25.2, 55.3]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution={tile.attr} url={tile.url} key={mapStyle} />
            {fitBounds && <FitBounds bounds={fitBounds} />}
            {flyTarget && <FlyTo center={flyTarget} zoom={15} />}

            {/* Route lines: driver --> delivery */}
            {showRoutes && driversWithRoute.map(d => {
              const dP = [parseFloat(d.last_lat), parseFloat(d.last_lng)];
              const delP = [parseFloat(d.delivery_lat), parseFloat(d.delivery_lng)];
              const dist = haversineKm(...dP, ...delP);
              const elems = [];

              elems.push(
                <Polyline key={'route-' + d.id} positions={[dP, delP]}
                  pathOptions={{ color: '#f97316', weight: 3, opacity: 0.7, dashArray: '8 6' }}>
                  <Tooltip sticky>
                    <div style={{ fontSize: '.75rem', fontWeight: 600 }}>
                      {d.full_name} &rarr; {d.recipient_name || 'Delivery'}
                      <br /><span style={{ color: '#6b7280' }}>{dist.toFixed(1)} km away</span>
                    </div>
                  </Tooltip>
                </Polyline>
              );

              if (d.pickup_lat && d.pickup_lng && d.order_status === 'assigned') {
                const pP = [parseFloat(d.pickup_lat), parseFloat(d.pickup_lng)];
                elems.push(
                  <Polyline key={'pickup-rt-' + d.id} positions={[dP, pP]}
                    pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.5, dashArray: '4 6' }} />,
                  <Marker key={'pickup-' + d.id} position={pP} icon={pickupIcon()}>
                    <Popup><div style={{ fontSize: '.8rem', fontWeight: 600 }}>Pickup &mdash; {d.current_order}</div></Popup>
                  </Marker>
                );
              }

              elems.push(
                <Marker key={'dest-' + d.id} position={delP} icon={deliveryIcon()}>
                  <Popup>
                    <div style={{ fontSize: '.8rem', minWidth: 160 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, color: '#ef4444' }}>Delivery Destination</div>
                      <div style={{ fontWeight: 600 }}>{d.recipient_name || '\u2014'}</div>
                      <div style={{ color: '#6b7280', fontSize: '.72rem', marginTop: 2 }}>{d.recipient_address || '\u2014'}</div>
                      <div style={{ marginTop: 6, padding: '3px 8px', background: '#fff7ed', borderRadius: 4, fontSize: '.72rem', fontWeight: 600, color: '#ea580c', display: 'inline-block' }}>
                        {d.current_order}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
              return elems;
            })}

            {/* Driver markers */}
            {withGPS.map(d => {
              const isSelected = d.id === selectedDriver;
              const dist = (d.delivery_lat && d.delivery_lng)
                ? haversineKm(parseFloat(d.last_lat), parseFloat(d.last_lng), parseFloat(d.delivery_lat), parseFloat(d.delivery_lng))
                : null;
              const eta = dist ? Math.ceil((dist / 40) * 60) : null;

              return (
                <Marker key={d.id}
                  position={[parseFloat(d.last_lat), parseFloat(d.last_lng)]}
                  icon={driverIcon(d.status, isSelected)}
                  eventHandlers={{ click: () => setSelectedDriver(d.id === selectedDriver ? null : d.id) }}
                >
                  <Popup>
                    <div style={{ minWidth: 240, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '.82rem', lineHeight: 1.5, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                        background: 'linear-gradient(135deg, ' + (STATUS_COLOR[d.status] || '#94a3b8') + ', ' + (STATUS_COLOR[d.status] || '#94a3b8') + 'cc)',
                        color: '#fff',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.82rem' }}>
                            {d.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{d.full_name}</div>
                            <div style={{ fontSize: '.68rem', opacity: 0.85 }}>{d.vehicle_type?.replace('_', ' ') || 'Driver'}</div>
                          </div>
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.66rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)' }}>
                          {STATUS_LABELS[d.status] || d.status}
                        </span>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {d.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: '.78rem' }}>
                            <Phone width={13} /> <span style={{ fontWeight: 500 }}>{d.phone}</span>
                          </div>
                        )}
                        {d.zone_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: '.76rem' }}>
                            <MapPin width={13} /> {d.zone_name}
                          </div>
                        )}
                        {d.current_order && (
                          <>
                            <div style={{ borderTop: '1px solid #f3f4f6', margin: '2px 0' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa' }}>
                              <Package width={13} color="#ea580c" />
                              <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '.82rem' }}>{d.current_order}</span>
                              {dist != null && <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: '#6b7280' }}>{dist.toFixed(1)} km</span>}
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                          {d.speed != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '.74rem' }}>
                              <Clock width={12} /> {parseFloat(d.speed).toFixed(0)} km/h
                            </div>
                          )}
                          {eta != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f97316', fontSize: '.74rem', fontWeight: 600 }}>
                              <Clock width={12} /> ~{eta} min ETA
                            </div>
                          )}
                        </div>
                        {d.last_ping && (
                          <div style={{ color: '#9ca3af', fontSize: '.7rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <GpsFixed width={11} /> {timeAgo(d.last_ping)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 999,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            borderRadius: 8, padding: '8px 12px', fontSize: '.68rem',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', display: 'flex', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> On Delivery
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> Returning
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 0, borderTop: '2px dashed #f97316' }} /> Route
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 14, borderRadius: '50% 50% 50% 0', background: '#ef4444', border: '1px solid #fff', transform: 'rotate(-45deg)', display: 'inline-block' }} /> Delivery
            </span>
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: fullscreen ? '100vh' : 580 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <Search width={14} color="var(--text-muted)" />
              <input type="text" placeholder="Search drivers..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '.8rem', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Drivers ({filtered.length})
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '.84rem' }}>No drivers found</div>
            ) : filtered.map(d => {
              const isSelected = d.id === selectedDriver;
              const dist = (d.delivery_lat && d.delivery_lng && d.last_lat && d.last_lng)
                ? haversineKm(parseFloat(d.last_lat), parseFloat(d.last_lng), parseFloat(d.delivery_lat), parseFloat(d.delivery_lng))
                : null;
              const eta = dist ? Math.ceil((dist / 40) * 60) : null;

              return (
                <div key={d.id} onClick={() => handleDriverClick(d)}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    background: isSelected ? (STATUS_COLOR[d.status] || '#94a3b8') + '10' : 'transparent',
                    borderLeft: isSelected ? '3px solid ' + (STATUS_COLOR[d.status] || '#94a3b8') : '3px solid transparent',
                    transition: 'all .15s ease',
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: (STATUS_COLOR[d.status] || '#94a3b8') + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: STATUS_COLOR[d.status] || '#94a3b8',
                  }}>
                    <Truck width={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.full_name}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {d.zone_name || 'No zone'}
                      {d.last_ping && (
                        <><span style={{ color: '#d1d5db' }}>&middot;</span><span>{timeAgo(d.last_ping)}</span></>
                      )}
                    </div>
                    {d.current_order && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: '.68rem' }}>
                        <Package width={11} color="#ea580c" />
                        <span style={{ fontWeight: 600, color: '#ea580c' }}>{d.current_order}</span>
                        {dist != null && <span style={{ color: '#6b7280', marginLeft: 4 }}>{dist.toFixed(1)} km</span>}
                        {eta != null && <span style={{ color: '#f97316', fontWeight: 600, marginLeft: 4 }}>~{eta}m</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: '.65rem',
                      fontWeight: 700, background: (STATUS_COLOR[d.status] || '#94a3b8') + '20',
                      color: STATUS_COLOR[d.status] || '#94a3b8',
                    }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                    {d.speed != null && d.speed > 0 && (
                      <div style={{ fontSize: '.62rem', color: '#6b7280', marginTop: 2 }}>{parseFloat(d.speed).toFixed(0)} km/h</div>
                    )}
                    {!d.last_lat && <div style={{ fontSize: '.62rem', color: '#94a3b8', marginTop: 2 }}>No GPS</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
