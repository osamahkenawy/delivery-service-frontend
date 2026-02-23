import { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  Package, Plus, Search, XmarkCircle, Eye, EditPencil, DeliveryTruck,
  Check, Xmark, ArrowLeft, ArrowRight, Filter, Copy,
  Clock, MapPin, User, Phone, DollarCircle,
  Weight, Prohibition, Refresh, Calendar, Box3dPoint,
  Hashtag, CreditCard, NavArrowDown
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import LocationPicker from '../components/LocationPicker';
import MapView from '../components/MapView';
import './CRMPages.css';

/* ─── Constants ─────────────────────────────────────────────── */
const STATUS_META = {
  pending:    { label: 'Pending',    bg: '#fef3c7', color: '#d97706', icon: Clock },
  confirmed:  { label: 'Confirmed',  bg: '#dbeafe', color: '#2563eb', icon: Check },
  assigned:   { label: 'Assigned',   bg: '#ede9fe', color: '#7c3aed', icon: User },
  picked_up:  { label: 'Picked Up',  bg: '#fce7f3', color: '#be185d', icon: Package },
  in_transit: { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1', icon: DeliveryTruck },
  delivered:  { label: 'Delivered',  bg: '#dcfce7', color: '#16a34a', icon: Check },
  failed:     { label: 'Failed',     bg: '#fee2e2', color: '#dc2626', icon: Xmark },
  returned:   { label: 'Returned',   bg: '#fff7ed', color: '#ea580c', icon: ArrowLeft },
  cancelled:  { label: 'Cancelled',  bg: '#f1f5f9', color: '#64748b', icon: Prohibition },
};
const ORDER_TYPES  = ['standard', 'express', 'same_day', 'scheduled', 'return'];
const EMIRATES     = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
const PAYMENT_LABELS = { cod: 'Cash on Delivery', prepaid: 'Prepaid', credit: 'Credit Card', wallet: 'Wallet' };
const EMPTY_FORM   = {
  client_id: '', zone_id: '', order_type: 'standard', payment_method: 'cod',
  recipient_name: '', recipient_phone: '', recipient_address: '',
  recipient_emirate: 'Dubai', recipient_lat: '', recipient_lng: '',
  cod_amount: '', weight_kg: '', notes: '',
};

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day:'2-digit', month:'short', year:'numeric' }) : '\u2014';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' }) : '';
const fmtAED  = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `AED ${n.toFixed(2)}` : '\u2014'; };
const fmtType = t => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '\u2014';

