import { useState, useEffect, useMemo } from 'react';
import {
  Plus, MapPin, EditPencil, Trash, Refresh,
  Search, Xmark, Eye
} from 'iconoir-react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MARKER_ICONS } from '../components/LocationPicker';
import LocationPicker from '../components/LocationPicker';
import api from '../lib/api';
import 'leaflet/dist/leaflet.css';
import './CRMPages.css';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const ZONE_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#eab308'];

function FitBounds({ zones, activeId }) {
  const map = useMap();
  useEffect(() => {
    if (activeId) {
      const z = zones.find(z => z.id === activeId);
      if (z && z.polygon) {
        try {
          const coords = typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon;
          if (coords.length > 0) {
            map.fitBounds(L.latLngBounds(coords).pad(0.2), { duration: 0.6 });
            return;
          }
        } catch (e) {}
      }
    }
    const allCoords = [];
    zones.forEach(z => {
      if (z.polygon) {
        try {
          const coords = typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon;
          coords.forEach(c => allCoords.push(c));
        } catch (e) {}
      }
    });
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords).pad(0.15), { duration: 0.6 });
    }
  }, [zones, activeId, map]);
  return null;
}

function getCentroid(polygon) {
  if (!polygon || polygon.length === 0) return null;
  const coords = typeof polygon === 'string' ? JSON.parse(polygon) : polygon;
  if (!coords.length) return null;
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const [emirateFilter, setEmirateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    name: '', city: '', emirate: 'Dubai', base_delivery_fee: '',
    extra_km_fee: '', max_weight_kg: '', estimated_minutes: '',
    is_active: true, color: '#3b82f6', polygon: [], center_lat: '', center_lng: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/zones');
      if (res.success) setZones(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = selected
      ? await api.put(`/zones/${selected.id}`, form)
      : await api.post('/zones', form);
    if (res.success) {
      setShowForm(false); setSelected(null); resetForm(); fetchZones();
    } else {
      setError(res.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone?')) return;
    await api.delete(`/zones/${id}`);
    if (activeZone === id) setActiveZone(null);
    fetchZones();
  };

  const resetForm = () => setForm({
    name: '', city: '', emirate: 'Dubai', base_delivery_fee: '',
    extra_km_fee: '', max_weight_kg: '', estimated_minutes: '',
    is_active: true, color: '#3b82f6', polygon: [], center_lat: '', center_lng: '',
  });

  const openEdit = (z) => {
    setSelected(z);
    let poly = [];
    try { poly = z.polygon ? (typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon) : []; } catch (e) {}
    setForm({
      name: z.name || '', city: z.city || '', emirate: z.emirate || 'Dubai',
      base_delivery_fee: z.base_delivery_fee || '', extra_km_fee: z.extra_km_fee || '',
      max_weight_kg: z.max_weight_kg || '', estimated_minutes: z.estimated_minutes || '',
      is_active: z.is_active !== false, color: z.color || '#3b82f6',
      polygon: poly, center_lat: '', center_lng: '',
    });
    setShowForm(true);
  };

  const openNew = () => { resetForm(); setSelected(null); setError(''); setShowForm(true); };

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

  const mapPolygons = useMemo(() => {
    return zones.map((z, i) => {
      let coords = [];
      try { coords = z.polygon ? (typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon) : []; } catch (e) {}
      return { ...z, coords, zoneColor: z.color || ZONE_COLORS[i % ZONE_COLORS.length] };
    }).filter(z => z.coords.length > 2);
  }, [zones]);

  const zoneMarkers = useMemo(() => {
    return zones.map((z, i) => {
      let coords = [];
      try { coords = z.polygon ? (typeof z.polygon === 'string' ? JSON.parse(z.polygon) : z.polygon) : []; } catch (e) {}
      const centroid = getCentroid(coords);
      if (centroid) return { id: z.id, lat: centroid[0], lng: centroid[1], name: z.name, emirate: z.emirate };
      return null;
    }).filter(Boolean);
  }, [zones]);

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
              filtered.map((zone, i) => (
                <div key={zone.id}
                  className={`zone-card ${activeZone === zone.id ? 'active' : ''}`}
                  onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}>
                  <div className="zone-card-header">
                    <div>
                      <div className="zone-card-name">
                        <span style={{
                          display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                          background: zone.color || ZONE_COLORS[i % ZONE_COLORS.length],
                          marginRight: 8, verticalAlign: 'middle'
                        }} />
                        {zone.name}
                      </div>
                      <div className="zone-card-sub">{zone.city ? `${zone.city}, ` : ''}{zone.emirate}</div>
                    </div>
                    <span className="status-badge" style={{
                      background: zone.is_active ? '#dcfce7' : '#f1f5f9',
                      color: zone.is_active ? '#16a34a' : '#64748b',
                    }}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="zone-stats">
                    <div className="zone-stat">
                      <div className="zone-stat-label">Base Fee</div>
                      <div className="zone-stat-value">AED {zone.base_delivery_fee || 0}</div>
                    </div>
                    <div className="zone-stat">
                      <div className="zone-stat-label">Extra/km</div>
                      <div className="zone-stat-value">{zone.extra_km_fee ? `AED ${zone.extra_km_fee}` : '—'}</div>
                    </div>
                    <div className="zone-stat">
                      <div className="zone-stat-label">Max Weight</div>
                      <div className="zone-stat-value">{zone.max_weight_kg ? `${zone.max_weight_kg} kg` : '—'}</div>
                    </div>
                    <div className="zone-stat">
                      <div className="zone-stat-label">Drivers</div>
                      <div className="zone-stat-value">{zone.driver_count || 0}</div>
                    </div>
                  </div>
                  <div className="zone-card-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setActiveZone(zone.id)}>
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
              ))
            )}
          </div>

          <div className="zones-map-panel">
            <MapContainer center={[25.2048, 55.2708]} zoom={9}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              scrollWheelZoom={true} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <FitBounds zones={zones} activeId={activeZone} />
              {mapPolygons.map(z => (
                <Polygon key={z.id} positions={z.coords}
                  pathOptions={{
                    color: z.zoneColor, fillColor: z.zoneColor,
                    fillOpacity: activeZone === z.id ? 0.3 : 0.12,
                    weight: activeZone === z.id ? 3.5 : 2,
                  }}
                  eventHandlers={{ click: () => setActiveZone(z.id) }}>
                  <Popup>
                    <div className="map-popup">
                      <strong>{z.name}</strong>
                      <div className="popup-detail">{z.emirate} &bull; AED {z.base_delivery_fee || 0}</div>
                    </div>
                  </Popup>
                </Polygon>
              ))}
              {zoneMarkers.map(m => (
                <Marker key={m.id} position={[m.lat, m.lng]} icon={MARKER_ICONS.zone}
                  eventHandlers={{ click: () => setActiveZone(m.id) }}>
                  <Popup>
                    <div className="map-popup">
                      <strong>{m.name}</strong>
                      <div className="popup-detail">{m.emirate}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setSelected(null); }}>
          <div className="modal-container large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected ? `Edit Zone — ${selected.name}` : 'New Zone'}</h3>
              <button className="modal-close" onClick={() => { setShowForm(false); setSelected(null); }}>
                <Xmark width={18} height={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
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
                      placeholder="e.g. Dubai" />
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
                    <label>Base Fee (AED) *</label>
                    <input required type="number" min="0" step="0.01" value={form.base_delivery_fee}
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
                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
                    <input type="checkbox" id="zone_active" checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                    <label htmlFor="zone_active" style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Active Zone</label>
                  </div>
                </div>
                <div className="form-section-title" style={{ marginTop: '1rem' }}>
                  Zone Location
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--gray-400)', marginLeft: 8 }}>
                    Click map to set center point
                  </span>
                </div>
                <div className="form-map-wrapper">
                  <LocationPicker
                    lat={form.center_lat}
                    lng={form.center_lng}
                    onChange={({ lat, lng, address }) => setForm(f => ({
                      ...f, center_lat: lat, center_lng: lng,
                      city: address?.split(',')[1]?.trim() || f.city
                    }))}
                    height={250}
                    markerType="zone"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-action"
                  onClick={() => { setShowForm(false); setSelected(null); }}>Cancel</button>
                <button type="submit" className="btn-primary-action" disabled={saving}>
                  {saving ? 'Saving...' : selected ? 'Update Zone' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
