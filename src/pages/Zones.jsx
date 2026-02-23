import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, MapPin, EditPencil, Trash, Refresh,
  Search, Xmark, NavArrowLeft, Gps,
  DollarCircle, Clock, Weight, Truck
} from 'iconoir-react';
import {
  MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { MARKER_ICONS } from '../components/LocationPicker';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';
import './CRMPages.css';

const EMIRATES = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'];
const ZONE_COLORS = ['#3b82f6','#f97316','#22c55e','#8b5cf6','#ec4899','#14b8a6','#f43f5e','#eab308'];
const UAE_CENTER = [24.4539, 54.3773];
const EMPTY_FORM = {
  name:'', city:'', emirate:'Dubai', base_delivery_fee:'',
  extra_km_fee:'', max_weight_kg:'', estimated_minutes:'',
  is_active:true, color:'#3b82f6', notes:'',
  center_lat:null, center_lng:null, radius:5000,
};

/* ── Helpers ─────────────────────────────────────────────────── */
const pf = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const hasCoords = (lat, lng) => pf(lat) !== null && pf(lng) !== null;

/* ── Icons ───────────────────────────────────────────────────── */
const myLocIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.2)"></div>',
  iconSize:[16,16], iconAnchor:[8,8], className:'custom-map-marker',
});

/* ── Sub-components ──────────────────────────────────────────── */
function FlyTo({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], zoom || 13, { duration: 0.6 });
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}

function FitAllZones({ zones }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    if (!zones || zones.length === 0) return;
    const valid = zones.filter(z => hasCoords(z.center_lat, z.center_lng));
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid.map(z => {
      const r = pf(z.radius) || 5000;
      const lat = pf(z.center_lat);
      const lng = pf(z.center_lng);
      const latOff = r / 111320;
      const lngOff = r / (111320 * Math.cos(lat * Math.PI / 180));
      return [L.latLng(lat - latOff, lng - lngOff), L.latLng(lat + latOff, lng + lngOff)];
    }).flat());
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      fitted.current = true;
    }
  }, [zones, map]);
  return null;
}