/* ─── Sub-components ─────────────────────────────────────────── */
const StatusBadge = ({ status, size = 'sm' }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className={`ord-status-badge ${size}`} style={{ background: m.bg, color: m.color }}>
      <Icon width={size === 'lg' ? 14 : 11} height={size === 'lg' ? 14 : 11} />
      {m.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="ord-stat-card">
    <div className="ord-stat-icon" style={{ background: accent + '18', color: accent }}>
      <Icon width={18} height={18} />
    </div>
    <div className="ord-stat-info">
      <div className="ord-stat-value">{value}</div>
      <div className="ord-stat-label">{label}</div>
    </div>
  </div>
);

const SkeletonCards = () => (
  <div className="ord-grid">
    {[1,2,3,4].map(i => (
      <div key={i} className="ord-card skeleton-pulse" style={{ height: 180 }} />
    ))}
  </div>
);

/* ─── Main component ─────────────────────────────────────────── */
export default function Orders() {
  const { user } = useContext(AuthContext);
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });
  const [filters,    setFilters]    = useState({ status: '', search: '', date_from: '', date_to: '' });
  const [showForm,   setShowForm]   = useState(false);
  const [viewOrder,  setViewOrder]  = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [zones,      setZones]      = useState([]);
  const [clients,    setClients]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState('');
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { fetchOrders(); }, [pagination.page, filters.status, filters.date_from, filters.date_to]);
  useEffect(() => { fetchDropdowns(); }, []);

  /* Debounced search */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(), 350);
    return () => clearTimeout(debounceRef.current);
  }, [filters.search]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
      if (filters.status)    params.append('status',    filters.status);
      if (filters.search)    params.append('search',    filters.search);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to)   params.append('date_to',   filters.date_to);
      const res = await api.get(`/orders?${params}`);
      if (res.success) {
        setOrders(res.data || []);
        setPagination(p => ({ ...p, total: res.pagination?.total || res.total || 0 }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDropdowns = async () => {
    try {
      const [zRes, cRes] = await Promise.all([api.get('/zones'), api.get('/clients?limit=200')]);
      if (zRes.success) setZones(zRes.data || []);
      if (cRes.success) setClients(cRes.data || []);
    } catch (e) { console.error(e); }
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const s = { total: orders.length, pending: 0, in_transit: 0, delivered: 0 };
    orders.forEach(o => {
      if (o.status === 'pending') s.pending++;
      if (o.status === 'in_transit') s.in_transit++;
      if (o.status === 'delivered') s.delivered++;
    });
    return s;
  }, [orders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = selected
        ? await api.put(`/orders/${selected.id}`, form)
        : await api.post('/orders', form);
      if (res.success) {
        closeForm();
        fetchOrders();
      } else {
        setError(res.message || 'Failed to save');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (e) { console.error(e); }
  };

  const openNew = () => { setSelected(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit = (order) => {
    setSelected(order);
    setForm({
      client_id:        order.client_id        || '',
      zone_id:          order.zone_id          || '',
      order_type:       order.order_type       || 'standard',
      payment_method:   order.payment_method   || 'cod',
      recipient_name:   order.recipient_name   || '',
      recipient_phone:  order.recipient_phone  || '',
      recipient_address:order.recipient_address|| '',
      recipient_emirate:order.recipient_emirate|| 'Dubai',
      recipient_lat:    order.recipient_lat    || '',
      recipient_lng:    order.recipient_lng    || '',
      cod_amount:       order.cod_amount       || '',
      weight_kg:        order.weight_kg        || '',
      notes:            order.notes            || '',
    });
    setError(''); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setSelected(null); setForm(EMPTY_FORM); setError(''); };
  const copyToken = (token) => {
    navigator.clipboard.writeText(token).then(() => { setCopied(token); setTimeout(() => setCopied(''), 1500); });
  };

  const clearFilters = () => setFilters({ status: '', search: '', date_from: '', date_to: '' });
  const hasFilters   = filters.status || filters.search || filters.date_from || filters.date_to;
  const totalPages   = Math.ceil(pagination.total / pagination.limit);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Orders</h2>
          <p className="page-subheading">
            {pagination.total > 0 ? `${pagination.total} total orders` : 'Manage all delivery orders'}
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-outline-action" onClick={fetchOrders}>
            <Refresh width={15} height={15} /> Refresh
          </button>
          <button className="btn-primary-action" onClick={openNew}>
            <Plus width={16} height={16} /> New Order
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {!loading && orders.length > 0 && (
        <div className="ord-stats-row">
          <StatCard icon={Package} label="Total Orders" value={pagination.total} accent="#244066" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} accent="#d97706" />
          <StatCard icon={DeliveryTruck} label="In Transit" value={stats.in_transit} accent="#0369a1" />
          <StatCard icon={Check} label="Delivered" value={stats.delivered} accent="#16a34a" />
        </div>
      )}

      {/* ── Status filter chips ── */}
      <div className="orders-summary-bar">
        <button
          className={`summary-chip ${!filters.status ? 'active' : ''}`}
          style={{ '--chip-color':'#244066', '--chip-bg':'#eff6ff' }}
          onClick={() => setFilters(f => ({ ...f, status: '' }))}
        >All</button>
        {Object.entries(STATUS_META).map(([k, m]) => (
          <button key={k}
            className={`summary-chip ${filters.status === k ? 'active' : ''}`}
            style={{ '--chip-color': m.color, '--chip-bg': m.bg }}
            onClick={() => setFilters(f => ({ ...f, status: f.status === k ? '' : k }))}
          >
            <span className="chip-dot" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="search-box">
          <Search width={15} height={15} className="search-icon" />
          <input ref={searchRef} type="text"
            placeholder="Search order #, recipient, phone..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="search-input" />
          {filters.search && (
            <button className="search-clear" onClick={() => setFilters(f => ({ ...f, search: '' }))}>
              <XmarkCircle width={15} height={15} />
            </button>
          )}
        </div>
        <input type="date" className="filter-date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        <span className="date-sep">to</span>
        <input type="date" className="filter-date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        {hasFilters && (
          <button className="btn-outline-action" onClick={clearFilters}>
            <Xmark width={14} height={14} /> Clear
          </button>
        )}
      </div>

      {/* ── Orders Grid ── */}
      {loading ? <SkeletonCards /> : orders.length === 0 ? (
        <div className="ord-empty">
          <div className="ord-empty-icon"><Package width={48} height={48} /></div>
          <h3>No orders found</h3>
          <p>{hasFilters ? 'Try adjusting your filters' : 'Create your first order to get started'}</p>
          {!hasFilters && (
            <button className="btn-primary-action" onClick={openNew}>
              <Plus width={16} height={16} /> New Order
            </button>
          )}
        </div>
      ) : (
        <div className="ord-grid">
          {orders.map(order => {
            const sm = STATUS_META[order.status] || STATUS_META.pending;
            return (
              <div key={order.id} className="ord-card" onClick={() => setViewOrder(order)}>
                {/* Card accent bar */}
                <div className="ord-card-accent" style={{ background: sm.color }} />

                {/* Top: order number + status */}
                <div className="ord-card-header">
                  <div>
                    <div className="ord-card-number">{order.order_number}</div>
                    <div className="ord-card-token">{order.tracking_token}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Recipient info */}
                <div className="ord-card-recipient">
                  <div className="ord-card-avatar" style={{ background: sm.bg, color: sm.color }}>
                    {order.recipient_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="ord-card-recipient-info">
                    <div className="ord-card-name">{order.recipient_name}</div>
                    <div className="ord-card-phone">{order.recipient_phone}</div>
                  </div>
                </div>

                {/* Details row */}
                <div className="ord-card-details">
                  <div className="ord-card-detail">
                    <MapPin width={12} height={12} />
                    <span>{order.zone_name || order.recipient_emirate}</span>
                  </div>
                  <div className="ord-card-detail">
                    <Box3dPoint width={12} height={12} />
                    <span>{fmtType(order.order_type)}</span>
                  </div>
                  {parseFloat(order.delivery_fee) > 0 && (
                    <div className="ord-card-detail fee">
                      <DollarCircle width={12} height={12} />
                      <span>{fmtAED(order.delivery_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="ord-card-footer">
                  <div className="ord-card-date">
                    <Calendar width={11} height={11} />
                    {fmtDate(order.created_at)}
                  </div>
                  <div className="ord-card-driver">
                    <DeliveryTruck width={12} height={12} />
                    <span>{order.driver_name || 'Unassigned'}</span>
                  </div>
                  <div className="ord-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn edit" title="Edit" onClick={() => openEdit(order)}>
                      <EditPencil width={13} height={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button className="page-btn" disabled={pagination.page === 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
            <ArrowLeft width={14} height={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = pagination.page <= 4 ? i + 1 :
                      pagination.page >= totalPages - 3 ? totalPages - 6 + i :
                      pagination.page - 3 + i;
            return p >= 1 && p <= totalPages ? (
              <button key={p} className={`page-btn ${pagination.page === p ? 'active' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, page: p }))}>{p}</button>
            ) : null;
          })}
          <button className="page-btn" disabled={pagination.page === totalPages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
            <ArrowRight width={14} height={14} />
          </button>
          <span className="page-info">
            {((pagination.page - 1) * pagination.limit) + 1}--{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         VIEW ORDER DRAWER
         ══════════════════════════════════════════════════════════ */}
      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="ord-drawer" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="ord-drawer-header">
              <div className="ord-drawer-header-text">
                <h3>{viewOrder.order_number}</h3>
                <button className="ord-copy-btn" onClick={() => copyToken(viewOrder.tracking_token)}
                  title="Copy tracking token">
                  <span>{viewOrder.tracking_token}</span>
                  <Copy width={12} height={12} />
                  {copied === viewOrder.tracking_token && <span className="ord-copied">Copied!</span>}
                </button>
              </div>
              <button className="modal-close" onClick={() => setViewOrder(null)}><Xmark width={18} height={18} /></button>
            </div>

            <div className="ord-drawer-body">
              {/* Status + quick change */}
              <div className="ord-view-section">
                <div className="ord-view-status-row">
                  <StatusBadge status={viewOrder.status} size="lg" />
                  <select value={viewOrder.status}
                    onChange={e => { handleStatusChange(viewOrder.id, e.target.value); setViewOrder(v => ({ ...v, status: e.target.value })); }}
                    className="inline-status-select ord-status-change"
                    style={{ background: STATUS_META[viewOrder.status]?.bg, color: STATUS_META[viewOrder.status]?.color }}>
                    {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Recipient card */}
              <div className="ord-view-section">
                <div className="ord-view-section-title"><User width={14} height={14} /> Recipient</div>
                <div className="ord-view-card">
                  <div className="ord-view-row">
                    <span className="ord-view-label">Name</span>
                    <span className="ord-view-value bold">{viewOrder.recipient_name}</span>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Phone</span>
                    <a href={`tel:${viewOrder.recipient_phone}`} className="ord-view-value link">{viewOrder.recipient_phone}</a>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Address</span>
                    <span className="ord-view-value">{viewOrder.recipient_address || '\u2014'}</span>
                  </div>
                </div>
                {viewOrder.recipient_lat && viewOrder.recipient_lng && (
                  <div className="ord-view-map">
                    <MapView
                      markers={[{
                        lat: parseFloat(viewOrder.recipient_lat),
                        lng: parseFloat(viewOrder.recipient_lng),
                        type: 'delivery',
                        label: viewOrder.recipient_name,
                        popup: `<strong>${viewOrder.recipient_name}</strong><br/>${viewOrder.recipient_address || ''}`
                      }]}
                      height={160} zoom={15}
                    />
                  </div>
                )}
              </div>

              {/* Delivery info */}
              <div className="ord-view-section">
                <div className="ord-view-section-title"><DeliveryTruck width={14} height={14} /> Delivery</div>
                <div className="ord-view-card">
                  <div className="ord-view-row">
                    <span className="ord-view-label">Zone</span>
                    <span className="ord-view-value">{viewOrder.zone_name || '\u2014'}</span>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Emirate</span>
                    <span className="ord-view-value">{viewOrder.recipient_emirate}</span>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Driver</span>
                    <span className={'ord-view-value ' + (viewOrder.driver_name ? 'bold' : 'muted')}>{viewOrder.driver_name || 'Unassigned'}</span>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Type</span>
                    <span className="ord-view-value">{fmtType(viewOrder.order_type)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="ord-view-section">
                <div className="ord-view-section-title"><DollarCircle width={14} height={14} /> Payment</div>
                <div className="ord-view-card">
                  <div className="ord-view-row">
                    <span className="ord-view-label">Method</span>
                    <span className="ord-view-value">{PAYMENT_LABELS[viewOrder.payment_method] || viewOrder.payment_method}</span>
                  </div>
                  <div className="ord-view-row">
                    <span className="ord-view-label">Delivery Fee</span>
                    <span className="ord-view-value bold">{fmtAED(viewOrder.delivery_fee)}</span>
                  </div>
                  {parseFloat(viewOrder.cod_amount) > 0 && (
                    <div className="ord-view-row">
                      <span className="ord-view-label">COD Amount</span>
                      <span className="ord-view-value" style={{ color: '#d97706', fontWeight: 600 }}>{fmtAED(viewOrder.cod_amount)}</span>
                    </div>
                  )}
                  {viewOrder.weight_kg && (
                    <div className="ord-view-row">
                      <span className="ord-view-label">Weight</span>
                      <span className="ord-view-value">{parseFloat(viewOrder.weight_kg).toFixed(1)} kg</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="ord-view-section">
                <div className="ord-view-card subtle">
                  <div className="ord-view-row">
                    <span className="ord-view-label">Created</span>
                    <span className="ord-view-value">{fmtDate(viewOrder.created_at)} {fmtTime(viewOrder.created_at)}</span>
                  </div>
                  {viewOrder.notes && (
                    <div className="ord-view-row" style={{ alignItems: 'flex-start' }}>
                      <span className="ord-view-label">Notes</span>
                      <span className="ord-view-value" style={{ whiteSpace: 'pre-wrap' }}>{viewOrder.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="ord-drawer-footer">
              <button className="btn-outline-action" onClick={() => setViewOrder(null)}>Close</button>
              <button className="btn-primary-action" onClick={() => { setViewOrder(null); openEdit(viewOrder); }}>
                <EditPencil width={14} height={14} /> Edit Order
              </button>
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
              <h3>{selected ? `Edit Order \u2014 ${selected.order_number}` : 'New Order'}</h3>
              <button className="modal-close" onClick={closeForm}><Xmark width={18} height={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert-error" style={{ marginBottom: '1rem' }}>
                    <Prohibition width={16} height={16} /> {error}
                  </div>
                )}

                <div className="form-section-title">Recipient</div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Recipient Name *</label>
                    <input required type="text" value={form.recipient_name}
                      onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                      placeholder="Full name" />
                  </div>
                  <div className="form-field">
                    <label>Phone *</label>
                    <input required type="text" value={form.recipient_phone}
                      onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
                      placeholder="+971 50 000 0000" />
                  </div>
                  <div className="form-field span-2">
                    <label>Delivery Address *</label>
                    <div className="form-map-wrapper">
                      <LocationPicker
                        lat={form.recipient_lat} lng={form.recipient_lng}
                        address={form.recipient_address} markerType="delivery" height={220}
                        onChange={({ lat, lng, address }) =>
                          setForm(f => ({ ...f, recipient_lat: lat, recipient_lng: lng, recipient_address: address }))} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Emirate</label>
                    <select value={form.recipient_emirate}
                      onChange={e => setForm(f => ({ ...f, recipient_emirate: e.target.value }))}>
                      {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Zone *</label>
                    <select required value={form.zone_id}
                      onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                      <option value="">Select zone...</option>
                      {zones.filter(z => z.is_active).map(z => (
                        <option key={z.id} value={z.id}>{z.name} {'\u2014'} {z.emirate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-section-title" style={{ marginTop: '1.25rem' }}>Order Details</div>
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Client</label>
                    <select value={form.client_id}
                      onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                      <option value="">No client (walk-in)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Order Type</label>
                    <select value={form.order_type}
                      onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}>
                      {ORDER_TYPES.map(t => <option key={t} value={t}>{fmtType(t)}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Payment Method</label>
                    <select value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {['cod', 'prepaid', 'credit', 'wallet'].map(p => (
                        <option key={p} value={p}>{PAYMENT_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>COD Amount (AED)</label>
                    <input type="number" min="0" step="0.01" value={form.cod_amount}
                      onChange={e => setForm(f => ({ ...f, cod_amount: e.target.value }))}
                      placeholder="0.00" />
                  </div>
                  <div className="form-field">
                    <label>Weight (kg)</label>
                    <input type="number" min="0" step="0.1" value={form.weight_kg}
                      onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                      placeholder="0.0" />
                  </div>
                  <div className="form-field span-2">
                    <label>Notes</label>
                    <textarea rows={3} value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Special instructions, landmarks, etc..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-action" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn-primary-action" disabled={saving}>
                  {saving ? 'Saving...' : selected ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
