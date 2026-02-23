import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ── Custom catchy marker icons ──────────────────────────────── */
const createSvgIcon = (color = '#f2421b', glyph = '📍', size = 40) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 12}" viewBox="0 0 ${size} ${size + 12}">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <path d="M${size / 2} ${size + 10} C${size / 2} ${size + 10} ${size - 2} ${size * 0.6} ${size - 2} ${size * 0.4}
        C${size - 2} ${size * 0.1} ${size * 0.78} 2 ${size / 2} 2
        C${size * 0.22} 2 2 ${size * 0.1} 2 ${size * 0.4}
        C2 ${size * 0.6} ${size / 2} ${size + 10} ${size / 2} ${size + 10} Z"
        fill="${color}" stroke="#fff" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="${size / 2}" cy="${size * 0.4}" r="${size * 0.22}" fill="white" opacity="0.9"/>
      <text x="${size / 2}" y="${size * 0.46}" font-size="${size * 0.28}" text-anchor="middle" dominant-baseline="middle">${glyph}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 5)],
    className: 'custom-map-marker',
  });
};

export const MARKER_ICONS = {
  delivery:  createSvgIcon('#f2421b', '📦', 42),
  pickup:    createSvgIcon('#244066', '🏠', 42),
  driver:    createSvgIcon('#22c55e', '🚚', 38),
  zone:      createSvgIcon('#3b82f6', '📍', 36),
  selected:  createSvgIcon('#f97316', '⭐', 44),
  order:     createSvgIcon('#8b5cf6', '📋', 38),
  warehouse: createSvgIcon('#0ea5e9', '🏭', 40),
  client:    createSvgIcon('#ec4899', '👤', 36),
};

/* ── Map click handler ───────────────────────────────────────── */
function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

/* ── Fly-to on coordinate change ─────────────────────────────── */
function FlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

/* ── Address search with Nominatim ───────────────────────────── */
function AddressSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q) => {
    if (!q || q.length < 3) { setResults([]); return; }
    setLoading(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=ae&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await r.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.display_name);
    setOpen(false);
    onSelect({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name,
    });
  };

  return (
    <div className="location-search-wrapper" ref={wrapperRef}>
      <div className="location-search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search address, area, building..."
          className="location-search-input"
        />
        {loading && <span className="location-search-spinner" />}
        {query && !loading && (
          <button className="location-search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="location-search-results">
          {results.map((item, i) => (
            <li key={i} onClick={() => handleSelect(item)} className="location-search-item">
              <span className="location-search-icon">📍</span>
              <div>
                <div className="location-search-name">{item.display_name.split(',').slice(0, 3).join(', ')}</div>
                <div className="location-search-detail">{item.display_name}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Reverse geocode ─────────────────────────────────────────── */
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await r.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/* ══════════════════════════════════════════════════════════════
   LocationPicker — interactive map with pin + address search
   Props:
     lat, lng         — current coordinates
     address          — current address string
     onChange({lat, lng, address}) — callback on change
     height           — map height (default 280)
     markerType       — key from MARKER_ICONS (default 'delivery')
     placeholder      — input placeholder
     readOnly         — disable interactions
   ══════════════════════════════════════════════════════════════ */
export default function LocationPicker({
  lat, lng, address = '',
  onChange, height = 280, markerType = 'delivery',
  placeholder, readOnly = false,
}) {
  // UAE center default
  const defaultCenter = [25.2048, 55.2708];
  const hasCoords = lat && lng && !isNaN(lat) && !isNaN(lng);
  const center = hasCoords ? [parseFloat(lat), parseFloat(lng)] : defaultCenter;
  const icon = MARKER_ICONS[markerType] || MARKER_ICONS.delivery;

  const handleMapClick = async (latlng) => {
    if (readOnly) return;
    const addr = await reverseGeocode(latlng.lat, latlng.lng);
    onChange?.({ lat: latlng.lat, lng: latlng.lng, address: addr });
  };

  const handleSearch = (result) => {
    onChange?.(result);
  };

  return (
    <div className="location-picker">
      {!readOnly && (
        <AddressSearch onSelect={handleSearch} />
      )}
      <div className="location-picker-map" style={{ height }}>
        <MapContainer
          center={center}
          zoom={hasCoords ? 15 : 10}
          style={{ height: '100%', width: '100%', borderRadius: 10, zIndex: 1 }}
          scrollWheelZoom={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {!readOnly && <ClickHandler onClick={handleMapClick} />}
          <FlyTo lat={hasCoords ? parseFloat(lat) : null} lng={hasCoords ? parseFloat(lng) : null} />
          {hasCoords && (
            <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={icon} />
          )}
        </MapContainer>
        {!hasCoords && !readOnly && (
          <div className="location-picker-hint">
            Click on the map or search to set location
          </div>
        )}
      </div>
      {hasCoords && (
        <div className="location-picker-coords">
          <span>📍 {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}</span>
          {!readOnly && (
            <button className="location-picker-clear" onClick={() => onChange?.({ lat: '', lng: '', address: '' })}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
