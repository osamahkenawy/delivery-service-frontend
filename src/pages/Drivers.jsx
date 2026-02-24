import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  User, Phone, Mail, MapPin, Star, Package, DeliveryTruck, Check, Xmark,
  Plus, Search, EditPencil, Eye, Refresh, NavArrowLeft, NavArrowRight,
  StatsReport, Medal, Timer, TruckLength, Clock, Calendar, Bicycle, XmarkCircle,
  MoreHoriz, Prohibition, Gps, DollarCircle, ArrowRight
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import MapView from '../components/MapView';
import './CRMPages.css';

/* ─── Constants ─────────────────────────────────────────────── */
const STATUS_META = {
  available: { label: 'Available', bg: '#dcfce7', color: '#16a34a', pulse: true },
  busy:      { label: 'Busy',      bg: '#fce7f3', color: '#be185d', pulse: false },
  on_break:  { label: 'On Break',  bg: '#fef3c7', color: '#d97706', pulse: false },
  offline:   { label: 'Offline',   bg: '#f1f5f9', color: '#94a3b8', pulse: false },
};

const VEHICLE_META = {
  motorcycle: { label: 'Motorcycle', emoji: '🏍️', color: '#f97316' },
  car:        { label: 'Car',        emoji: '🚗', color: '#3b82f6' },
  van:        { label: 'Van',        emoji: '🚐', color: '#8b5cf6' },
  truck:      { label: 'Truck',      emoji: '🚛', color: '#ef4444' },
  bicycle:    { label: 'Bicycle',    emoji: '🚲', color: '#10b981' },
};

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', national_id: '',
  vehicle_type: 'motorcycle', vehicle_plate: '', vehicle_model: '',
  vehicle_color: '', license_number: '', zone_id: '', password: '',
  joined_at: '', notes: '', status: 'offline',
};

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAED   = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `AED ${n.toFixed(2)}` : '—'; };
const fmtPct   = (a, b) => b > 0 ? `${Math.round((a / b) * 100)}%` : '—';
const fmtPing  = d => {
  if (!d) return 'Never';
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return fmtDate(d);
};

/* ─── Sub-components ─────────────────────────────────────────── */
const StatusBadge = ({ status, size = 'sm' }) => {
  const m = STATUS_META[status] || STATUS_META.offline;
  return (
    <span className={`drv-status-badge ${size}`} style={{ background: m.bg, color: m.color }}>
      <span className={`drv-status-dot ${m.pulse ? 'pulse' : ''}`} style={{ background: m.color }} />
      {m.label}
    </span>
  );
};

const StarRating = ({ value }) => {
  const filled = Math.round(parseFloat(value) || 0);
  return (
    <div className="drv-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i} width={13} height={13}
          fill={i <= filled ? '#f59e0b' : 'none'}
          style={{ color: i <= filled ? '#f59e0b' : '#d1d5db' }} />
      ))}
      {value ? <span className="drv-stars-val">{parseFloat(value).toFixed(1)}</span> : null}
    </div>
  );
};

const MetricCard = ({ icon: Icon, value, label, accent = '#244066' }) => (
  <div className="drv-metric">
    <div className="drv-metric-val" style={{ color: accent }}>{value}</div>
    <div className="drv-metric-lbl">{label}</div>
  </div>
);

const SkeletonGrid = () => (
  <div className="drv-grid">
    {[1,2,3,4,5,6].map(i => (
      <div key={i} className="drv-card skeleton-pulse" style={{ height: 260 }} />
    ))}
  </div>
);

