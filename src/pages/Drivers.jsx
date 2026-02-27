import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  User, Phone, Mail, MapPin, Star, Package, DeliveryTruck, Check, Xmark,
  Plus, Search, EditPencil, Eye, Refresh, NavArrowLeft, NavArrowRight,
  StatsReport, Medal, Timer, TruckLength, Clock, Calendar, Bicycle, XmarkCircle,
  MoreHoriz, Prohibition, Gps, DollarCircle, ArrowRight, Copy,
  Motorcycle, Car, Truck, Bus
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import MapView from '../components/MapView';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

/* ─── Constants ─────────────────────────────────────────────── */
const STATUS_META = {
  available: { label: 'Available', bg: '#dcfce7', color: '#16a34a', pulse: true },
  busy:      { label: 'Busy',      bg: '#fce7f3', color: '#be185d', pulse: false },
  on_break:  { label: 'On Break',  bg: '#fef3c7', color: '#d97706', pulse: false },
  offline:   { label: 'Offline',   bg: '#f1f5f9', color: '#94a3b8', pulse: false },
};

const VEHICLE_META = {
  motorcycle: { label: 'Motorcycle', Icon: Motorcycle, color: '#f97316' },
  car:        { label: 'Car',        Icon: Car,        color: '#3b82f6' },
  van:        { label: 'Van',        Icon: Bus,        color: '#8b5cf6' },
  truck:      { label: 'Truck',      Icon: Truck,      color: '#ef4444' },
  bicycle:    { label: 'Bicycle',    Icon: Bicycle,    color: '#10b981' },
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
  const { t } = useTranslation();
  const m = STATUS_META[status] || STATUS_META.offline;
  return (
    <span className={`drv-status-badge ${size}`} style={{ background: m.bg, color: m.color }}>
      <span className={`drv-status-dot ${m.pulse ? 'pulse' : ''}`} style={{ background: m.color }} />
      {t(`drivers.status.${status}`, { defaultValue: m.label })}
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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
          <h2 className="page-heading">{t('drivers.title')}</h2>
          <p className="page-subheading">{t('drivers.registered_drivers', { count: stats.total })}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline-action" onClick={fetchDrivers}>
            <Refresh width={15} height={15} /> {t('common.refresh')}
          </button>
          <button className="btn-primary-action" onClick={openNew}>
            <Plus width={16} height={16} /> {t('drivers.add_driver')}
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
            <div className="ord-stat-label">{t('drivers.total_drivers')}</div>
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
              <div className="ord-stat-label">{t(`drivers.status.${key}`, { defaultValue: m.label })}</div>
            </div>
            {filters.status === key && <div className="drv-stat-active-pip" style={{ background: m.color }} />}
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="search-box">
          <Search width={15} height={15} className="search-icon" />
          <input type="text" placeholder={t("drivers.search_placeholder")}
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
          <option value="">{t("drivers.all_vehicles")}</option>
          {Object.entries(VEHICLE_META).map(([k, v]) => (
          <option key={k} value={k}>{t(`drivers.vehicle.${k}`, { defaultValue: v.label })}</option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn-outline-action" onClick={clearFilters}>
            <Xmark width={14} height={14} /> {t('common.clear')}
          </button>
        )}
        <span className="filter-count">{t('drivers.filter_count', { count: visibleDrivers.length })}</span>
      </div>

      {/* ── Drivers Grid ── */}
      {loading ? <SkeletonGrid /> : visibleDrivers.length === 0 ? (
        <div className="ord-empty">
          <div className="ord-empty-icon"><User width={48} height={48} /></div>
          <h3>{t("drivers.no_drivers")}</h3>
          <p>{hasFilters ? t('drivers.adjust_filters') : t('drivers.no_drivers_hint')}</p>
          {!hasFilters && (
            <button className="btn-primary-action" onClick={openNew}>
              <Plus width={16} height={16} /> {t('drivers.add_driver')}
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
                      <option key={k} value={k}>{t(`drivers.status.${k}`, { defaultValue: m.label })}</option>
                    ))}  
                  </select>
                </div>

                {/* Vehicle + Zone */}
                <div className="drv-card-tags">
                  <span className="drv-tag vehicle" style={{ background: vm.color + '15', color: vm.color }}>
                    {vm.Icon && <vm.Icon width={13} height={13} />} {t(`drivers.vehicle.${driver.vehicle_type}`, { defaultValue: vm.label })}
                    {driver.vehicle_plate && <> · {driver.vehicle_plate}</>}
                  </span>
                  {driver.zone_name && (
                    <span className="drv-tag zone">
                      <MapPin width={11} height={11} /> {driver.zone_name}
                    </span>
                  )}
                  {isInactive && <span className="drv-tag inactive">{t('drivers.inactive')}</span>}
                </div>

                {/* Rating + Active orders */}
                <div className="drv-card-mid">
                  <StarRating value={driver.rating} />
                  {driver.active_orders > 0 && (
                    <span className="drv-active-badge">
                      <DeliveryTruck width={12} height={12} />
                      {t('drivers.active_orders', { count: driver.active_orders })}
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="drv-metrics">
                  <div className="drv-metric">
                    <div className="drv-metric-val">{driver.total_deliveries || driver.total_orders || 0}</div>
                    <div className="drv-metric-lbl">{t('drivers.metric_total')}</div>
                  </div>
                  <div className="drv-metric">
                    <div className="drv-metric-val" style={{ color: '#0369a1' }}>{driver.orders_today || 0}</div>
                    <div className="drv-metric-lbl">{t('drivers.metric_today')}</div>
                  </div>
                  <div className="drv-metric">
                    <div className="drv-metric-val" style={{ color: '#16a34a' }}>
                      {pct !== null ? `${pct}%` : '—'}
                    </div>
                    <div className="drv-metric-lbl">{t('drivers.metric_success')}</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="drv-card-footer" onClick={e => e.stopPropagation()}>
                  <div className="drv-card-date">
                    {driver.joined_at ? (
                      <><Calendar width={11} height={11} /> {t('drivers.joined', { date: fmtDate(driver.joined_at) })}</>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>{t("drivers.no_join_date")}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="action-btn view" title={t('drivers.view_details')}
                      onClick={e => { e.stopPropagation(); openView(driver); }}>
                      <Eye width={13} height={13} />
                    </button>
                    <button className="action-btn edit" title={t('common.edit')}
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
                      {(() => { const VIcon = VEHICLE_META[viewDriver.vehicle_type]?.Icon; return VIcon ? <VIcon width={13} height={13} /> : null; })()} {t(`drivers.vehicle.${viewDriver.vehicle_type}`, { defaultValue: VEHICLE_META[viewDriver.vehicle_type]?.label })}
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
                <User width={14} height={14} /> {t('drivers.tab_profile')}
              </button>
              <button className={`drv-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}>
                <Package width={14} height={14} />
                {t('drivers.tab_orders')}
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
                        <div className="drv-perf-lbl">{t('drivers.total_deliveries')}</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#0369a1' }}>
                        <div className="drv-perf-val">{viewDetail?.orders_today || 0}</div>
                        <div className="drv-perf-lbl">{t('drivers.metric_today')}</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#16a34a' }}>
                        <div className="drv-perf-val">
                          {fmtPct(viewDetail?.delivered_orders, viewDetail?.total_orders)}
                        </div>
                        <div className="drv-perf-lbl">{t('drivers.metric_success_rate')}</div>
                      </div>
                      <div className="drv-perf-card" style={{ '--accent': '#d97706' }}>
                        <div className="drv-perf-val">{fmtAED(viewDetail?.total_earned)}</div>
                        <div className="drv-perf-lbl">{t('drivers.earned')}</div>
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
                    <div className="ord-view-section-title"><User width={14} height={14} /> {t('drivers.contact')}</div>
                    <div className="ord-view-card">
                      <div className="ord-view-row">
                        <span className="ord-view-label">{t('common.phone')}</span>
                        <a href={`tel:${viewDriver.phone}`} className="ord-view-value link">{viewDriver.phone}</a>
                      </div>
                      {viewDriver.email && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('common.email')}</span>
                          <span className="ord-view-value">{viewDriver.email}</span>
                        </div>
                      )}
                      {viewDriver.national_id && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t("drivers.national_id")}</span>
                          <span className="ord-view-value">{viewDriver.national_id}</span>
                        </div>
                      )}
                      {viewDriver.joined_at && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('drivers.joined_label')}</span>
                          <span className="ord-view-value">{fmtDate(viewDriver.joined_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div className="ord-view-section">
                    <div className="ord-view-section-title">
                      {(() => { const VIcon = VEHICLE_META[viewDriver.vehicle_type]?.Icon || Car; return <VIcon width={14} height={14} />; })()} {t('drivers.vehicle_section')}
                    </div>
                    <div className="ord-view-card">
                      <div className="ord-view-row">
                        <span className="ord-view-label">{t('drivers.type')}</span>
                        <span className="ord-view-value bold">{t(`drivers.vehicle.${viewDriver.vehicle_type}`, { defaultValue: VEHICLE_META[viewDriver.vehicle_type]?.label || viewDriver.vehicle_type })}</span>
                      </div>
                      {viewDriver.vehicle_plate && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('drivers.plate')}</span>
                          <span className="ord-view-value drv-plate">{viewDriver.vehicle_plate}</span>
                        </div>
                      )}
                      {viewDriver.vehicle_model && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('drivers.vehicle_model')}</span>
                          <span className="ord-view-value">{viewDriver.vehicle_model}</span>
                        </div>
                      )}
                      {viewDriver.vehicle_color && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('drivers.vehicle_color')}</span>
                          <span className="ord-view-value">{viewDriver.vehicle_color}</span>
                        </div>
                      )}
                      {viewDriver.license_number && (
                        <div className="ord-view-row">
                          <span className="ord-view-label">{t('drivers.license_hash')}</span>
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
                            <span className="ord-view-label">{t("drivers.assigned_zone")}</span>
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
                                      <DeliveryTruck width={14} height={14} style={{ flexShrink: 0 }} />
                                      <span style={{ textTransform: 'capitalize' }}>{viewDriver.vehicle_type}</span>
                                      <span style={{ color: '#9ca3af' }}>•</span>
                                      <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{viewDriver.vehicle_plate || '—'}</span>
                                    </div>
                                  )}
                                  {viewDetail.last_ping && (
                                    <div style={{ marginTop: 6, color: '#6b7280', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <MapPin width={11} height={11} /> Last ping: {fmtPing(viewDetail.last_ping)}
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
                          <span className="ord-view-label">{t('common.notes')}</span>
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
                      <p>{t("drivers.no_orders_yet")}</p>
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
                {viewDriver.is_active === 0 ? <><Check width={14} height={14} /> {t('drivers.activate')}</> : <><Prohibition width={14} height={14} /> {t('drivers.deactivate')}</>}
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-outline-action" onClick={() => setViewDriver(null)}>{t('common.close')}</button>
                <button className="btn-primary-action"
                  onClick={() => { setViewDriver(null); openEdit(viewDriver); }}>
                  <EditPencil width={14} height={14} /> {t('drivers.edit_driver')}
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
              <h3>{selected ? t('drivers.edit_title', { name: selected.full_name }) : t('drivers.add_driver_title')}</h3>
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
                  <User width={15} height={15} style={{ verticalAlign: 'middle', [isRTL?'marginLeft':'marginRight']: 6 }} />
                  {t('drivers.personal_info')}
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>{t('drivers.full_name_required')}</label>
                    <input required type="text" value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder={t("drivers.name_placeholder")} />
                  </div>
                  <div className="form-field">
                    <label>{t('drivers.phone_required')}</label>
                    <input required type="text" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+971 50 000 0000" />
                  </div>
                  <div className="form-field">
                    <label>{t('common.email')}</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="driver@example.com" />
                  </div>
                  <div className="form-field">
                    <label>{t("drivers.national_id")}</label>
                    <input type="text" value={form.national_id}
                      onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
                      placeholder={t("drivers.national_id_placeholder")} />
                  </div>
                  <div className="form-field">
                    <label>{t("drivers.joined_date")}</label>
                    <input type="date" value={form.joined_at}
                      onChange={e => setForm(f => ({ ...f, joined_at: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>{t('drivers.status_label')}</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_META).map(([k, m]) => (
                        <option key={k} value={k}>{t(`drivers.status.${k}`, { defaultValue: m.label })}</option>
                      ))}
                    </select>
                  </div>
                  {!selected && (
                    <div className="form-field">
                      <label>{t('common.password') || 'Password'}</label>
                      <input type="password" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder={t("drivers.password_placeholder")} />
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                <div className="form-section-title" style={{ marginTop: '1.5rem' }}>
                  <Car width={15} height={15} style={{ verticalAlign: 'middle', [isRTL?'marginLeft':'marginRight']: 6 }} />
                  {t('drivers.vehicle_info')}
                </div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>{t('drivers.vehicle_type')}</label>
                    <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                      {Object.entries(VEHICLE_META).map(([k, v]) => (
                        <option key={k} value={k}>{t(`drivers.vehicle.${k}`, { defaultValue: v.label })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>{t('drivers.plate_number')}</label>
                    <input type="text" value={form.vehicle_plate}
                      onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))}
                      placeholder="e.g. A 12345 Dubai" />
                  </div>
                  <div className="form-field">
                    <label>{t('drivers.vehicle_model_label')}</label>
                    <input type="text" value={form.vehicle_model}
                      onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))}
                      placeholder="e.g. Honda CB150" />
                  </div>
                  <div className="form-field">
                    <label>{t('drivers.vehicle_color_label')}</label>
                    <input type="text" value={form.vehicle_color}
                      onChange={e => setForm(f => ({ ...f, vehicle_color: e.target.value }))}
                      placeholder="e.g. Red" />
                  </div>
                  <div className="form-field">
                    <label>{t("drivers.license_number")}</label>
                    <input type="text" value={form.license_number}
                      onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                      placeholder={t("drivers.license_placeholder")} />
                  </div>
                  <div className="form-field">
                    <label>{t("drivers.assigned_zone")}</label>
                    <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                      <option value="">{t("drivers.no_zone_assigned")}</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name} — {z.emirate}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field span-2">
                    <label>{t('common.notes')}</label>
                    <textarea rows={3} value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={t("drivers.notes_placeholder")} />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline-action" onClick={closeForm}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary-action" disabled={saving}>
                  {saving ? t('common.loading') : selected ? t('drivers.update_driver') : t('drivers.add_driver')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Driver Credentials Modal ── */}
      {credentialsModal && (
        <div
          onClick={() => setCredentialsModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10,18,35,0.72)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'cred-fade-in 0.22s ease',
          }}
        >
          <style>{`
            @keyframes cred-fade-in { from { opacity:0 } to { opacity:1 } }
            @keyframes cred-slide-up { from { opacity:0; transform:translateY(28px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
            @keyframes cred-ring-pulse { 0%,100% { transform:scale(1); opacity:0.35 } 50% { transform:scale(1.18); opacity:0.12 } }
            @keyframes cred-check-pop { 0% { transform:scale(0) } 60% { transform:scale(1.15) } 100% { transform:scale(1) } }
            @keyframes cred-shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
            .cred-row-copy:hover { background: rgba(36,64,102,0.08) !important; }
            .cred-btn-copy:hover { background: #1e3a5f !important; }
            .cred-btn-close:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; }
          `}</style>

          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: '#fff',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.12)',
              animation: 'cred-slide-up 0.3s cubic-bezier(0.34,1.36,0.64,1)',
            }}
          >
            {/* ── Gradient header ── */}
            <div style={{
              background: 'linear-gradient(135deg, #0d2137 0%, #1a3d5c 50%, #0f4c2a 100%)',
              padding: '36px 28px 28px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative orbs */}
              <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(34,197,94,0.12)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(36,64,102,0.25)', pointerEvents:'none' }} />

              {/* Truck + check icon combo */}
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                {/* Pulsing ring */}
                <div style={{
                  position:'absolute', width:84, height:84, borderRadius:'50%',
                  border:'2px solid rgba(34,197,94,0.4)',
                  animation:'cred-ring-pulse 2s ease-in-out infinite',
                }} />
                <div style={{
                  position:'absolute', width:68, height:68, borderRadius:'50%',
                  border:'2px solid rgba(34,197,94,0.25)',
                  animation:'cred-ring-pulse 2s ease-in-out infinite 0.4s',
                }} />
                {/* Main icon circle */}
                <div style={{
                  width:58, height:58, borderRadius:'50%',
                  background:'linear-gradient(135deg, #16a34a, #22c55e)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 8px 24px rgba(34,197,94,0.45)',
                  animation:'cred-check-pop 0.5s cubic-bezier(0.34,1.36,0.64,1) 0.1s both',
                  position:'relative', zIndex:1,
                }}>
                  <Check width={28} height={28} color="#fff" strokeWidth={2.5} />
                </div>
                {/* Mini truck badge */}
                <div style={{
                  position:'absolute', bottom:-2, right:-4,
                  width:24, height:24, borderRadius:'50%',
                  background:'#f97316',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border:'2px solid #fff',
                  boxShadow:'0 2px 8px rgba(249,115,22,0.5)',
                  zIndex:2,
                }}>
                  <DeliveryTruck width={12} height={12} color="#fff" />
                </div>
              </div>

              <h3 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                {t('drivers.credentials.title')}
              </h3>
              <p style={{ margin:'6px 0 0', color:'rgba(255,255,255,0.62)', fontSize:'0.83rem', fontWeight:500 }}>
                {credentialsModal.isDefault
                  ? t('drivers.credentials.default_password')
                  : t('drivers.credentials.custom_password')}
              </p>
            </div>

            {/* ── Credential rows ── */}
            <div style={{ padding:'24px 24px 20px' }}>

              {/* Username row */}
              <div
                className="cred-row-copy"
                onClick={() => navigator.clipboard?.writeText(credentialsModal.username)}
                title="Click to copy"
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'13px 14px', borderRadius:14, marginBottom:10,
                  background:'#f8fafc', border:'1.5px solid #e2e8f0',
                  cursor:'pointer', transition:'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>
                    {t('drivers.credentials.username')}
                  </div>
                  <div style={{ fontSize:'1rem', fontWeight:700, fontFamily:'monospace', color:'#0f172a', letterSpacing:'0.03em' }}>
                    {credentialsModal.username}
                  </div>
                </div>
                <div style={{
                  width:30, height:30, borderRadius:8,
                  background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <Copy width={14} height={14} color="#64748b" />
                </div>
              </div>

              {/* Password row */}
              <div
                className="cred-row-copy"
                onClick={() => navigator.clipboard?.writeText(credentialsModal.password)}
                title="Click to copy"
                style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'13px 14px', borderRadius:14, marginBottom:16,
                  background: 'linear-gradient(135deg, #fff7ed, #fff)',
                  border:'1.5px solid #fed7aa',
                  cursor:'pointer', transition:'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>
                    {t('drivers.credentials.password')}
                  </div>
                  <div style={{ fontSize:'1rem', fontWeight:700, fontFamily:'monospace', color:'#0f172a', letterSpacing:'0.05em' }}>
                    {credentialsModal.password}
                  </div>
                </div>
                <div style={{
                  width:30, height:30, borderRadius:8,
                  background:'#fed7aa', display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>
                  <Copy width={14} height={14} color="#f97316" />
                </div>
              </div>

              {/* Warning strip */}
              {credentialsModal.isDefault && (
                <div style={{
                  background:'linear-gradient(135deg, #fff7ed, #fef3c7)',
                  border:'1px solid #fde68a', borderRadius:12,
                  padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start',
                  marginBottom:18,
                }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>🔑</span>
                  <p style={{ margin:0, fontSize:'0.78rem', color:'#92400e', lineHeight:1.55, fontWeight:500 }}>
                    {t('drivers.credentials.warning')}
                  </p>
                </div>
              )}

              {/* Copy & Close button */}
              <button
                className="cred-btn-copy"
                onClick={() => {
                  const text = `Username: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`;
                  navigator.clipboard?.writeText(text);
                  setCredentialsModal(null);
                }}
                style={{
                  width:'100%', padding:'13px',
                  background:'linear-gradient(135deg, #244066, #1a3d5c)',
                  color:'#fff', border:'none', borderRadius:14,
                  fontSize:'0.9rem', fontWeight:700, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow:'0 4px 16px rgba(36,64,102,0.35)',
                  transition:'background 0.15s',
                }}
              >
                <Copy width={15} height={15} /> {t('drivers.credentials.copy_close')}
              </button>

              {/* Close only */}
              <button
                className="cred-btn-close"
                onClick={() => setCredentialsModal(null)}
                style={{
                  width:'100%', padding:'11px',
                  background:'transparent', color:'#64748b',
                  border:'1.5px solid #e2e8f0', borderRadius:14,
                  fontSize:'0.85rem', fontWeight:600, cursor:'pointer',
                  marginTop:8, transition:'background 0.15s, border-color 0.15s',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
