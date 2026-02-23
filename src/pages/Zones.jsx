import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, MapPin, EditPencil, Trash, Refresh,
  Search, Xmark, Eye, NavArrowLeft
} from 'iconoir-react';
import {
  MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { MARKER_ICONS } from '../components/LocationPicker';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './CRMPages.css';

/* ─── Constants ──────────────────────────────────────────────── */
const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const ZONE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#eab308'];
const UAE_CENTER = [24.4539, 54.3773];

const EMPTY_FORM = {
  name: '', city: '', emirate: 'Dubai', base_delivery_fee: '',
  extra_km_fee: '', max_weight_kg: '', estimated_minutes: '',
  is_active: true, color: '#3b82f6', notes: '',
  center_lat: '', center_lng: '', radius: 5000,
};

/* ── My-location marker ──────────────────────────────────────── */
const myLocIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,0.35),0 2px 8px rgba(0,0,0,0.2)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: 'custom-map-marker',
});

/* ── Fly-to helper ───────────────────────────────────────────── */
function FlyTo({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], zoom || 13, { duration: 0.7 });
  }, [lat, lng, zoom, map]);
  return null;
}

/* ── Click handler for form map ──────────────────────────────── */
function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

/* ── Interactive radius handle ────────────────────────────────── */
function RadiusDragger({ center, radius, onChange, color }) {
  const map = useMap();
  const markerRef = useRef(null);

  // place handle at the east edge of the circle
  const handlePos = useMemo(() => {
    if (!center) return null;
    const point = map.latLngToLayerPoint(center);
    const zoom = map.getZoom();
    const metersPerPx = 40075016.686 * Math.cos(center[0] * Math.PI / 180) / Math.pow(2, zoom + 8);
    const radiusPx = radius / metersPerPx;
    const east = map.layerPointToLatLng([point.x + radiusPx, point.y]);
    return east;
  }, [center, radius, map]);

  if (!handlePos) return null;

  const handleIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:ew-resize"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: 'custom-map-marker',
  });

  return (
    <Marker
      ref={markerRef}
      position={handlePos}
      icon={handleIcon}
      draggable
      eventHandlers={{
        drag: (e) => {
          const ll = e.target.getLatLng();
          const dist = map.distance(center, [ll.lat, ll.lng]);
          onChange(Math.max(500, Math.round(dist)));
        },
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   Zones Page
   ══════════════════════════════════════════════════════════════ */
export default function Zones() {
  const [zones, setZones]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);   // form panel open
  const [selected, setSelected]       = useState(null);    // editing this zone
  const [activeZone, setActiveZone]   = useState(null);    // highlighted zone id
  const [emirateFilter, setEmirateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm]               = useState(EMPTY_FORM);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [myLocation, setMyLocation]   = useState(null);

  /* ── Get current location ── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/zones');
      if (res.success) setZones(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ── Form submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.center_lat || !form.center_lng) {
      setError('Please set the zone center by clicking on the map');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        radius: form.radius || 5000,
        polygon: null, // we use circle instead
      };
      const res = selected
        ? await api.put(`/zones/${selected.id}`, payload)
        : await api.post('/zones', payload);
      if (res.success) {
        setShowForm(false);
        setSelected(null);
        setForm(EMPTY_FORM);
        fetchZones();
      } else {
        setError(res.message || 'Failed to save');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone?')) return;
    await api.delete(`/zones/${id}`);
    if (activeZone === id) setActiveZone(null);
    fetchZones();
  };

  const handleToggleActive = async (zone) => {
    try {
      await api.put(`/zones/${zone.id}`, { ...zone, is_active: !zone.is_active });
      fetchZones();
    } catch (e) { console.error(e); }
  };

  const openEdit = (z) => {
    setSelected(z);
    setForm({
      name: z.name || '',
      city: z.city || '',
      emirate: z.emirate || 'Dubai',
      base_delivery_fee: z.base_delivery_fee || '',
      extra_km_fee: z.extra_km_fee || '',
      max_weight_kg: z.max_weight_kg || '',
      estimated_minutes: z.estimated_minutes || '',
      is_active: z.is_active !== false,
      color: z.color || '#3b82f6',
      notes: z.notes || '',
      center_lat: z.center_lat || '',
      center_lng: z.center_lng || '',
      radius: z.radius || 5000,
    });
    setError('');
    setShowForm(true);
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelected(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return zones.filter(z => {
      if (emirateFilter && z.emirate !== emirateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (z.name?.toLowerCase().includes(q) || z.city?.toLowerCase().includes(q) || z.emirate?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [zones, emirateFilter, searchQuery]);

  /* ── Active zone data for map ── */
  const activeData = useMemo(() => {
    if (!activeZone) return null;
    return zones.find(z => z.id === activeZone);
  }, [zones, activeZone]);

  /* ── Map center for fly-to ── */
  const flyTarget = useMemo(() => {
    if (activeData?.center_lat && activeData?.center_lng) {
      const radiusKm = (activeData.radius || 5000) / 1000;
      let zoom = 13;
      if (radiusKm > 20) zoom = 10;
      else if (radiusKm > 10) zoom = 11;
      else if (radiusKm > 5) zoom = 12;
      else if (radiusKm > 2) zoom = 13;
      else zoom = 14;
      return { lat: parseFloat(activeData.center_lat), lng: parseFloat(activeData.center_lng), zoom };
    }
    return null;
  }, [activeData]);

  /* ── Form map click ── */
  const handleFormMapClick = (latlng) => {
    setForm(f => ({
      ...f,
      center_lat: latlng.lat,
      center_lng: latlng.lng,
    }));
  };

  const formHasCenter = form.center_lat && form.center_lng && !isNaN(form.center_lat) && !isNaN(form.center_lng);

  /* ── Reverse geocode ── */
  const reverseGeo = async (lat, lng) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await r.json();
      return data;
    } catch { return null; }
  };

  const handleFormMapClickWithGeo = async (latlng) => {
    handleFormMapClick(latlng);
    const data = await reverseGeo(latlng.lat, latlng.lng);
    if (data?.address) {
      setForm(f => ({
        ...f,
        city: data.address.city || data.address.town || data.address.village || f.city,
      }));
    }
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  /* ── Form Panel (two-column) ── */
  if (showForm) {
    return (
      <div className="page-container">
        <div className="page-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-outline-action" onClick={closeForm} style={{ padding: '8px 10px' }}>
              <NavArrowLeft width={18} height={18} />
            </button>
            <div>
              <h2 className="page-heading">{selected ? `Edit Zone \u2014 ${selected.name}` : 'New Zone'}</h2>
              <p className="page-subheading">Set zone details and draw coverage area on map</p>
            </div>
          </div>
        </div>

        <div className="zone-form-layout">
          {/* LEFT — form */}
          <div className="zone-form-panel">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
              )}

              <div className="form-section-title">Zone Information</div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Zone Name *</label>
                  <input required type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Downtown Dubai" />
                </div>
                <div className="form-field">
                  <label>City</label>
                  <input type="text" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Auto-filled from map" />
                </div>
                <div className="form-field">
                  <label>Emirate *</label>
                  <select required value={form.emirate}
                    onChange={e => setForm(f => ({ ...f, emirate: e.target.value }))}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Zone Color</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 4 }}>
                    {ZONE_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c,
                          border: form.color === c ? '3px solid #244066' : '2px solid #e2e8f0',
                          cursor: 'pointer', transition: 'transform 0.15s',
                          transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-section-title" style={{ marginTop: '1rem' }}>Pricing & Limits</div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Base Fee (AED)</label>
                  <input type="number" min="0" step="0.01" value={form.base_delivery_fee}
                    onChange={e => setForm(f => ({ ...f, base_delivery_fee: e.target.value }))}
                    placeholder="25.00" />
                </div>
                <div className="form-field">
                  <label>Extra Fee/km (AED)</label>
                  <input type="number" min="0" step="0.01" value={form.extra_km_fee}
                    onChange={e => setForm(f => ({ ...f, extra_km_fee: e.target.value }))}
                    placeholder="2.50" />
                </div>
                <div className="form-field">
                  <label>Max Weight (kg)</label>
                  <input type="number" min="0" step="0.1" value={form.max_weight_kg}
                    onChange={e => setForm(f => ({ ...f, max_weight_kg: e.target.value }))}
                    placeholder="50" />
                </div>
                <div className="form-field">
                  <label>Est. Minutes</label>
                  <input type="number" min="0" value={form.estimated_minutes}
                    onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                    placeholder="45" />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                <button type="button" className={`toggle-switch ${form.is_active ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                  <span className="toggle-knob" />
                </button>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: form.is_active ? '#16a34a' : '#94a3b8' }}>
                  {form.is_active ? 'Active Zone' : 'Inactive Zone'}
                </span>
              </div>

              {/* Radius slider */}
              <div className="form-section-title" style={{ marginTop: '0.5rem' }}>
                Coverage Radius
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--gray-500)', marginLeft: 8 }}>
                  {(form.radius / 1000).toFixed(1)} km
                </span>
              </div>
              <input type="range" min="500" max="50000" step="500" value={form.radius}
                onChange={e => setForm(f => ({ ...f, radius: parseInt(e.target.value) }))}
                className="radius-slider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                <span>0.5 km</span><span>50 km</span>
              </div>

              {/* Coordinates display */}
              {formHasCenter && (
                <div className="location-picker-coords" style={{ marginTop: 12 }}>
                  <span>\uD83D\uDCCD {parseFloat(form.center_lat).toFixed(6)}, {parseFloat(form.center_lng).toFixed(6)}</span>
                  <button type="button" className="location-picker-clear"
                    onClick={() => setForm(f => ({ ...f, center_lat: '', center_lng: '' }))}>Clear</button>
                </div>
              )}

              <div className="form-field span-2" style={{ marginTop: 12 }}>
                <label>Notes</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes about this zone..." />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-outline-action" onClick={closeForm} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Saving...' : selected ? 'Update Zone' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT — map preview */}
          <div className="zone-form-map-panel">
            <MapContainer
              center={formHasCenter ? [parseFloat(form.center_lat), parseFloat(form.center_lng)] : (myLocation || UAE_CENTER)}
              zoom={formHasCenter ? 12 : 10}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickHandler onClick={handleFormMapClickWithGeo} />
              {formHasCenter && (
                <FlyTo lat={parseFloat(form.center_lat)} lng={parseFloat(form.center_lng)} zoom={null} />
              )}

              {/* Circle preview */}
              {formHasCenter && (
                <>
                  <Circle
                    center={[parseFloat(form.center_lat), parseFloat(form.center_lng)]}
                    radius={form.radius || 5000}
                    pathOptions={{
                      color: form.color, fillColor: form.color,
                      fillOpacity: 0.15, weight: 2.5, dashArray: '8 4',
                    }}
                  />
                  <Marker
                    position={[parseFloat(form.center_lat), parseFloat(form.center_lng)]}
                    icon={MARKER_ICONS.zone}
                  >
                    <Popup><strong>{form.name || 'New Zone'}</strong></Popup>
                  </Marker>
                  <RadiusDragger
                    center={[parseFloat(form.center_lat), parseFloat(form.center_lng)]}
                    radius={form.radius || 5000}
                    onChange={(r) => setForm(f => ({ ...f, radius: r }))}
                    color={form.color}
                  />
                </>
              )}

              {/* Show other zones faintly */}
              {zones.filter(z => !selected || z.id !== selected.id).map((z, i) => {
                if (z.center_lat && z.center_lng) {
                  return (
                    <Circle key={z.id}
                      center={[parseFloat(z.center_lat), parseFloat(z.center_lng)]}
                      radius={z.radius || 5000}
                      pathOptions={{
                        color: z.color || ZONE_COLORS[i % ZONE_COLORS.length],
                        fillColor: z.color || ZONE_COLORS[i % ZONE_COLORS.length],
                        fillOpacity: 0.06, weight: 1, opacity: 0.3,
                      }}
                    />
                  );
                }
                return null;
              })}

              {myLocation && (
                <Marker position={myLocation} icon={myLocIcon}>
                  <Popup><strong>Your Location</strong></Popup>
                </Marker>
              )}
            </MapContainer>
            {!formHasCenter && (
              <div className="location-picker-hint">
                Click on the map to set zone center
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main list + map view ── */
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Delivery Zones</h2>
          <p className="page-subheading">{zones.length} zones configured</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline-action" onClick={fetchZones}>
            <Refresh width={15} height={15} /> Refresh
          </button>
          <button className="btn-primary-action" onClick={openNew}>
            <Plus width={16} height={16} /> Add Zone
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ maxWidth: 220 }}>
          <Search width={14} height={14} className="search-icon" />
          <input type="text" placeholder="Search zones..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="search-input" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setEmirateFilter('')}
            className={`summary-chip ${!emirateFilter ? 'active' : ''}`}
            style={{ '--chip-color': '#244066', '--chip-bg': '#eff6ff' }}>
            All ({zones.length})
          </button>
          {EMIRATES.map(em => {
            const cnt = zones.filter(z => z.emirate === em).length;
            if (cnt === 0) return null;
            return (
              <button key={em} onClick={() => setEmirateFilter(emirateFilter === em ? '' : em)}
                className={`summary-chip ${emirateFilter === em ? 'active' : ''}`}
                style={{ '--chip-color': '#244066', '--chip-bg': '#eff6ff' }}>
                {em} ({cnt})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading-rows">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" style={{ height: 120 }} />)}
        </div>
      ) : (
        <div className="zones-layout">
          {/* LEFT — zone cards */}
          <div className="zones-list-panel">
            {filtered.length === 0 ? (
              <div className="empty-state-mini" style={{ padding: '2rem 0' }}>
                <MapPin width={40} height={40} />
                <p style={{ fontWeight: 600, marginTop: 8 }}>No zones found</p>
                <button className="btn-primary-action" onClick={openNew} style={{ marginTop: 8 }}>
                  <Plus width={16} height={16} /> Add Zone
                </button>
              </div>
            ) : (
              filtered.map((zone, i) => {
                const zoneColor = zone.color || ZONE_COLORS[i % ZONE_COLORS.length];
                return (
                  <div key={zone.id}
                    className={`zone-card ${activeZone === zone.id ? 'active' : ''}`}
                    onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}>
                    <div className="zone-card-header">
                      <div>
                        <div className="zone-card-name">
                          <span style={{
                            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                            background: zoneColor, marginRight: 8, verticalAlign: 'middle'
                          }} />
                          {zone.name}
                        </div>
                        <div className="zone-card-sub">
                          {zone.city ? `${zone.city}, ` : ''}{zone.emirate}
                          {zone.radius ? ` \u00B7 ${(zone.radius / 1000).toFixed(1)}km` : ''}
                        </div>
                      </div>
                      {/* Active toggle */}
                      <div onClick={e => e.stopPropagation()}>
                        <button
                          className={`toggle-switch ${zone.is_active ? 'active' : ''}`}
                          onClick={() => handleToggleActive(zone)}
                          title={zone.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className="toggle-knob" />
                        </button>
                      </div>
                    </div>
                    <div className="zone-stats">
                      <div className="zone-stat">
                        <div className="zone-stat-label">Base Fee</div>
                        <div className="zone-stat-value">AED {zone.base_delivery_fee || 0}</div>
                      </div>
                      <div className="zone-stat">
                        <div className="zone-stat-label">Extra/km</div>
                        <div className="zone-stat-value">{zone.extra_km_fee ? `AED ${zone.extra_km_fee}` : '\u2014'}</div>
                      </div>
                      <div className="zone-stat">
                        <div className="zone-stat-label">Max Weight</div>
                        <div className="zone-stat-value">{zone.max_weight_kg ? `${zone.max_weight_kg} kg` : '\u2014'}</div>
                      </div>
                      <div className="zone-stat">
                        <div className="zone-stat-label">Drivers</div>
                        <div className="zone-stat-value">{zone.driver_count || 0}</div>
                      </div>
                    </div>
                    <div className="zone-card-actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setActiveZone(zone.id); }}>
                        <Eye width={13} height={13} /> View
                      </button>
                      <button onClick={() => openEdit(zone)}>
                        <EditPencil width={13} height={13} /> Edit
                      </button>
                      <button className="danger" onClick={() => handleDelete(zone.id)}>
                        <Trash width={13} height={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT — map */}
          <div className="zones-map-panel">
            <MapContainer
              center={myLocation || UAE_CENTER}
              zoom={9}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />

              {/* Fly to selected zone */}
              {flyTarget && (
                <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />
              )}

              {/* All zone circles */}
              {zones.map((z, i) => {
                if (!z.center_lat || !z.center_lng) return null;
                const zoneColor = z.color || ZONE_COLORS[i % ZONE_COLORS.length];
                const isActive = activeZone === z.id;
                return (
                  <Circle key={z.id}
                    center={[parseFloat(z.center_lat), parseFloat(z.center_lng)]}
                    radius={z.radius || 5000}
                    pathOptions={{
                      color: zoneColor,
                      fillColor: zoneColor,
                      fillOpacity: isActive ? 0.25 : 0.10,
                      weight: isActive ? 3.5 : 1.5,
                      opacity: isActive ? 1 : 0.5,
                    }}
                    eventHandlers={{ click: () => setActiveZone(z.id) }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{z.name}</strong>
                        <div className="popup-detail">
                          {z.emirate} &bull; AED {z.base_delivery_fee || 0}
                          {z.radius ? ` &bull; ${(z.radius / 1000).toFixed(1)}km` : ''}
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Zone center markers */}
              {zones.map((z, i) => {
                if (!z.center_lat || !z.center_lng) return null;
                return (
                  <Marker key={`m-${z.id}`}
                    position={[parseFloat(z.center_lat), parseFloat(z.center_lng)]}
                    icon={MARKER_ICONS.zone}
                    eventHandlers={{ click: () => setActiveZone(z.id) }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{z.name}</strong>
                        <div className="popup-detail">{z.emirate}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* My location marker */}
              {myLocation && (
                <Marker position={myLocation} icon={myLocIcon}>
                  <Popup><strong>Your Location</strong></Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
