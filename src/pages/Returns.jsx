import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshDouble, Search, Plus, Eye, Check, Xmark,
  Package, Clock, WarningCircle, DeliveryTruck,
  ArrowDown, User, Phone, Calendar, EditPencil, MapPin
} from 'iconoir-react';
import { api } from '../lib/api';
import './Returns.css';
import { useTranslation } from 'react-i18next';

const RETURN_REASON_KEYS = {
  'Damaged item': 'damaged_item',
  'Wrong item delivered': 'wrong_item',
  'Item not as described': 'not_as_described',
  'Customer changed mind': 'changed_mind',
  'Defective product': 'defective',
  'Missing parts': 'missing_parts',
  'Duplicate order': 'duplicate_order',
  'Late delivery': 'late_delivery',
  'Other': 'other'
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
  const { t } = useTranslation();
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
    { label: t('returns.stats.total_returns'), value: stats.total, color: 'primary', bg: '#fff7ed', iconColor: '#f97316', icon: RefreshDouble },
    { label: t('returns.stats.pending'), value: stats.requested, color: 'warning', bg: '#fef3c7', iconColor: '#d97706', icon: Clock },
    { label: t('returns.stats.in_progress'), value: stats.approved + stats.in_progress, color: 'info', bg: '#eff6ff', iconColor: '#2563eb', icon: DeliveryTruck },
    { label: t('returns.stats.completed'), value: stats.completed, color: 'success', bg: '#dcfce7', iconColor: '#16a34a', icon: Check },
    { label: t('returns.stats.rejected'), value: stats.rejected, color: 'danger', bg: '#fee2e2', iconColor: '#ef4444', icon: Xmark },
  ];

  return (
    <div className="ret-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><RefreshDouble size={26} /></div>
          <div>
            <h1 className="module-hero-title">{t('returns.page_title')}</h1>
            <p className="module-hero-sub">{t("returns.subtitle")}</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> {t('returns.new_return')}
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
          { key: 'all', label: t('returns.tabs.all'), count: stats.total },
          { key: 'pending', label: t('returns.tabs.pending'), count: stats.requested },
          { key: 'active', label: t('returns.tabs.in_progress'), count: stats.approved + stats.in_progress },
          { key: 'completed', label: t('returns.tabs.completed'), count: stats.completed },
          { key: 'rejected', label: t('returns.tabs.rejected'), count: stats.rejected },
        ].map(tab => (
          <button key={tab.key} className={`ret-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            <span className="ret-tab-badge">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="ret-filters">
        <div className="ret-search-wrap">
          <Search size={16} className="ret-search-icon" />
          <input className="ret-search-input" placeholder={t("returns.search_placeholder")}
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="ret-spinner" />
      ) : filtered.length === 0 ? (
        <div className="ret-empty">
          <div className="ret-empty-icon"><RefreshDouble size={28} /></div>
          <h3>{t("returns.no_returns")}</h3>
          <p>{t("returns.no_results")}</p>
        </div>
      ) : (
        <div className="ret-table-wrap">
          <table className="ret-table">
            <thead>
              <tr>
                <th>{t("returns.return_id")}</th>
                <th>{t("returns.col.order_num")}</th>
                <th>{t("returns.customer")}</th>
                <th>{t("returns.col.reason")}</th>
                <th>{t("returns.col.status")}</th>
                <th>{t("returns.col.requested")}</th>
                <th>{t("returns.col.actions")}</th>
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
                    <span className="ret-reason-tag">{RETURN_REASON_KEYS[ret.reason] ? t('returns.reasons.' + RETURN_REASON_KEYS[ret.reason]) : ret.reason}</span>
                  </td>
                  <td>
                    <span className={`ret-status ${ret.status}`}>
                      <span className="ret-status-dot" />
                      {t('returns.status_labels.' + ret.status)}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDate(ret.created_at)}
                  </td>
                  <td>
                    <div className="ret-actions" onClick={e => e.stopPropagation()}>
                      <button className="ret-action-btn" onClick={() => setShowDetail(ret)} title={t("common.view")}>
                        <Eye size={14} />
                      </button>
                      {ret.status === 'requested' && (
                        <>
                          <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'approved')} title={t("returns.approve")}>
                            <Check size={14} />
                          </button>
                          <button className="ret-action-btn reject" onClick={() => handleAction(ret.id, 'rejected')} title={t("returns.reject")}>
                            <Xmark size={14} />
                          </button>
                        </>
                      )}
                      {ret.status === 'approved' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'pickup_scheduled')} title={t("returns.schedule_pickup")}>
                          <DeliveryTruck size={14} />
                        </button>
                      )}
                      {ret.status === 'pickup_scheduled' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'picked_up')} title={t("returns.mark_picked_up")}>
                          <Package size={14} />
                        </button>
                      )}
                      {ret.status === 'picked_up' && (
                        <button className="ret-action-btn approve" onClick={() => handleAction(ret.id, 'received')} title={t("returns.mark_received")}>
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
              <h3><RefreshDouble size={18} /> {t('returns.modal.new_title')}</h3>
              <button className="ret-modal-close" onClick={() => setShowModal(false)}><Xmark size={16} /></button>
            </div>
            <div className="ret-modal-body">
              <div className="ret-form-grid">
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">{t('returns.form.order')}</label>
                  <select className="ret-form-select" value={form.order_id}
                          onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}>
                    <option value="">{t('returns.form.select_order')}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} — {o.recipient_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">{t('returns.form.reason')}</label>
                  <select className="ret-form-select" value={form.reason}
                          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    <option value="">{t('returns.form.select_reason')}</option>
                    {RETURN_REASONS.map(r => (
                      <option key={r} value={r}>{t('returns.reasons.' + RETURN_REASON_KEYS[r])}</option>
                    ))}
                  </select>
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">{t("returns.pickup_address")}</label>
                  <input className="ret-form-input" placeholder={t("returns.address_placeholder")}
                         value={form.pickup_address}
                         onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))} />
                </div>
                <div className="ret-form-group">
                  <label className="ret-form-label">{t("returns.preferred_date")}</label>
                  <input type="date" className="ret-form-input" value={form.pickup_date}
                         onChange={e => setForm(f => ({ ...f, pickup_date: e.target.value }))} />
                </div>
                <div className="ret-form-group span-2">
                  <label className="ret-form-label">{t('returns.form.notes')}</label>
                  <textarea className="ret-form-textarea" placeholder={t("returns.notes_placeholder")}
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="ret-modal-footer">
              <button className="ret-btn-secondary" onClick={() => setShowModal(false)}>{t("common.cancel")}</button>
              <button className="ret-btn-primary" onClick={handleSubmit} disabled={saving || !form.order_id || !form.reason}>
                {saving ? t('returns.submitting') : <><Plus size={14} /> {t('returns.submit')}</>}
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
              <h3><Eye size={18} /> {t('returns.modal.detail_title')}</h3>
              <button className="ret-modal-close" onClick={() => setShowDetail(null)}><Xmark size={16} /></button>
            </div>
            <div className="ret-modal-body">
              <div className="ret-detail-grid">
                <div className="ret-detail-item">
                  <div className="ret-detail-label">{t("returns.return_id")}</div>
                  <div className="ret-detail-value" style={{ color: '#f97316', fontFamily: 'monospace' }}>RET-{String(showDetail.id).padStart(4, '0')}</div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">{t('returns.detail.status')}</div>
                  <div className="ret-detail-value">
                    <span className={`ret-status ${showDetail.status}`}>
                      <span className="ret-status-dot" />
                      {t('returns.status_labels.' + showDetail.status)}
                    </span>
                  </div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">{t('returns.detail.order')}</div>
                  <div className="ret-detail-value" style={{ fontFamily: 'monospace' }}>{showDetail.order_number || `#${showDetail.order_id}`}</div>
                </div>
                <div className="ret-detail-item">
                  <div className="ret-detail-label">{t("returns.customer")}</div>
                  <div className="ret-detail-value">{showDetail.recipient_name || '—'}</div>
                </div>
                <div className="ret-detail-item ret-detail-wide">
                  <div className="ret-detail-label">{t('returns.detail.reason')}</div>
                  <div className="ret-detail-value">{RETURN_REASON_KEYS[showDetail.reason] ? t('returns.reasons.' + RETURN_REASON_KEYS[showDetail.reason]) : showDetail.reason}</div>
                </div>
                {showDetail.notes && (
                  <div className="ret-detail-item ret-detail-wide">
                    <div className="ret-detail-label">{t('returns.detail.notes')}</div>
                    <div className="ret-detail-value" style={{ fontSize: 13, fontWeight: 400 }}>{showDetail.notes}</div>
                  </div>
                )}
                {showDetail.pickup_address && (
                  <div className="ret-detail-item ret-detail-wide">
                    <div className="ret-detail-label">{t("returns.pickup_address")}</div>
                    <div className="ret-detail-value" style={{ fontSize: 13 }}>{showDetail.pickup_address}</div>
                  </div>
                )}
                <div className="ret-detail-item">
                  <div className="ret-detail-label">{t('returns.detail.requested')}</div>
                  <div className="ret-detail-value" style={{ fontSize: 12 }}>{formatDate(showDetail.created_at)}</div>
                </div>
                {showDetail.resolved_at && (
                  <div className="ret-detail-item">
                    <div className="ret-detail-label">{t('returns.detail.resolved')}</div>
                    <div className="ret-detail-value" style={{ fontSize: 12 }}>{formatDate(showDetail.resolved_at)}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="ret-modal-footer">
              <button className="ret-btn-secondary" onClick={() => setShowDetail(null)}>{t("common.close")}</button>
              {showDetail.status === 'requested' && (
                <>
                  <button className="ret-btn-danger" onClick={() => { handleAction(showDetail.id, 'rejected'); setShowDetail(null); }}>
                    <Xmark size={14} /> {t('returns.reject')}
                  </button>
                  <button className="ret-btn-success" onClick={() => { handleAction(showDetail.id, 'approved'); setShowDetail(null); }}>
                    <Check size={14} /> {t('returns.approve')}
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
