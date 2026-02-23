import { useState, useEffect, useContext, useRef } from 'react';
import {
  Package, Plus, Search, XmarkCircle, Eye, EditPencil, DeliveryTruck,
  Check, Xmark, ArrowLeft, ArrowRight, Filter,
  Clock, MapPin, User, Phone, DollarCircle,
  Weight, Prohibition, Refresh
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import LocationPicker from '../components/LocationPicker';
import MapView from '../components/MapView';
import './CRMPages.css';

/* ─── Constants ─────────────────────────────────────────────── */
const STATUS_META = {
  pending:    { label: 'Pending',    bg: '#fef3c7', color: '#d97706' },
  confirmed:  { label: 'Confirmed',  bg: '#dbeafe', color: '#2563eb' },
  assigned:   { label: 'Assigned',   bg: '#ede9fe', color: '#7c3aed' },
  picked_up:  { label: 'Picked Up',  bg: '#fce7f3', color: '#be185d' },
  in_transit: { label: 'In Transit', bg: '#e0f2fe', color: '#0369a1' },
  delivered:  { label: 'Delivered',  bg: '#dcfce7', color: '#16a34a' },
  failed:     { label: 'Failed',     bg: '#fee2e2', color: '#dc2626' },
  returned:   { label: 'Returned',   bg: '#fff7ed', color: '#ea580c' },
  cancelled:  { label: 'Cancelled',  bg: '#f1f5f9', color: '#64748b' },
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

/* ─── Sub-components ─────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className="status-badge" style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
};

const SkeletonRows = () => (
  <>
    {[1,2,3,4,5].map(i => (
      <tr key={i}>
        {Array(9).fill(0).map((_, j) => (
          <td key={j} style={{ padding: '14px 16px' }}>
            <div className="skeleton-card" style={{ height: 16, borderRadius: 4, width: j === 0 ? 80 : j === 2 ? 120 : 60 }} />
          </td>
        ))}
      </tr>
    ))}
  </>
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
  const [summary,    setSummary]    = useState({});
  const searchRef = useRef(null);

  useEffect(() => { fetchOrders(); }, [pagination.page, filters]);
  useEffect(() => { fetchDropdowns(); }, []);

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
        buildSummary(res.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const buildSummary = (data) => {
    const s = {};
    data.forEach(o => { s[o.status] = (s[o.status] || 0) + 1; });
    setSummary(s);
  };

  const fetchDropdowns = async () => {
    try {
      const [zRes, cRes] = await Promise.all([api.get('/zones'), api.get('/clients?limit=200')]);
      if (zRes.success) setZones(zRes.data || []);
      if (cRes.success) setClients(cRes.data || []);
    } catch (e) { console.error(e); }
  };

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

  const openNew = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

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
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelected(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const clearFilters = () => setFilters({ status: '', search: '', date_from: '', date_to: '' });
  const hasFilters   = filters.status || filters.search || filters.date_from || filters.date_to;
  const totalPages   = Math.ceil(pagination.total / pagination.limit);
  const fmtDate      = d => d ? new Date(d).toLocaleDateString('en-AE', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtAED       = v => v ? `AED ${parseFloat(v).toFixed(2)}` : '—';

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

      {/* ── Summary chips ── */}
      {!loading && Object.keys(summary).length > 0 && (
        <div className="orders-summary-bar">
          {Object.entries(STATUS_META)
            .filter(([k]) => summary[k])
            .map(([k, m]) => (
              <button
                key={k}
                className={`summary-chip ${filters.status === k ? 'active' : ''}`}
                style={{ '--chip-color': m.color, '--chip-bg': m.bg }}
                onClick={() => setFilters(f => ({ ...f, status: f.status === k ? '' : k }))}
              >
                <span className="chip-dot" style={{ background: m.color }} />
                {m.label}
                <span className="chip-count">{summary[k]}</span>
              </button>
            ))
          }
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div className="search-box">
          <Search width={15} height={15} className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search order #, recipient, phone..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="search-input"
          />
          {filters.search && (
            <button className="search-clear" onClick={() => setFilters(f => ({ ...f, search: '' }))}>
              <XmarkCircle width={15} height={15} />
            </button>
          )}
        </div>
        <select
          className="filter-select"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
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

      {/* ── Table ── */}
      <div className="table-responsive">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Recipient</th>
              <th>Zone / Emirate</th>
              <th>Type</th>
              <th>Status</th>
              <th>Fee / COD</th>
              <th>Driver</th>
              <th>Date</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows /> :
             orders.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state-mini" style={{ padding: '3.5rem 0' }}>
                    <Package width={48} height={48} />
                    <p style={{ fontWeight: 600, fontSize: '1rem', marginTop: 12 }}>No orders found</p>
                    <p style={{ margin: '4px 0 16px' }}>
                      {hasFilters ? 'Try adjusting your filters' : 'Create your first order to get started'}
                    </p>
                    {!hasFilters && (
                      <button className="btn-primary-action" onClick={openNew}>
                        <Plus width={16} height={16} /> New Order
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>{order.order_number}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace', marginTop: 2 }}>
                      {order.tracking_token}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{order.recipient_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{order.recipient_phone}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{order.zone_name || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{order.recipient_emirate}</div>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#f1f5f9', color: 'var(--gray-600)' }}>
                      {order.order_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="inline-status-select"
                      style={{
                        background: STATUS_META[order.status]?.bg || '#f1f5f9',
                        color:      STATUS_META[order.status]?.color || '#64748b',
                      }}
                    >
                      {Object.entries(STATUS_META).map(([k, m]) => (
                        <option key={k} value={k}>{m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{fmtAED(order.delivery_fee)}</div>
                    {order.cod_amount > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>COD {fmtAED(order.cod_amount)}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: order.driver_name ? 'var(--gray-700)' : 'var(--gray-400)' }}>
                      {order.driver_name || 'Unassigned'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{fmtDate(order.created_at)}</div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn view"   title="View"  onClick={() => setViewOrder(order)}><Eye width={14} height={14} /></button>
                      <button className="action-btn edit"   title="Edit"  onClick={() => openEdit(order)}><EditPencil width={14} height={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          >
            <ArrowLeft width={14} height={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = pagination.page <= 4 ? i + 1 :
                      pagination.page >= totalPages - 3 ? totalPages - 6 + i :
                      pagination.page - 3 + i;
            return p >= 1 && p <= totalPages ? (
              <button
                key={p}
                className={`page-btn ${pagination.page === p ? 'active' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              >
                {p}
              </button>
            ) : null;
          })}
          <button
            className="page-btn"
            disabled={pagination.page === totalPages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          >
            <ArrowRight width={14} height={14} />
          </button>
          <span className="page-info">
            {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
        </div>
      )}

      {/* ── View Drawer ── */}
      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="modal-container" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{viewOrder.order_number}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                  Tracking: {viewOrder.tracking_token}
                </p>
              </div>
              <button className="modal-close" onClick={() => setViewOrder(null)}><Xmark width={18} height={18} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <StatusBadge status={viewOrder.status} />
                </div>
                <div className="detail-row">
                  <span className="detail-label"><User width={14} height={14} /> Recipient</span>
                  <span className="detail-value">{viewOrder.recipient_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><Phone width={14} height={14} /> Phone</span>
                  <span className="detail-value">{viewOrder.recipient_phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><MapPin width={14} height={14} /> Address</span>
                  <span className="detail-value">{viewOrder.recipient_address}</span>
                </div>
                {viewOrder.recipient_lat && viewOrder.recipient_lng && (
                  <div style={{ margin: '8px 0 12px', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                    <MapView
                      markers={[{
                        lat: parseFloat(viewOrder.recipient_lat),
                        lng: parseFloat(viewOrder.recipient_lng),
                        type: 'delivery',
                        label: viewOrder.recipient_name,
                        popup: `<strong>${viewOrder.recipient_name}</strong><br/>${viewOrder.recipient_address || ''}`
                      }]}
                      height={180}
                      zoom={15}
                    />
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label"><MapPin width={14} height={14} /> Zone</span>
                  <span className="detail-value">{viewOrder.zone_name || '—'} ({viewOrder.recipient_emirate})</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><DeliveryTruck width={14} height={14} /> Driver</span>
                  <span className="detail-value">{viewOrder.driver_name || 'Unassigned'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label"><DollarCircle width={14} height={14} /> Fee</span>
                  <span className="detail-value">{fmtAED(viewOrder.delivery_fee)}</span>
                </div>
                {viewOrder.cod_amount > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">COD Amount</span>
                    <span className="detail-value" style={{ color: 'var(--warning)', fontWeight: 600 }}>{fmtAED(viewOrder.cod_amount)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{viewOrder.order_type?.replace('_', ' ')}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payment</span>
                    <span className="detail-value">{PAYMENT_LABELS[viewOrder.payment_method] || viewOrder.payment_method}</span>
                </div>
                {viewOrder.weight_kg && (
                  <div className="detail-row">
                    <span className="detail-label"><Weight width={14} height={14} /> Weight</span>
                    <span className="detail-value">{viewOrder.weight_kg} kg</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label"><Clock width={14} height={14} /> Created</span>
                  <span className="detail-value">{fmtDate(viewOrder.created_at)}</span>
                </div>
                {viewOrder.notes && (
                  <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                    <span className="detail-label">Notes</span>
                    <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{viewOrder.notes}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline-action" onClick={() => setViewOrder(null)}>Close</button>
              <button className="btn-primary-action" onClick={() => { setViewOrder(null); openEdit(viewOrder); }}>
                <EditPencil width={14} height={14} /> Edit Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-container large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected ? `Edit Order — ${selected.order_number}` : 'New Order'}</h3>
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
                        lat={form.recipient_lat}
                        lng={form.recipient_lng}
                        address={form.recipient_address}
                        markerType="delivery"
                        height={220}
                        onChange={({ lat, lng, address }) =>
                          setForm(f => ({ ...f, recipient_lat: lat, recipient_lng: lng, recipient_address: address }))
                        }
                      />
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
                      {zones.filter(z => z.is_active).map(z => <option key={z.id} value={z.id}>{z.name} — {z.emirate}</option>)}
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
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Order Type</label>
                    <select value={form.order_type}
                      onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}>
                      {ORDER_TYPES.map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Payment Method</label>
                    <select value={form.payment_method}
                      onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {['cod', 'prepaid', 'credit', 'wallet'].map(p => (
                        <option key={p} value={p}>{PAYMENT_LABELS[p] || p}</option>
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