/* ─── Order status mini badge ── */
const miniStatus = {
  delivered:  { bg: '#dcfce7', color: '#16a34a' },
  in_transit: { bg: '#e0f2fe', color: '#0369a1' },
  failed:     { bg: '#fee2e2', color: '#dc2626' },
  cancelled:  { bg: '#f1f5f9', color: '#64748b' },
  pending:    { bg: '#fef3c7', color: '#d97706' },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Drivers() {
  const { user } = useContext(AuthContext);
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [viewDriver, setViewDriver] = useState(null);
  const [viewDetail, setViewDetail] = useState(null); /* full detail with recent orders */
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab,  setActiveTab]  = useState('profile');
  const [showForm,   setShowForm]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [zones,      setZones]      = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ search: '', status: '', vehicle_type: '' });
  const debounceRef = useRef(null);

  useEffect(() => { fetchDrivers(); fetchZones(); }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filters.status)       params.append('status',       filters.status);
      if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type); /* note: backend search covers name/phone/plate */
      if (filters.search)       params.append('search',       filters.search);
      const res = await api.get(`/drivers?${params}`);
      if (res.success) setDrivers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchZones = async () => {
    const res = await api.get('/zones');
    if (res.success) setZones((res.data || []).filter(z => z.is_active));
  };

  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/drivers/${id}`);
      if (res.success) setViewDetail(res.data);
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  /* Debounced filter fetch */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchDrivers, 350);
    return () => clearTimeout(debounceRef.current);
  }, [filters.search]);

  useEffect(() => { fetchDrivers(); }, [filters.status, filters.vehicle_type]);

  /* Filtered list (client-side vehicle_type since backend may not filter it) */
  const visibleDrivers = useMemo(() => {
    if (!filters.vehicle_type) return drivers;
    return drivers.filter(d => d.vehicle_type === filters.vehicle_type);
  }, [drivers, filters.vehicle_type]);

  /* Stats */
  const stats = useMemo(() => {
    const s = { total: drivers.length, available: 0, busy: 0, on_break: 0, offline: 0 };
    drivers.forEach(d => { if (s[d.status] !== undefined) s[d.status]++; });
    return s;
  }, [drivers]);

  /* Open a driver in the view drawer */
  const openView = (driver) => {
    setViewDriver(driver);
    setViewDetail(null);
    setActiveTab('profile');
    fetchDetail(driver.id);
  };

  const handleStatusChange = async (driverId, status) => {
    await api.patch(`/drivers/${driverId}/status`, { status });
    fetchDrivers();
    if (viewDriver?.id === driverId) setViewDriver(v => ({ ...v, status }));
  };

  const handleToggleActive = async (driver) => {
    const newActive = !driver.is_active;
    await api.put(`/drivers/${driver.id}`, { ...driver, is_active: newActive ? 1 : 0 });
    fetchDrivers();
    if (viewDriver?.id === driver.id) setViewDriver(v => ({ ...v, is_active: newActive }));
  };

  const openNew = () => { setSelected(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit = (driver) => {
    setSelected(driver);
    setForm({
      full_name:      driver.full_name      || '',
      phone:          driver.phone          || '',
      email:          driver.email          || '',
      national_id:    driver.national_id    || '',
      vehicle_type:   driver.vehicle_type   || 'motorcycle',
      vehicle_plate:  driver.vehicle_plate  || '',
      vehicle_model:  driver.vehicle_model  || '',
      vehicle_color:  driver.vehicle_color  || '',
      license_number: driver.license_number || '',
      zone_id:        driver.zone_id        || '',
      password:       '',
      joined_at:      driver.joined_at ? driver.joined_at.split('T')[0] : '',
      notes:          driver.notes          || '',
      status:         driver.status         || 'offline',
    });
    setError(''); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setSelected(null); setForm(EMPTY_FORM); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const res = selected
        ? await api.put(`/drivers/${selected.id}`, payload)
        : await api.post('/drivers', payload);
      if (res.success) {
        // Show driver account credentials on new creation
        if (!selected && res.account) {
          setCredentialsModal(res.account);
        }
        closeForm();
        fetchDrivers();
      } else {
        setError(res.message || 'Failed to save driver');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  };

  const clearFilters = () => setFilters({ search: '', status: '', vehicle_type: '' });
  const hasFilters   = filters.search || filters.status || filters.vehicle_type;

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Drivers</h2>
          <p className="page-subheading">{stats.total} registered drivers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline-action" onClick={fetchDrivers}>
            <Refresh width={15} height={15} /> Refresh
          </button>
          <button className="btn-primary-action" onClick={openNew}>
            <Plus width={16} height={16} /> Add Driver
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="ord-stats-row">
        <div className="ord-stat-card">
          <div className="ord-stat-icon" style={{ background: '#244066' + '18', color: '#244066' }}>
            <User width={18} height={18} />
          </div>
          <div className="ord-stat-info">
            <div className="ord-stat-value">{stats.total}</div>
            <div className="ord-stat-label">Total Drivers</div>
          </div>
        </div>
        {Object.entries(STATUS_META).map(([key, m]) => (
          <div key={key} className="ord-stat-card drv-stat-clickable"
            onClick={() => setFilters(f => ({ ...f, status: f.status === key ? '' : key }))}>
            <div className="ord-stat-icon" style={{ background: m.bg, color: m.color }}>
              {key === 'available' ? <Check width={18} height={18} /> :
               key === 'busy'      ? <DeliveryTruck width={18} height={18} /> :
               key === 'on_break'  ? <Clock width={18} height={18} /> :
               <Prohibition width={18} height={18} />}
            </div>
            <div className="ord-stat-info">
              <div className="ord-stat-value" style={{ color: m.color }}>{stats[key]}</div>
              <div className="ord-stat-label">{m.label}</div>
            </div>
            {filters.status === key && <div className="drv-stat-active-pip" style={{ background: m.color }} />}
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="search-box">
          <Search width={15} height={15} className="search-icon" />
          <input type="text" placeholder="Search name, phone, plate..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="search-input" />
          {filters.search && (
            <button className="search-clear" onClick={() => setFilters(f => ({ ...f, search: '' }))}>
              <XmarkCircle width={15} height={15} />
            </button>
          )}
        </div>
        <select className="filter-select"
          value={filters.vehicle_type}
          onChange={e => setFilters(f => ({ ...f, vehicle_type: e.target.value }))}>
          <option value="">All Vehicles</option>
          {Object.entries(VEHICLE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn-outline-action" onClick={clearFilters}>
            <Xmark width={14} height={14} /> Clear
          </button>
        )}
        <span className="filter-count">{visibleDrivers.length} result{visibleDrivers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Drivers Grid ── */}
      {loading ? <SkeletonGrid /> : visibleDrivers.length === 0 ? (
        <div className="ord-empty">
          <div className="ord-empty-icon"><User width={48} height={48} /></div>
          <h3>No drivers found</h3>
          <p>{hasFilters ? 'Try adjusting your search or filters' : 'Add your first driver to get started'}</p>
          {!hasFilters && (
            <button className="btn-primary-action" onClick={openNew}>
              <Plus width={16} height={16} /> Add Driver
            </button>
          )}
        </div>
      ) : (
        <div className="drv-grid">
          {visibleDrivers.map(driver => {
            const sm  = STATUS_META[driver.status]  || STATUS_META.offline;
            const vm  = VEHICLE_META[driver.vehicle_type] || VEHICLE_META.motorcycle;
            const pct = driver.total_orders > 0
              ? Math.round((driver.delivered_orders / driver.total_orders) * 100)
              : null;
            const isInactive = driver.is_active === 0 || driver.is_active === false;
            return (
              <div key={driver.id} className={`drv-card ${isInactive ? 'inactive' : ''}`}
                onClick={() => openView(driver)}>

                {/* Status accent strip */}
                <div className="drv-card-strip" style={{ background: sm.color }} />

                {/* Header: avatar + status */}
                <div className="drv-card-header">
                  <div className="drv-avatar-wrap">
                    <div className="drv-avatar" style={{ background: sm.bg, color: sm.color }}>
                      {driver.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className={`drv-dot ${sm.pulse ? 'pulse' : ''}`}
                      style={{ background: sm.color }} />
                  </div>
                  <div className="drv-card-title">
                    <div className="drv-card-name">{driver.full_name}</div>
                    <div className="drv-card-phone">{driver.phone}</div>
                    {driver.email && <div className="drv-card-email">{driver.email}</div>}
                  </div>
                  <select value={driver.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); handleStatusChange(driver.id, e.target.value); }}
                    className="drv-status-select"
                    style={{ background: sm.bg, color: sm.color }}>
                    {Object.entries(STATUS_META).map(([k, m]) => (
                      <option key={k} value={k}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle + Zone */}
                <div className="drv-card-tags">
                  <span className="drv-tag vehicle" style={{ background: vm.color + '15', color: vm.color }}>
                    {vm.emoji} {vm.label}
                    {driver.vehicle_plate && <> · {driver.vehicle_plate}</>}
                  </span>
                  {driver.zone_name && (
                    <span className="drv-tag zone">
                      <MapPin width={11} height={11} /> {driver.zone_name}
                    </span>
                  )}
                  {isInactive && <span className="drv-tag inactive">Inactive</span>}
                </div>

                {/* Rating + Active orders */}
                <div className="drv-card-mid">
                  <StarRating value={driver.rating} />
                  {driver.active_orders > 0 && (
                    <span className="drv-active-badge">
                      <DeliveryTruck width={12} height={12} />
                      {driver.active_orders} active
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="drv-metrics">
                  <div className="drv-metric">
                    <div className="drv-metric-val">{driver.total_deliveries || driver.total_orders || 0}</div>
                    <div className="drv-metric-lbl">Total</div>
                  </div>
                  <div className="drv-metric">
                    <div className="drv-metric-val" style={{ color: '#0369a1' }}>{driver.orders_today || 0}</div>
                    <div className="drv-metric-lbl">Today</div>
                  </div>
                  <div className="drv-metric">
                    <div className="drv-metric-val" style={{ color: '#16a34a' }}>
                      {pct !== null ? `${pct}%` : '—'}
                    </div>
                    <div className="drv-metric-lbl">Success</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="drv-card-footer" onClick={e => e.stopPropagation()}>
                  <div className="drv-card-date">
                    {driver.joined_at ? (
                      <><Calendar width={11} height={11} /> Joined {fmtDate(driver.joined_at)}</>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>No join date</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="action-btn view" title="View Details"
                      onClick={e => { e.stopPropagation(); openView(driver); }}>
                      <Eye width={13} height={13} />
                    </button>
                    <button className="action-btn edit" title="Edit"
                      onClick={e => { e.stopPropagation(); openEdit(driver); }}>
                      <EditPencil width={13} height={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         DRIVER DETAIL DRAWER
         ══════════════════════════════════════════════════════════ */}
      {viewDriver && (
        <div className="modal-overlay" onClick={() => setViewDriver(null)}>
          <div className="ord-drawer drv-drawer" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="ord-drawer-header drv-drawer-hero">
              <div className="drv-drawer-avatar"
                style={{ background: STATUS_META[viewDriver.status]?.bg, color: STATUS_META[viewDriver.status]?.color }}>
                {viewDriver.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="drv-drawer-hero-text">
                <h3>{viewDriver.full_name}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <StatusBadge status={viewDriver.status} size="sm" />
                  {viewDriver.vehicle_type && (
                    <span className="drv-tag vehicle" style={{
                      background: (VEHICLE_META[viewDriver.vehicle_type]?.color || '#666') + '18',
                      color: VEHICLE_META[viewDriver.vehicle_type]?.color || '#666', fontSize: 12
                    }}>
                      {VEHICLE_META[viewDriver.vehicle_type]?.emoji} {VEHICLE_META[viewDriver.vehicle_type]?.label}
                    </span>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setViewDriver(null)}>
                <Xmark width={18} height={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="drv-tabs">
              <button className={`drv-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}>
                <User width={14} height={14} /> Profile
              </button>
              <button className={`drv-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}>
                <Package width={14} height={14} />
                Orders
                {viewDetail?.recent_orders?.length > 0 && (
                  <span className="drv-tab-badge">{viewDetail.recent_orders.length}</span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className="ord-drawer-body">
              {detailLoading ? (
                <div className="drv-detail-loading">
                  <div className="skeleton-pulse" style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
                  <div className="skeleton-pulse" style={{ height: 120, borderRadius: 12, marginBottom: 12 }} />
                  <div className="skeleton-pulse" style={{ height: 60, borderRadius: 12 }} />
                </div>
              ) : activeTab === 'profile' ? (
                <>
                  {/* Performance metrics */}
                  <div className="ord-view-section">
                    <div className="drv-perf-row">
                      <div className="drv-perf-card" style={{ '--accent': '#244066' }}>
                        <div className="drv-perf-val">{viewDetail?.total_deliveries || viewDetail?.total_orders || 0}</div>
                        <div className="drv-perf-lbl">Total Deliveries</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#0369a1' }}>
                        <div className="drv-perf-val">{viewDetail?.orders_today || 0}</div>
                        <div className="drv-perf-lbl">Today</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#16a34a' }}>
                        <div className="drv-perf-val">
                          {fmtPct(viewDetail?.delivered_orders, viewDetail?.total_orders)}
                        </div>
                        <div className="drv-perf-lbl">Success Rate</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#d97706' }}>
                        <div className="drv-perf-val">{fmtAED(viewDetail?.total_earned)}</div>
                        <div className="drv-perf-lbl">Earned</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <StarRating value={viewDetail?.rating} />
                      {viewDetail?.last_ping && (
                        <span className="drv-ping-chip">
                          <Gps width={12} height={12} /> {fmtPing(viewDetail.last_ping)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="ord-view-section">
                    <div className="ord-view-section-title"><User width={14} height={14} /> Contact</div>
                    <div className="ord-view-card">
                      <div className="ord-view-row">
                        <span className="ord-view-label">Phone</span>
                        <a href={`tel:${viewDriver.phone}`} className="ord-view-value link">{viewDriver.phone}</a>
                      </div>
                      {viewDriver.email && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">Email</span>
                          <span className="ord-view-value">{viewDriver.email}</span>
                        </div>
                      )}
                      {viewDriver.national_id && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">National ID</span>
                          <span className="ord-view-value">{viewDriver.national_id}</span>
                        </div>
                      )}
                      {viewDriver.joined_at && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">Joined</span>
                          <span className="ord-view-value">{fmtDate(viewDriver.joined_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div className="ord-view-section">
                    <div className="ord-view-section-title">
                      {VEHICLE_META[viewDriver.vehicle_type]?.emoji || '🚗'} Vehicle
                    </div>
                    <div className="ord-view-card">
                      <div className="ord-view-row">
                        <span className="ord-view-label">Type</span>
                        <span className="ord-view-value bold">{VEHICLE_META[viewDriver.vehicle_type]?.label || viewDriver.vehicle_type}</span>
                      </div>
                      {viewDriver.vehicle_plate && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">Plate</span>
                          <span className="ord-view-value drv-plate">{viewDriver.vehicle_plate}</span>
                        </div>
                      )}
                      {viewDriver.vehicle_model && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">Model</span>
                          <span className="ord-view-value">{viewDriver.vehicle_model}</span>
                        </div>
                      )}
                      {viewDriver.vehicle_color && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">Color</span>
                          <span className="ord-view-value">{viewDriver.vehicle_color}</span>
                        </div>
                      )}
                      {viewDriver.license_number && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">License #</span>
                          <span className="ord-view-value">{viewDriver.license_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zone + Last Location */}
                  {(viewDriver.zone_name || viewDetail?.last_lat) && (
                    <div className="ord-view-section">
                      <div className="ord-view-section-title"><MapPin width={14} height={14} /> Location</div>
                      {viewDriver.zone_name && (
                        <div className="ord-view-card" style={{ marginBottom: 8 }}>
                          <div className="ord-view-row">
                            <span className="ord-view-label">Assigned Zone</span>
                            <span className="ord-view-value bold">{viewDriver.zone_name}</span>
                          </div>
                        </div>
                      )}
                      {viewDetail?.last_lat && viewDetail?.last_lng && (
                        <div className="ord-view-map">
                          <MapView
                            markers={[{
                              lat: parseFloat(viewDetail.last_lat),
                              lng: parseFloat(viewDetail.last_lng),
                              type: 'driver',
                              label: viewDriver.full_name,
                              popup: (
                                <div style={{ minWidth: 180, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                                      {viewDriver.full_name?.charAt(0)}
                                    </span>
                                    {viewDriver.full_name}
                                  </div>
                                  {viewDriver.vehicle_type && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', marginTop: 4 }}>
                                      <span>🚗</span>
                                      <span style={{ textTransform: 'capitalize' }}>{viewDriver.vehicle_type}</span>
                                      <span style={{ color: '#9ca3af' }}>•</span>
                                      <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{viewDriver.vehicle_plate || '—'}</span>
                                    </div>
                                  )}
                                  {viewDetail.last_ping && (
                                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.76rem' }}>
                                      📍 Last ping: {fmtPing(viewDetail.last_ping)}
                                    </div>
                                  )}
                                </div>
                              )
                            }]}
                            height={160} zoom={14} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {viewDriver.notes && (
                    <div className="ord-view-section">
                      <div className="ord-view-card subtle">
                        <div className="ord-view-row" style={{ alignItems: 'flex-start' }}>
                          <span className="ord-view-label">Notes</span>
                          <span className="ord-view-value" style={{ whiteSpace: 'pre-wrap' }}>{viewDriver.notes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ── Orders Tab ── */
                <div className="ord-view-section">
                  {!viewDetail?.recent_orders?.length ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      <Package width={36} height={36} style={{ marginBottom: 8 }} />
                      <p>No orders yet</p>
                    </div>
                  ) : (
                    <div className="drv-orders-list">
                      {viewDetail.recent_orders.map(o => {
                        const ms = miniStatus[o.status] || miniStatus.pending;
                        return (
                          <div key={o.id} className="drv-order-row">
                            <div className="drv-order-num">{o.order_number}</div>
                            <div className="drv-order-recipient">{o.recipient_name}</div>
                            <div className="drv-order-emirate">{o.recipient_emirate}</div>
                            <span className="drv-mini-badge"
                              style={{ background: ms.bg, color: ms.color }}>
                              {o.status.replace(/_/g, ' ')}
                            </span>
                            <div className="drv-order-fee">{fmtAED(o.delivery_fee)}</div>
                            <div className="drv-order-date">{fmtDate(o.created_at)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="ord-drawer-footer">
              <button className="btn-outline-action drv-deactivate"
                onClick={() => handleToggleActive(viewDriver)}
                style={{ color: viewDriver.is_active === 0 ? '#16a34a' : '#dc2626',
                         borderColor: viewDriver.is_active === 0 ? '#bbf7d0' : '#fecaca' }}>
                {viewDriver.is_active === 0 ? <><Check width={14} height={14} /> Activate</> : <><Prohibition width={14} height={14} /> Deactivate</>}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline-action" onClick={() => setViewDriver(null)}>Close</button>
                <button className="btn-primary-action"
                  onClick={() => { setViewDriver(null); openEdit(viewDriver); }}>
                  <EditPencil width={14} height={14} /> Edit Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         CREATE / EDIT MODAL
         ══════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-container large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected ? `Edit — ${selected.full_name}` : 'Add New Driver'}</h3>
              <button className="modal-close" onClick={closeForm}><Xmark width={18} height={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert-error" style={{ marginBottom: '1rem' }}>
                    <Prohibition width={16} height={16} /> {error}
                  </div>
                )}

                {/* Personal */}
                <div className="form-section-title">
                  <User width={15} height={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Personal Information
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Full Name *</label>
                    <input required type="text" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Driver full name" />
                  </div>
                  <div className="form-field">
                    <label>Phone *</label>
                    <input required type="text" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+971 50 000 0000" />
                  </div>
                  <div className="form-field">
                    <label>Email</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="driver@example.com" />
                  </div>
                  <div className="form-field">
                    <label>National ID</label>
                    <input type="text" value={form.national_id}
                      onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
                      placeholder="National ID number" />
                  </div>
                  <div className="form-field">
                    <label>Joined Date</label>
                    <input type="date" value={form.joined_at}
                      onChange={e => setForm(f => ({ ...f, joined_at: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {!selected && (
                    <div className="form-field">
                      <label>Password</label>
                      <input type="password" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Leave empty for auto-generated" />
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                <div className="form-section-title" style={{ marginTop: '1.5rem' }}>
                  🚗 Vehicle Information
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Vehicle Type</label>
                    <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                      {Object.entries(VEHICLE_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Plate Number</label>
                    <input type="text" value={form.vehicle_plate}
                      onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))}
                      placeholder="e.g. A 12345 Dubai" />
                  </div>
                  <div className="form-field">
                    <label>Vehicle Model</label>
                    <input type="text" value={form.vehicle_model}
                      onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))}
                      placeholder="e.g. Honda CB150" />
                  </div>
                  <div className="form-field">
                    <label>Vehicle Color</label>
                    <input type="text" value={form.vehicle_color}
                      onChange={e => setForm(f => ({ ...f, vehicle_color: e.target.value }))}
                      placeholder="e.g. Red" />
                  </div>
                  <div className="form-field">
                    <label>License Number</label>
                    <input type="text" value={form.license_number}
                      onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                      placeholder="Driving license number" />
                  </div>
                  <div className="form-field">
                    <label>Assigned Zone</label>
                    <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                      <option value="">No zone assigned</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name} — {z.emirate}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field span-2">
                    <label>Notes</label>
                    <textarea rows={3} value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Additional notes about this driver..." />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline-action" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn-primary-action" disabled={saving}>
                  {saving ? 'Saving...' : selected ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Driver Credentials Modal ── */}
      {credentialsModal && (
        <div className="modal-overlay" onClick={() => setCredentialsModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, borderRadius: 16 }}>
            {/* Success header */}
            <div style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              padding: '28px 24px 22px',
              borderRadius: '16px 16px 0 0',
              textAlign: 'center',
              color: '#fff',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, fontSize: 28,
              }}>
                <Check width={32} height={32} strokeWidth={2.5} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Driver Account Created
              </h3>
              <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
                {credentialsModal.isDefault
                  ? 'A default password was auto-generated'
                  : 'Using the password you set'}
              </p>
            </div>

            {/* Credentials body */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                overflow: 'hidden', marginBottom: 16,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace', color: '#1e293b' }}>{credentialsModal.username}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'monospace', color: '#1e293b' }}>{credentialsModal.password}</span>
                </div>
              </div>

              {credentialsModal.isDefault && (
                <div style={{
                  background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10,
                  padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                  marginBottom: 16,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9a3412', lineHeight: 1.5 }}>
                    This is an auto-generated password. Share it securely with the driver and advise them to change it after first login.
                  </p>
                </div>
              )}

              <button
                className="btn-primary-action"
                onClick={() => {
                  const text = `Username: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`;
                  navigator.clipboard?.writeText(text);
                  setCredentialsModal(null);
                }}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600 }}
              >
                Copy Credentials & Close
              </button>
              <button
                className="btn-outline-action"
                onClick={() => setCredentialsModal(null)}
                style={{ width: '100%', padding: '10px', borderRadius: 10, marginTop: 8, fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