/* ── Location search with Nominatim ──────────────────────────── */
function LocationSearch({ onSelect, initialQuery }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(initialQuery || ''); }, [initialQuery]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doSearch = useCallback((q) => {
    if (!q || q.length < 3) { setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ae&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await r.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  }, []);

  return (
    <div className="loc-search-wrap" ref={wrapRef}>
      <div className="loc-search-bar">
        <Search width={14} height={14} />
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search location, area, landmark..."
        />
        {loading && <span className="loc-search-spin" />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <Xmark width={14} height={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="loc-search-list">
          {results.map((item, i) => (
            <li key={i} onClick={() => {
              setQuery(item.display_name.split(',').slice(0, 2).join(', '));
              setOpen(false);
              onSelect({
                lat: parseFloat(item.lat), lng: parseFloat(item.lon),
                address: item.display_name,
                city: item.address?.city || item.address?.town || item.address?.village || '',
                emirate: item.address?.state || '',
              });
            }}>
              <MapPin width={14} height={14} style={{ flexShrink:0, marginTop:2 }} />
              <div>
                <div className="loc-name">{item.display_name.split(',').slice(0, 3).join(', ')}</div>
                <div className="loc-detail">{item.display_name}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function Zones() {
  const [zones, setZones]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const [activeZone, setActiveZone]   = useState(null);
  const [emirateFilter, setEmirateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm]               = useState(EMPTY_FORM);
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [myLocation, setMyLocation]   = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setMyLocation([p.coords.latitude, p.coords.longitude]),
        () => {}, { enableHighAccuracy: true, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const r = await api.get('/zones');
      if (r.success) setZones(r.data || []);
    } catch (e) { console.error('fetchZones error:', e); }
    finally { setLoading(false); }
  };

  /* ── Form validation ─────────────────────────────────────────── */
  const formCenterLat = pf(form.center_lat);
  const formCenterLng = pf(form.center_lng);
  const formHasCenter = formCenterLat !== null && formCenterLng !== null;
  const canSubmit = !!(form.name && form.emirate && formHasCenter);

  /* ── Submit zone ─────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) { setError('Enter a name and set the zone center on the map'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        emirate: form.emirate,
        city: form.city || null,
        color: form.color || '#3b82f6',
        notes: form.notes || null,
        is_active: form.is_active !== false,
        center_lat: formCenterLat,
        center_lng: formCenterLng,
        radius: pf(form.radius) || 5000,
        base_delivery_fee: pf(form.base_delivery_fee) || 0,
        extra_km_fee: pf(form.extra_km_fee) || 0,
        max_weight_kg: pf(form.max_weight_kg) || null,
        estimated_minutes: pf(form.estimated_minutes) || null,
        polygon: null,
      };
      console.log('Zone payload:', JSON.stringify(payload));
      const res = selected
        ? await api.put(`/zones/${selected.id}`, payload)
        : await api.post('/zones', payload);
      if (res.success) {
        closeForm();
        fetchZones();
      } else {
        setError(res.message || 'Failed to save zone');
      }
    } catch (err) {
      console.error('Zone save error:', err);
      setError('Network error — please try again');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone permanently?')) return;
    try {
      await api.delete(`/zones/${id}`);
      if (activeZone === id) setActiveZone(null);
      fetchZones();
    } catch (e) { console.error('Delete error:', e); }
  };

  /* Toggle active — only send is_active + required fields, NOT the full zone */
  const handleToggleActive = async (zone) => {
    try {
      await api.put(`/zones/${zone.id}`, {
        name: zone.name,
        emirate: zone.emirate,
        city: zone.city || null,
        color: zone.color || '#3b82f6',
        notes: zone.notes || null,
        is_active: zone.is_active ? false : true,
        center_lat: pf(zone.center_lat),
        center_lng: pf(zone.center_lng),
        radius: pf(zone.radius) || 5000,
        base_delivery_fee: pf(zone.base_delivery_fee) || 0,
        extra_km_fee: pf(zone.extra_km_fee) || 0,
        max_weight_kg: pf(zone.max_weight_kg) || null,
        estimated_minutes: pf(zone.estimated_minutes) || null,
        polygon: null,
      });
      fetchZones();
    } catch (e) { console.error('Toggle error:', e); }
  };

  const openEdit = (z) => {
    setSelected(z);
    setForm({
      name: z.name||'', city: z.city||'', emirate: z.emirate||'Dubai',
      base_delivery_fee: z.base_delivery_fee||'', extra_km_fee: z.extra_km_fee||'',
      max_weight_kg: z.max_weight_kg||'', estimated_minutes: z.estimated_minutes||'',
      is_active: z.is_active !== 0 && z.is_active !== false,
      color: z.color||'#3b82f6', notes: z.notes||'',
      center_lat: pf(z.center_lat), center_lng: pf(z.center_lng),
      radius: pf(z.radius) || 5000,
    });
    setError(''); setShowForm(true);
  };

  const openNew = () => { setForm({...EMPTY_FORM}); setSelected(null); setError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setSelected(null); setForm({...EMPTY_FORM}); setError(''); };

  const filtered = useMemo(() => zones.filter(z => {
    if (emirateFilter && z.emirate !== emirateFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return z.name?.toLowerCase().includes(q) || z.city?.toLowerCase().includes(q) || z.emirate?.toLowerCase().includes(q);
    }
    return true;
  }), [zones, emirateFilter, searchQuery]);

  const activeData = useMemo(() => activeZone ? zones.find(z => z.id === activeZone) : null, [zones, activeZone]);

  const flyTarget = useMemo(() => {
    if (activeData && hasCoords(activeData.center_lat, activeData.center_lng)) {
      const km = (pf(activeData.radius) || 5000) / 1000;
      const zoom = km > 20 ? 10 : km > 10 ? 11 : km > 5 ? 12 : km > 2 ? 13 : 14;
      return { lat: pf(activeData.center_lat), lng: pf(activeData.center_lng), zoom };
    }
    return null;
  }, [activeData]);

  const handleFormMapClick = async (latlng) => {
    setForm(f => ({ ...f, center_lat: latlng.lat, center_lng: latlng.lng }));
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const d = await r.json();
      if (d?.address) {
        const city = d.address.city || d.address.town || d.address.village || '';
        const emirate = d.address.state || '';
        setForm(f => ({
          ...f,
          city: city || f.city,
          emirate: EMIRATES.find(e => emirate.toLowerCase().includes(e.toLowerCase())) || f.emirate,
        }));
      }
    } catch {}
  };

  const handleLocationSelect = ({ lat, lng, city, emirate }) => {
    setForm(f => ({
      ...f,
      center_lat: lat,
      center_lng: lng,
      city: city || f.city,
      emirate: EMIRATES.find(e => (emirate||'').toLowerCase().includes(e.toLowerCase())) || f.emirate,
    }));
  };

  const fmtFee = v => { const n = pf(v); return n && n > 0 ? n.toFixed(0) : '0'; };

  /* ═══════════════════════════════════════════════════════════════
     CREATION / EDIT FORM
     ═══════════════════════════════════════════════════════════════ */
  if (showForm) {
    return (
      <div className="page-container">
        {/* Header */}
        <div className="zf-header">
          <button className="zf-back" onClick={closeForm}>
            <NavArrowLeft width={20} height={20} />
          </button>
          <div className="zf-header-text">
            <h2>{selected ? 'Edit Zone' : 'Create New Zone'}</h2>
            <p>Define zone boundaries and pricing on the map</p>
          </div>
          <div className="zf-header-actions">
            <button type="button" className="btn-outline-action" onClick={closeForm}>Discard</button>
            <button className="btn-primary-action" onClick={handleSubmit} disabled={saving || !canSubmit}
              title={!canSubmit ? 'Enter a name and click the map to set a location' : ''}>
              {saving ? 'Saving...' : selected ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="zf-layout">
          {/* ── LEFT: Map ── */}
          <div className="zf-map-col">
            <div className="zf-map-search">
              <LocationSearch
                onSelect={handleLocationSelect}
                initialQuery={selected?.name || ''}
              />
            </div>
            <div className="zf-map-wrap">
              <MapContainer
                center={formHasCenter ? [formCenterLat, formCenterLng] : (myLocation || UAE_CENTER)}
                zoom={formHasCenter ? 13 : 10}
                style={{ height:'100%', width:'100%', zIndex:1 }}
                scrollWheelZoom={true} attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickHandler onClick={handleFormMapClick} />
                {formHasCenter && <FlyTo lat={formCenterLat} lng={formCenterLng} zoom={13} />}

                {formHasCenter && (
                  <>
                    <Circle
                      center={[formCenterLat, formCenterLng]}
                      radius={pf(form.radius) || 5000}
                      pathOptions={{ color:form.color, fillColor:form.color, fillOpacity:0.18, weight:2.5, dashArray:'6 4' }}
                    />
                    <Marker position={[formCenterLat, formCenterLng]} icon={MARKER_ICONS.zone}>
                      <Popup><strong>{form.name || 'Zone Center'}</strong></Popup>
                    </Marker>
                  </>
                )}

                {/* Other zones faintly */}
                {zones.filter(z => !selected || z.id !== selected.id).map((z, i) => {
                  if (!hasCoords(z.center_lat, z.center_lng)) return null;
                  return (
                    <Circle key={z.id}
                      center={[pf(z.center_lat), pf(z.center_lng)]}
                      radius={pf(z.radius) || 5000}
                      pathOptions={{ color: z.color||ZONE_COLORS[i%8], fillColor: z.color||ZONE_COLORS[i%8], fillOpacity:0.08, weight:1.5, opacity:0.35 }}
                    />
                  );
                })}
                {myLocation && <Marker position={myLocation} icon={myLocIcon}><Popup><strong>You</strong></Popup></Marker>}
              </MapContainer>

              {!formHasCenter && (
                <div className="zf-map-hint">
                  <Gps width={18} height={18} />
                  <span>Search a location above or click the map</span>
                </div>
              )}
            </div>

            {/* Radius bar under map */}
            <div className="zf-radius-bar">
              <label>Radius</label>
              <input type="range" min="500" max="50000" step="500"
                value={pf(form.radius) || 5000}
                onChange={e => setForm(f => ({ ...f, radius: parseInt(e.target.value) }))}
                className="radius-slider" />
              <span className="zf-radius-val">{((pf(form.radius) || 5000) / 1000).toFixed(1)} km</span>
            </div>
          </div>

          {/* ── RIGHT: Compact Form ── */}
          <div className="zf-form-col">
            {/* Zone name + color */}
            <div className="zf-card">
              <div className="zf-card-label">Zone Name *</div>
              <input required type="text" value={form.name} className="zf-input-lg"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Downtown Dubai" />
              <div className="zf-color-row">
                {ZONE_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`zf-color-dot ${form.color === c ? 'selected' : ''}`}
                    style={{ '--dot-color': c }} />
                ))}
              </div>
            </div>

            {/* Location info */}
            <div className="zf-card">
              <div className="zf-row">
                <div className="zf-field">
                  <div className="zf-card-label">City</div>
                  <input type="text" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Auto-detected" />
                </div>
                <div className="zf-field">
                  <div className="zf-card-label">Emirate *</div>
                  <select value={form.emirate} onChange={e => setForm(f => ({ ...f, emirate: e.target.value }))}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
              </div>
              {formHasCenter ? (
                <div className="zf-coords">
                  <MapPin width={13} height={13} />
                  <span>{formCenterLat.toFixed(5)}, {formCenterLng.toFixed(5)}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, center_lat:null, center_lng:null }))}>Clear</button>
                </div>
              ) : (
                <div className="zf-coords" style={{ background:'#fef3c7', borderColor:'#fbbf24' }}>
                  <Gps width={13} height={13} style={{ color:'#d97706' }} />
                  <span style={{ color:'#92400e' }}>No location set — click map or search above</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="zf-card">
              <div className="zf-card-title">
                <DollarCircle width={15} height={15} /> Pricing
              </div>
              <div className="zf-row">
                <div className="zf-field">
                  <div className="zf-card-label">Base Fee (AED)</div>
                  <input type="number" min="0" step="0.01" value={form.base_delivery_fee}
                    onChange={e => setForm(f => ({ ...f, base_delivery_fee: e.target.value }))} placeholder="25" />
                </div>
                <div className="zf-field">
                  <div className="zf-card-label">Per km (AED)</div>
                  <input type="number" min="0" step="0.01" value={form.extra_km_fee}
                    onChange={e => setForm(f => ({ ...f, extra_km_fee: e.target.value }))} placeholder="2.5" />
                </div>
              </div>
              <div className="zf-row">
                <div className="zf-field">
                  <div className="zf-card-label">Max Weight (kg)</div>
                  <input type="number" min="0" step="0.1" value={form.max_weight_kg}
                    onChange={e => setForm(f => ({ ...f, max_weight_kg: e.target.value }))} placeholder="50" />
                </div>
                <div className="zf-field">
                  <div className="zf-card-label">Est. Minutes</div>
                  <input type="number" min="0" value={form.estimated_minutes}
                    onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))} placeholder="45" />
                </div>
              </div>
            </div>

            {/* Status + Notes */}
            <div className="zf-card">
              <div className="zf-status-row">
                <button type="button" className={`toggle-switch ${form.is_active ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                  <span className="toggle-knob" />
                </button>
                <span style={{ fontWeight:600, fontSize:'0.88rem', color: form.is_active ? '#16a34a' : '#94a3b8' }}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <textarea rows={2} value={form.notes} className="zf-notes"
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     MAIN LIST VIEW
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Delivery Zones</h2>
          <p className="page-subheading">{zones.length} zone{zones.length !== 1 ? 's' : ''} configured</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-outline-action" onClick={fetchZones}><Refresh width={15} height={15} /> Refresh</button>
          <button className="btn-primary-action" onClick={openNew}><Plus width={16} height={16} /> Add Zone</button>
        </div>
      </div>

      {/* Filters */}
      <div className="zl-filters">
        <div className="search-box" style={{ maxWidth:220 }}>
          <Search width={14} height={14} className="search-icon" />
          <input type="text" placeholder="Search zones..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="search-input" />
        </div>
        <div className="zl-chips">
          <button onClick={() => setEmirateFilter('')}
            className={`summary-chip ${!emirateFilter ? 'active' : ''}`}
            style={{ '--chip-color':'#244066', '--chip-bg':'#eff6ff' }}>All ({zones.length})</button>
          {EMIRATES.map(em => {
            const cnt = zones.filter(z => z.emirate === em).length;
            if (!cnt) return null;
            return (
              <button key={em} onClick={() => setEmirateFilter(emirateFilter === em ? '' : em)}
                className={`summary-chip ${emirateFilter === em ? 'active' : ''}`}
                style={{ '--chip-color':'#244066', '--chip-bg':'#eff6ff' }}>{em} ({cnt})</button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading-rows">{[1,2,3].map(i => <div key={i} className="skeleton-card" style={{ height:100 }} />)}</div>
      ) : (
        <div className="zones-layout">
          {/* LEFT: Zone cards */}
          <div className="zones-list-panel">
            {filtered.length === 0 ? (
              <div className="zl-empty">
                <MapPin width={36} height={36} />
                <p>No zones found</p>
                <button className="btn-primary-action" onClick={openNew}><Plus width={15} height={15} /> Add Zone</button>
              </div>
            ) : filtered.map((zone, i) => {
              const c = zone.color || ZONE_COLORS[i % 8];
              const isActive = activeZone === zone.id;
              const hasLoc = hasCoords(zone.center_lat, zone.center_lng);
              return (
                <div key={zone.id} className={`zl-card ${isActive ? 'active' : ''} ${!zone.is_active ? 'dim' : ''}`}
                  onClick={() => hasLoc && setActiveZone(isActive ? null : zone.id)}>
                  <div className="zl-card-accent" style={{ background: c }} />
                  <div className="zl-card-body">
                    <div className="zl-card-top">
                      <div>
                        <div className="zl-card-name">{zone.name}</div>
                        <div className="zl-card-sub">
                          {zone.city ? `${zone.city}, ` : ''}{zone.emirate}
                          {zone.radius ? ` \u00b7 ${(pf(zone.radius)/1000).toFixed(1)} km` : ''}
                        </div>
                        {!hasLoc && (
                          <div style={{ fontSize:'0.7rem', color:'#d97706', fontWeight:600, marginTop:2 }}>
                            \u26a0 No location — edit to set coordinates
                          </div>
                        )}
                      </div>
                      <div className="zl-card-right" onClick={e => e.stopPropagation()}>
                        <button className={`toggle-switch sm ${zone.is_active ? 'active' : ''}`}
                          onClick={() => handleToggleActive(zone)}>
                          <span className="toggle-knob" />
                        </button>
                      </div>
                    </div>
                    <div className="zl-card-stats">
                      <div className="zl-stat">
                        <DollarCircle width={12} height={12} />
                        <span>AED {fmtFee(zone.base_delivery_fee)}</span>
                      </div>
                      <div className="zl-stat">
                        <Truck width={12} height={12} />
                        <span>{zone.driver_count || 0} driver{(zone.driver_count||0) !== 1 ? 's':''}</span>
                      </div>
                      {pf(zone.extra_km_fee) > 0 && (
                        <div className="zl-stat">
                          <MapPin width={12} height={12} />
                          <span>+{fmtFee(zone.extra_km_fee)}/km</span>
                        </div>
                      )}
                    </div>
                    <div className="zl-card-actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(zone)}>
                        <EditPencil width={12} height={12} /> Edit
                      </button>
                      <button className="danger" onClick={() => handleDelete(zone.id)}>
                        <Trash width={12} height={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Map */}
          <div className="zones-map-panel">
            <MapContainer center={myLocation || UAE_CENTER} zoom={9}
              style={{ height:'100%', width:'100%', zIndex:1 }}
              scrollWheelZoom={true} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}
              <FitAllZones zones={zones} />

              {zones.map((z, i) => {
                if (!hasCoords(z.center_lat, z.center_lng)) return null;
                const lat = pf(z.center_lat);
                const lng = pf(z.center_lng);
                const rad = pf(z.radius) || 5000;
                const col = z.color || ZONE_COLORS[i % 8];
                const act = activeZone === z.id;
                return (
                  <Circle key={`circle-${z.id}`}
                    center={[lat, lng]}
                    radius={rad}
                    pathOptions={{
                      color: col, fillColor: col,
                      fillOpacity: act ? 0.3 : 0.18,
                      weight: act ? 3.5 : 2,
                      opacity: act ? 1 : 0.8,
                    }}
                    eventHandlers={{ click: () => setActiveZone(z.id) }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{z.name}</strong>
                        <div className="popup-detail">{z.emirate} &bull; AED {fmtFee(z.base_delivery_fee)} &bull; {(rad/1000).toFixed(1)} km</div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {zones.map(z => {
                if (!hasCoords(z.center_lat, z.center_lng)) return null;
                return (
                  <Marker key={`marker-${z.id}`}
                    position={[pf(z.center_lat), pf(z.center_lng)]}
                    icon={MARKER_ICONS.zone}
                    eventHandlers={{ click: () => setActiveZone(z.id) }}>
                    <Popup>
                      <div className="map-popup">
                        <strong>{z.name}</strong>
                        <div className="popup-detail">{z.emirate}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {myLocation && <Marker position={myLocation} icon={myLocIcon}><Popup><strong>Your Location</strong></Popup></Marker>}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
