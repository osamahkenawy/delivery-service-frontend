import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshDouble, Search, Plus, Eye, Check, Xmark,
  Package, Clock, WarningCircle, DeliveryTruck,
  ArrowDown, User, Phone, Calendar, EditPencil, MapPin
} from 'iconoir-react';
import { api } from '../lib/api';
import './Returns.css';

const RETURN_STATUS_LABELS = {
  requested: 'Requested', approved: 'Approved', pickup_scheduled: 'Pickup Scheduled',
  picked_up: 'Picked Up', received: 'Received', refunded: 'Refunded',
  rejected: 'Rejected', cancelled: 'Cancelled'
};

const RETURN_REASONS = [
  'Damaged item', 'Wrong item delivered', 'Item not as described',
  'Customer changed mind', 'Defective product', 'Missing parts',
  'Duplicate order', 'Late delivery', 'Other'
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const emptyForm = {
  order_id: '', reason: '', notes: '', pickup_address: '', pickup_date: ''
};

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [returnsRes, ordersRes] = await Promise.all([
        api.get(`/returns${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/orders?status=delivered&limit=200')
      ]);
      setReturns(returnsRes?.data || []);
      setOrders(ordersRes?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const s = { total: returns.length, requested: 0, approved: 0, in_progress: 0, completed: 0, rejected: 0 };
    returns.forEach(r => {
      if (r.status === 'requested') s.requested++;
      else if (r.status === 'approved' || r.status === 'pickup_scheduled') s.approved++;
      else if (r.status === 'picked_up') s.in_progress++;
      else if (r.status === 'received' || r.status === 'refunded') s.completed++;
      else if (r.status === 'rejected' || r.status === 'cancelled') s.rejected++;
    });
    return s;
  }, [returns]);

  const filtered = useMemo(() => {
    let list = returns;
    if (activeTab === 'pending') list = list.filter(r => r.status === 'requested');
    else if (activeTab === 'active') list = list.filter(r => ['approved','pickup_scheduled','picked_up'].includes(r.status));
    else if (activeTab === 'completed') list = list.filter(r => ['received','refunded'].includes(r.status));
    else if (activeTab === 'rejected') list = list.filter(r => ['rejected','cancelled'].includes(r.status));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.order_number?.toLowerCase().includes(s) ||
        r.recipient_name?.toLowerCase().includes(s) ||
        r.reason?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [returns, activeTab, search]);

  const handleSubmit = async () => {
    if (!form.order_id || !form.reason) return;
    setSaving(true);
    try {
      const res = await api.post('/returns', form);
      if (res?.success) {
        setShowModal(false);
        setForm({ ...emptyForm });
        loadData();
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/returns/${id}/status`, { status: action });
      loadData();
    } catch (err) { console.error(err); }
  };

  const statCards = [
    { label: 'TOTAL RETURNS', value: stats.total, color: 'primary', bg: '#fff7ed', iconColor: '#f97316', icon: RefreshDouble },
    { label: 'PENDING', value: stats.requested, color: 'warning', bg: '#fef3c7', iconColor: '#d97706', icon: Clock },
    { label: 'IN PROGRESS', value: stats.approved + stats.in_progress, color: 'info', bg: '#eff6ff', iconColor: '#2563eb', icon: DeliveryTruck },
    { label: 'COMPLETED', value: stats.completed, color: 'success', bg: '#dcfce7', iconColor: '#16a34a', icon: Check },
    { label: 'REJECTED', value: stats.rejected, color: 'danger', bg: '#fee2e2', iconColor: '#ef4444', icon: Xmark },
  ];

  return (
    <div className="ret-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><RefreshDouble size={26} /></div>
          <div>
            <h1 className="module-hero-title">Returns Management</h1>
            <p className="module-hero-sub">Handle return requests, pickups, and refunds</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Return
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ret-stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className={`ret-stat-card ${s.color}`}>
            <div className="ret-stat-card-row">
              <div className="ret-stat-icon" style={{ background: s.bg }}>
                <s.icon size={22} color={s.iconColor} />
              </div>
              <div className="ret-stat-body">
                <span className="ret-stat-val">{s.value}</span>
                <span className="ret-stat-lbl">{s.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="ret-tabs">
        {[
          { key: 'all', label: 'All Returns', count: stats.total },
          { key: 'pending', label: 'Pending', count: stats.requested },
          { key: 'active', label: 'In Progress', count: stats.approved + stats.in_progress },
          { key: 'completed', label: 'Completed', count: stats.completed },
          { key: 'rejected', label: 'Rejected', count: stats.rejected },
        ].map(t => (
          <button key={t.key} className={`ret-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            <span className="ret-tab-badge">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="ret-filters">
        <div className="ret-search-wrap">
          <Search size={16} className="ret-search-icon" />
          <input className="ret-search-input" placeholder="Search returns..."
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="ret-spinner" />
      ) : filtered.length === 0 ? (
        <div className="ret-empty">
          <div className="ret-empty-icon"><RefreshDouble size={28} /></div>
          <h3>No Returns Found</h3>
          <p>No return requests match your criteria</p>
        </div>
      ) : (
        <div className="ret-table-wrap">
          <table className="ret-table">
            <thead>
              <tr>
                <th>Return ID</th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ret => (
                <tr key={ret.id} onClick={() => setShowDetail(ret)}>
                  <td style={{ fontWeight: 700, color: '#f97316', fontFamily: 'monospace' }}>
                    RET-{String(ret.id).padStart(4, '0')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                    {ret.order_number || `#${ret.order_id}`}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{ret.recipient_name || '—'}</span>
                  </td>
                  <td>
                    <span className="ret-reason-tag">{ret.reason}</span>
                  </td>
                  <td>
                    <span className={`ret-status ${ret.status}`}>
                      <span className="ret-status-dot" />
                      {RETURN_STATUS_LABELS[ret.status] || ret.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDate(ret.created_at)}
                  </td>
                  <td>
                    <div className="ret-actions" onClick={e => e.stopPropagation()}>
                      <button className="ret-action-btn" onClick={() => setShowDetail(ret)} title="View">
                        <Eye size={14} />
                      </button>
                      {ret.status === 'requested' && (
                        <>
                          <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'approved')} title="Approve">
                            <Check size={14} />
                          </button>
                          <button className="ret-action-btn reject" onClick={() => handleAction(ret.id, 'rejected')} title="Reject">
                            <Xmark size={14} />
                          </button>
                        </>
                      )}
                      {ret.status === 'approved' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'pickup_scheduled')} title="Schedule Pickup">
                          <DeliveryTruck size={14} />
                        </button>
                      )}
                      {ret.status === 'pickup_scheduled' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'picked_up')} title="Mark Picked Up">
                          <Package size={14} />
                        </button>
                      )}
                      {ret.status === 'picked_up' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'received')} title="Mark Received">
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Return Modal */}
      {showModal && (
        <div className="ret-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ret-modal" onClick={e => e.stopPropagation()}>
            <div className="ret-modal-header">
              <h3><RefreshDouble size={18} /> New Return Request</h3>
              <button className="ret-modal-close" onClick={() => setShowModal(false)}><Xmark size={16} /></button>
            </div>
            <div className="ret-modal-body">
              <div className="ret-form-grid">
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">Order *</label>
                  <select className="ret-form-select" value={form.order_id}
                          onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}>
                    <option value="">Select delivered order</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.recipient_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">Reason *</label>
                  <select className="ret-form-select" value={form.reason}
                          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    <option value="">Select reason</option>
                    {RETURN_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">Pickup Address</label>
                  <input className="ret-form-input" placeholder="Address for return pickup"
                         value={form.pickup_address}
                         onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))} />
                </div>
                <div className="ret-form-group">
                  <label className="ret-form-label">Preferred Pickup Date</label>
                  <input type="date" className="ret-form-input" value={form.pickup_date}
                         onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))} />
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">Notes</label>
                  <textarea className="ret-form-textarea" placeholder="Additional notes..."
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="ret-modal-footer">
              <button className="ret-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ret-btn-primary" onClick={handleSubmit} disabled={saving || !form.order_id || !form.reason}>
                {saving ? 'Submitting...' : <><Plus size={14} /> Submit Return</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="ret-modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="ret-modal" onClick={e => e.stopPropagation()}>
            <div className="ret-modal-header">
              <h3><Eye size={18} /> Return Details</h3>
              <button className="ret-modal-close" onClick={() => setShowDetail(null)}><Xmark size={16} /></button>
            </div>
            <div className="ret-modal-body">
              <div className="ret-detail-grid">
                <div className="ret-detail-item">
                  <div className="ret-detail-label">Return ID</div>
                  <div className="ret-detail-value" style={{ color: '#f97316', fontFamily: 'monospace' }}>RET-{String(showDetail.id).padStart(4, '0')}</div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">Status</div>
                  <div className="ret-detail-value">
                    <span className={`ret-status ${showDetail.status}`}>
                      <span className="ret-status-dot" />
                      {RETURN_STATUS_LABELS[showDetail.status]}
                    </span>
                  </div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">Order</div>
                  <div className="ret-detail-value" style={{ fontFamily: 'monospace' }}>{showDetail.order_number || `#${showDetail.order_id}`}</div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">Customer</div>
                  <div className="ret-detail-value">{showDetail.recipient_name || '—'}</div>
                </div>
                <div className="ret-detail-item ret-detail-wide">
                  <div className="ret-detail-label">Reason</div>
                  <div className="ret-detail-value">{showDetail.reason}</div>
                </div>
                {showDetail.notes && (
                  <div className="ret-detail-item ret-detail-wide">
                    <div className="ret-detail-label">Notes</div>
                    <div className="ret-detail-value" style={{ fontSize: 13, fontWeight: 400 }}>{showDetail.notes}</div>
                  </div>
                )}
                {showDetail.pickup_address && (
                  <div className="ret-detail-item ret-detail-wide">
                    <div className="ret-detail-label">Pickup Address</div>
                    <div className="ret-detail-value" style={{ fontSize: 13 }}>{showDetail.pickup_address}</div>
                  </div>
                )}
                <div className="ret-detail-item">
                  <div className="ret-detail-label">Requested</div>
                  <div className="ret-detail-value" style={{ fontSize: 12 }}>{formatDate(showDetail.created_at)}</div>
                </div>
                {showDetail.resolved_at && (
                  <div className="ret-detail-item">
                    <div className="ret-detail-label">Resolved</div>
                    <div className="ret-detail-value" style={{ fontSize: 12 }}>{formatDate(showDetail.resolved_at)}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="ret-modal-footer">
              <button className="ret-btn-secondary" onClick={() => setShowDetail(null)}>Close</button>
              {showDetail.status === 'requested' && (
                <>
                  <button className="ret-btn-danger" onClick={() => { handleAction(showDetail.id, 'rejected'); setShowDetail(null); }}>
                    <Xmark size={14} /> Reject
                  </button>
                  <button className="ret-btn-success" onClick={() => { handleAction(showDetail.id, 'approved'); setShowDetail(null); }}>
                    <Check size={14} /> Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
