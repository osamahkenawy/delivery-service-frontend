import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from '../App';
import { connectSocket } from '../lib/socketClient';
import api from '../lib/api';
import {
  NavArrowRight, Truck, Phone, MapPin, Package, Clock,
  Expand, Compress, Refresh, Search, User, Gps, Check, Prohibition
} from 'iconoir-react';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

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

/* ── Route Info Modal ────────────────────────────────────────── */
function RouteInfoModal({ info, onClose }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  if (!info) return null;
  const mins = info.duration ?? Math.ceil((info.dist / 40) * 60);
  const hrs  = Math.floor(mins / 60);
  const rem  = mins % 60;
  const timeStr = hrs > 0 ? t('liveMap.time_hours_minutes', { hours: hrs, minutes: rem }) : t('liveMap.time_minutes', { minutes: mins });
  const isRoad = info.isRoad;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        width: 380, boxShadow: '0 24px 60px rgba(0,0,0,.3)',
        animation: 'routeModalIn .22s cubic-bezier(.34,1.56,.64,1)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #244066 0%, #1a3057 100%)',
          padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NavArrowRight width={20} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t("liveMap.route_summary")}</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{info.driverName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>×</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#f1f5f9' }}>
          {/* Distance */}
          <div style={{ background: '#fff', padding: '22px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
            }}>
              <MapPin width={22} color="#f97316" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{info.dist.toFixed(1)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', marginTop: 2 }}>{t('liveMap.kilometers')}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{isRoad ? t('liveMap.road_distance') : t('liveMap.straight_line_distance')}</div>
          </div>
          {/* ETA */}
          <div style={{ background: '#fff', padding: '22px 24px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
            }}>
              <Clock width={22} color="#22c55e" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{timeStr}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginTop: 2 }}>{t('liveMap.estimated')}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{isRoad ? t('liveMap.osrm_routing') : t('liveMap.avg_speed_estimate')}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 22px 20px' }}>
          {/* Route line visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[info.status] || '#f97316', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
              <div style={{ width: 2, height: 28, background: 'linear-gradient(to bottom, ' + (STATUS_COLOR[info.status] || '#f97316') + ', #ef4444)', borderRadius: 1 }} />
              <div style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', background: '#ef4444', transform: 'rotate(-45deg)', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
            </div>
            <div style={{ flex: 1, [isRTL?'marginRight':'marginLeft']: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t("liveMap.driver_position")}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>{info.driverName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t("liveMap.delivery_to")}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>{info.recipientName || t('liveMap.unknown_recipient')}</div>
                {info.recipientAddress && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{info.recipientAddress}</div>}
              </div>
            </div>
          </div>

          {info.orderNum && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa',
            }}>
              <Package width={14} color="#ea580c" />
              <span style={{ fontWeight: 700, color: '#ea580c', fontSize: 13 }}>{info.orderNum}</span>
              <span style={{
                [isRTL?'marginRight':'marginLeft']: 'auto', fontSize: 11, fontWeight: 600, color: '#fff',
                padding: '2px 8px', borderRadius: 99,
                background: STATUS_COLOR[info.status] || '#f97316',
              }}>{t('liveMap.status_' + info.status)}</span>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes routeModalIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
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

function timeAgo(dateStr, t) {
  if (!dateStr) return '\u2014';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return t('liveMap.seconds_ago', { count: Math.floor(diff) });
  if (diff < 3600) return t('liveMap.minutes_ago', { count: Math.floor(diff / 60) });
  return t('liveMap.hours_ago', { count: Math.floor(diff / 3600) });
}

/* ══════════════════════════════════════════════════════════════ */
export default function LiveMap() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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
  const [routeModal, setRouteModal]  = useState(null);
  const [routeCache, setRouteCache]  = useState({});  // driverId -> { coords, distance, duration }
  const socketRef = useRef(null);
  const mapContainerRef = useRef(null);
  const routeFetchedRef = useRef(new Set());

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

  /* ── Fetch OSRM routes ────────────────────────────────────── */
  useEffect(() => {
    driversWithRoute.forEach(d => {
      const cacheKey = `${d.id}-${parseFloat(d.last_lat).toFixed(4)}-${parseFloat(d.last_lng).toFixed(4)}-${parseFloat(d.delivery_lat).toFixed(4)}-${parseFloat(d.delivery_lng).toFixed(4)}`;
      if (routeFetchedRef.current.has(cacheKey)) return;
      routeFetchedRef.current.add(cacheKey);
      const url = `https://router.project-osrm.org/route/v1/driving/${d.last_lng},${d.last_lat};${d.delivery_lng},${d.delivery_lat}?overview=full&geometries=geojson`;
      fetch(url).then(r => r.json()).then(data => {
        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lng,lat] -> [lat,lng]
          setRouteCache(prev => ({
            ...prev,
            [d.id]: { coords, distance: route.distance / 1000, duration: route.duration / 60 },
          }));
        }
      }).catch(() => { /* fallback to straight line */ });
    });
  }, [driversWithRoute.map(d => d.id + d.last_lat + d.delivery_lat).join(',')]);

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

  const offlineCount = counts.offline || 0;

  return (
    <div className="page-container">
      {/* ── Stats Bar (Drivers-style) ────────────────────────── */}
      <div className="ord-stats-row">
        <div className="ord-stat-card">
          <div className="ord-stat-icon" style={{ background: '#24406618', color: '#244066' }}>
            <User width={18} height={18} />
          </div>
          <div className="ord-stat-info">
            <div className="ord-stat-value">{totalActive}</div>
            <div className="ord-stat-label">{t("liveMap.total_drivers")}</div>
          </div>
        </div>
        {[
          { key: 'available', label: t('liveMap.stat_available'), value: counts.available || 0, icon: <Check width={18} height={18} />, bg: '#dcfce7', color: '#16a34a' },
          { key: 'busy',      label: t('liveMap.stat_busy'),      value: counts.busy || 0,      icon: <Truck width={18} height={18} />, bg: '#fce7f3', color: '#be185d' },
          { key: 'on_break',  label: t('liveMap.stat_on_break'),  value: counts.on_break || 0,  icon: <Clock width={18} height={18} />, bg: '#fef3c7', color: '#d97706' },
          { key: 'offline',   label: t('liveMap.stat_offline'),   value: offlineCount,          icon: <Prohibition width={18} height={18} />, bg: '#f1f5f9', color: '#94a3b8' },
        ].map(s => (
          <div key={s.key} className="ord-stat-card drv-stat-clickable"
            onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}>
            <div className="ord-stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="ord-stat-info">
              <div className="ord-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="ord-stat-label">{s.label}</div>
            </div>
            {filter === s.key && <div className="drv-stat-active-pip" style={{ background: s.color }} />}
          </div>
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="lm-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 className="module-hero-title" style={{ margin: 0 }}>{t("liveMap.title")}</h2>
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
            {connected ? t('liveMap.live_status') : t('liveMap.polling_status')}
          </span>
          {lastUpdate && (
            <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
              {t('liveMap.updated_time', { time: lastUpdate.toLocaleTimeString() })}
            </span>
          )}
        </div>
        <div className="lm-header-actions">
          <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {Object.keys(TILE_LAYERS).map(key => (
              <button key={key} onClick={() => setMapStyle(key)} style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: '.7rem', fontWeight: 600,
                background: mapStyle === key ? '#244066' : 'transparent',
                color: mapStyle === key ? '#fff' : 'var(--text-muted)',
                textTransform: 'capitalize', transition: 'all .2s',
              }}>{t('liveMap.map_' + key)}</button>
            ))}
          </div>
          <button onClick={() => setShowRoutes(!showRoutes)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600,
            background: showRoutes ? '#f970161a' : 'var(--bg-hover)',
            color: showRoutes ? '#f97316' : 'var(--text-muted)',
          }}>
            <NavArrowRight width={14} /> {t('liveMap.routes_btn')}
          </button>
          <button onClick={fetchLocations} title={t('liveMap.refresh')} style={{
            display: 'flex', alignItems: 'center', padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer',
            background: 'var(--bg-hover)', color: 'var(--text-muted)',
          }}>
            <Refresh width={14} />
          </button>
          <button onClick={toggleFullscreen} title={t('liveMap.fullscreen')} style={{
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
          {t('liveMap.all_filter', { count: allDrivers.length })}
        </button>
        {Object.entries(STATUS_COLOR).filter(([s]) => s !== 'offline').map(([s, c]) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '4px 12px', borderRadius: 99, border: '2px solid ' + (filter === s ? c : 'transparent'), cursor: 'pointer', fontWeight: 600, fontSize: '.75rem', background: filter === s ? c + '20' : 'var(--bg-hover)', color: filter === s ? c : 'var(--text-secondary)', transition: 'all .2s' }}>
            {t('liveMap.status_' + s)} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* ── Map + Sidebar ────────────────────────────────────── */}
      <div ref={mapContainerRef} className="lm-map-layout">
        {/* MAP */}
        <div className="lm-map-panel" style={{ height: fullscreen ? '100vh' : undefined }}>
          <MapContainer center={[25.2, 55.3]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution={tile.attr} url={tile.url} key={mapStyle} />
            {fitBounds && <FitBounds bounds={fitBounds} />}
            {flyTarget && <FlyTo center={flyTarget} zoom={15} />}

            {/* Route lines: driver --> delivery (OSRM road route) */}
            {showRoutes && driversWithRoute.map(d => {
              const dP = [parseFloat(d.last_lat), parseFloat(d.last_lng)];
              const delP = [parseFloat(d.delivery_lat), parseFloat(d.delivery_lng)];
              const cached = routeCache[d.id];
              const dist = cached ? cached.distance : haversineKm(...dP, ...delP);
              const routePositions = cached ? cached.coords : [dP, delP];
              const elems = [];

              const mins = cached ? Math.ceil(cached.duration) : Math.ceil((dist / 40) * 60);
              const hrs  = Math.floor(mins / 60);
              const rem  = mins % 60;
              const etaStr = hrs > 0 ? t('liveMap.time_hours_minutes', { hours: hrs, minutes: rem }) : t('liveMap.time_minutes', { minutes: mins });

              elems.push(
                <Polyline key={'route-' + d.id} positions={routePositions}
                  pathOptions={{ color: '#f97316', weight: 4, opacity: 0.8, dashArray: cached ? null : '10 7', lineCap: 'round', lineJoin: 'round' }}
                  eventHandlers={{
                    click: () => setRouteModal({
                      driverName: d.full_name,
                      recipientName: d.recipient_name,
                      recipientAddress: d.recipient_address,
                      orderNum: d.current_order,
                      status: d.status,
                      dist,
                      duration: mins,
                      isRoad: !!cached,
                    }),
                  }}>
                  <Tooltip sticky direction="top">
                    <div style={{ fontSize: '.75rem', fontWeight: 600, padding: '4px 2px' }}>
                      <div style={{ marginBottom: 4 }}>{d.full_name} → {d.recipient_name || t('liveMap.delivery_fallback')}</div>
                      <div style={{ display: 'flex', gap: 12, color: '#374151' }}>
                        <span>📍 {t('liveMap.distance_km', { distance: dist.toFixed(1) })}</span>
                        <span>⏱ ~{etaStr}</span>
                      </div>
                      <div style={{ fontSize: '.65rem', color: '#9ca3af', marginTop: 3 }}>{cached ? '🛣 ' + t('liveMap.road_route_info') : '→ ' + t('liveMap.straight_line_info')} · {t('liveMap.click_for_details')}</div>
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
                    <Popup><div style={{ fontSize: '.8rem', fontWeight: 600 }}>{t('liveMap.pickup_label')} &mdash; {d.current_order}</div></Popup>
                  </Marker>
                );
              }

              const cachedRoute = routeCache[d.id];
              const popupDist = cachedRoute ? cachedRoute.distance : dist;
              const destMins = cachedRoute ? Math.ceil(cachedRoute.duration) : Math.ceil((dist / 40) * 60);
              const destHrs  = Math.floor(destMins / 60);
              const destRem  = destMins % 60;
              const destEta  = destHrs > 0 ? t('liveMap.time_hours_minutes', { hours: destHrs, minutes: destRem }) : t('liveMap.time_minutes', { minutes: destMins });

              elems.push(
                <Marker key={'dest-' + d.id} position={delP} icon={deliveryIcon()}>
                  <Popup minWidth={260}>
                    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 12, overflow: 'hidden', margin: -1 }}>
                      {/* Header */}
                      <div style={{
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        padding: '12px 14px',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Package width={16} color="#fff" />
                        </div>
                        <div>
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t("liveMap.delivery_destination")}</div>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{d.recipient_name || '—'}</div>
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {d.recipient_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Phone width={12} color="#64748b" />
                            </div>
                            <span style={{ fontWeight: 500 }}>{d.recipient_phone}</span>
                          </div>
                        )}
                        {d.recipient_address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: '#374151' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <MapPin width={12} color="#d97706" />
                            </div>
                            <span style={{ color: '#475569', lineHeight: 1.45 }}>{d.recipient_address}</span>
                          </div>
                        )}

                        {/* Distance + ETA row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
                          <div style={{ background: '#fff7ed', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#ea580c' }}>{popupDist.toFixed(1)}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '.04em' }}>{cachedRoute ? t('liveMap.km_road') : t('liveMap.km_away')}</div>
                          </div>
                          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a' }}>{destEta}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('liveMap.est_eta')}</div>
                          </div>
                        </div>

                        {/* Driver + Order */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: (STATUS_COLOR[d.status] || '#94a3b8') + '25',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Truck width={11} color={STATUS_COLOR[d.status] || '#94a3b8'} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{d.full_name}</span>
                          </div>
                          {d.current_order && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6,
                              background: '#fff7ed', border: '1px solid #fed7aa',
                              fontSize: 11, fontWeight: 700, color: '#ea580c',
                            }}>{d.current_order}</span>
                          )}
                        </div>
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
                            <div style={{ fontSize: '.68rem', opacity: 0.85 }}>{d.vehicle_type?.replace('_', ' ') || t('liveMap.driver_type_fallback')}</div>
                          </div>
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '.66rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)' }}>
                          {t('liveMap.status_' + d.status)}
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
                              {dist != null && <span style={{ [isRTL?'marginRight':'marginLeft']: 'auto', fontSize: '.7rem', color: '#6b7280' }}>{t('liveMap.distance_km', { distance: dist.toFixed(1) })}</span>}
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                          {d.speed != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '.74rem' }}>
                              <Clock width={12} /> {t('liveMap.speed_kmh', { speed: parseFloat(d.speed).toFixed(0) })}
                            </div>
                          )}
                          {eta != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f97316', fontSize: '.74rem', fontWeight: 600 }}>
                              <Clock width={12} /> {t('liveMap.eta_minutes_display', { minutes: eta })}
                            </div>
                          )}
                        </div>
                        {d.last_ping && (
                          <div style={{ color: '#9ca3af', fontSize: '.7rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Gps width={11} /> {timeAgo(d.last_ping, t)}
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
            position: 'absolute', bottom: 12, [isRTL?'right':'left']: 12, zIndex: 999,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            borderRadius: 8, padding: '8px 12px', fontSize: '.68rem',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', display: 'flex', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> {t('liveMap.status_available')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> {t('liveMap.status_busy')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} /> {t('liveMap.status_returning')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 20, height: 0, borderTop: '2px dashed #f97316' }} /> {t('liveMap.legend_route')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 14, borderRadius: '50% 50% 50% 0', background: '#ef4444', border: '1px solid #fff', transform: 'rotate(-45deg)', display: 'inline-block' }} /> {t('liveMap.legend_delivery')}
            </span>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lm-sidebar" style={{ height: fullscreen ? '100vh' : undefined }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <Search width={14} color="var(--text-muted)" />
              <input type="text" placeholder={t("liveMap.search_placeholder")} value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '.8rem', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {t('liveMap.drivers_sidebar_title', { count: filtered.length })}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '.84rem' }}>{t("liveMap.no_drivers")}</div>
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
                    [isRTL?'borderRight':'borderLeft']: isSelected ? '3px solid ' + (STATUS_COLOR[d.status] || '#94a3b8') : '3px solid transparent',
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
                      {d.zone_name || t('liveMap.no_zone')}
                      {d.last_ping && (
                        <><span style={{ color: '#d1d5db' }}>&middot;</span><span>{timeAgo(d.last_ping, t)}</span></>
                      )}
                    </div>
                    {d.current_order && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: '.68rem' }}>
                        <Package width={11} color="#ea580c" />
                        <span style={{ fontWeight: 600, color: '#ea580c' }}>{d.current_order}</span>
                        {dist != null && <span style={{ color: '#6b7280', [isRTL?'marginRight':'marginLeft']: 4 }}>{t('liveMap.distance_km', { distance: dist.toFixed(1) })}</span>}
                        {eta != null && <span style={{ color: '#f97316', fontWeight: 600, [isRTL?'marginRight':'marginLeft']: 4 }}>{t('liveMap.eta_short_minutes', { minutes: eta })}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: isRTL ? 'left' : 'right' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px', borderRadius: 99, fontSize: '.65rem',
                      fontWeight: 700, background: (STATUS_COLOR[d.status] || '#94a3b8') + '20',
                      color: STATUS_COLOR[d.status] || '#94a3b8',
                    }}>
                      {t('liveMap.status_' + d.status)}
                    </span>
                    {d.speed != null && d.speed > 0 && (
                      <div style={{ fontSize: '.62rem', color: '#6b7280', marginTop: 2 }}>{t('liveMap.speed_kmh', { speed: parseFloat(d.speed).toFixed(0) })}</div>
                    )}
                    {!d.last_lat && <div style={{ fontSize: '.62rem', color: '#94a3b8', marginTop: 2 }}>{t("liveMap.no_gps")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <RouteInfoModal info={routeModal} onClose={() => setRouteModal(null)} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .lm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .lm-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .lm-map-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 12px;
        }
        .lm-map-panel {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          height: calc(100vh - 380px);
          min-height: 400px;
          position: relative;
        }
        .lm-sidebar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 380px);
          min-height: 400px;
        }
        .drv-stat-clickable { cursor: pointer; position: relative; }
        .drv-stat-clickable:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .drv-stat-active-pip {
          position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
          width: 20px; height: 3px; border-radius: 3px;
        }
        @media (max-width: 1100px) {
          .lm-map-layout {
            grid-template-columns: 1fr;
          }
          .lm-map-panel {
            height: 50vh;
            min-height: 350px;
          }
          .lm-sidebar {
            height: 380px;
            min-height: unset;
          }
        }
        @media (max-width: 768px) {
          .lm-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .lm-header-actions {
            width: 100%;
            overflow-x: auto;
          }
          .lm-map-panel {
            height: 45vh;
            min-height: 300px;
          }
          .lm-sidebar {
            height: 320px;
          }
        }
        @media (max-width: 480px) {
          .lm-map-panel {
            height: 40vh;
            min-height: 260px;
            border-radius: 8px;
          }
          .lm-sidebar {
            height: 300px;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
}
