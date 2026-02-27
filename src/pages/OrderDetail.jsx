import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, DeliveryTruck, User, Phone, MapPin,
  Clock, Check, Xmark, Refresh, EditPencil, Hashtag,
  DollarCircle, Weight, Calendar, CreditCard, Box3dPoint,
  ArrowRight, Copy, WarningTriangle, Notes, Prohibition
} from 'iconoir-react';
import { AuthContext } from '../App';
import api from '../lib/api';
import MapView from '../components/MapView';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

/* ── Status metadata (shared with Orders.jsx) ──────────────────── */
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

/* Status order for the progress bar */
const STATUS_FLOW = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'];

const NEXT_STATUSES = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['assigned',  'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit'],
  in_transit: ['delivered', 'failed', 'returned'],
  delivered:  [],
  failed:     ['returned'],
  returned:   [],
  cancelled:  [],
};

const PAYMENT_LABELS = { cod: 'Cash on Delivery', prepaid: 'Prepaid', credit: 'Credit Card', wallet: 'Wallet' };

/* ── Helpers ────────────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDatetime = d => d ? new Date(d).toLocaleString('en-AE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const fmtAED  = v => { const n = parseFloat(v); return !isNaN(n) && n >= 0 ? `AED ${n.toFixed(2)}` : '—'; };
const fmtType = t => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

/* ── StatusBadge ────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span className="ord-status-badge lg" style={{ background: m.bg, color: m.color }}>
      <Icon width={14} height={14} /> {t(`orderDetail.status.${status}`)}
    </span>
  );
};

/* ── InfoRow ────────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value, mono }) => (
  <div className="od-info-row">
    <Icon width={15} height={15} className="od-info-icon" />
    <span className="od-info-label">{label}</span>
    <span className={`od-info-value${mono ? ' mono' : ''}`}>{value || '—'}</span>
  </div>
);

/* ── Progress bar ───────────────────────────────────────────────── */
const StatusProgress = ({ status }) => {
  const { t } = useTranslation();
  const isTerminal = ['failed','returned','cancelled'].includes(status);
  const currentIdx = isTerminal ? -1 : STATUS_FLOW.indexOf(status);
  return (
    <div className="od-progress-wrap">
      {STATUS_FLOW.map((s, i) => {
        const m = STATUS_META[s];
        const Icon = m.icon;
        const done = !isTerminal && i < currentIdx;
        const active = s === status;
        return (
          <div key={s} className={`od-progress-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="od-progress-dot">
              <Icon width={12} height={12} />
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`od-progress-line ${done ? 'done' : ''}`} />
            )}
            <span className="od-progress-label">{t(`orderDetail.status.${s}`)}</span>
          </div>
        );
      })}
      {isTerminal && (
        <div className="od-terminal-badge" style={{ background: STATUS_META[status]?.bg, color: STATUS_META[status]?.color }}>
          {t(`orderDetail.status.${status}`)}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════ */
export default function OrderDetail() {
  const { t } = useTranslation();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useContext(AuthContext);

  const [order,      setOrder]      = useState(null);
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus,  setNewStatus]  = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignDriver, setReassignDriver] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [activeTab,  setActiveTab]  = useState('details'); // details | timeline | items

  useEffect(() => {
    fetchOrder();
    fetchDrivers();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await api.get(`/orders/${id}`);
    if (res.success) setOrder(res.data);
    setLoading(false);
  };

  const fetchDrivers = async () => {
    const res = await api.get('/drivers?status=available&limit=100');
    if (res.success) setDrivers(res.data || []);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setSavingStatus(true);
    const res = await api.patch(`/orders/${id}/status`, { status: newStatus, note: statusNote });
    if (res.success) {
      setNewStatus('');
      setStatusNote('');
      fetchOrder();
    }
    setSavingStatus(false);
  };

  const handleReassign = async () => {
    if (!reassignDriver) return;
    setReassigning(true);
    const res = await api.post('/dispatch/assign', { order_id: Number(id), driver_id: Number(reassignDriver) });
    if (res.success) {
      setShowReassign(false);
      setReassignDriver('');
      fetchOrder();
      fetchDrivers();
    }
    setReassigning(false);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(order.tracking_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ── Map markers ── */
  const mapMarkers = [];
  if (order?.sender_lat && order?.sender_lng) {
    mapMarkers.push({ lat: parseFloat(order.sender_lat), lng: parseFloat(order.sender_lng), type: 'pickup', label: t('orderDetail.pickup'), popup: order.sender_address || t('orderDetail.pickup_location') });
  }
  if (order?.recipient_lat && order?.recipient_lng) {
    mapMarkers.push({ lat: parseFloat(order.recipient_lat), lng: parseFloat(order.recipient_lng), type: 'delivery', label: t('orderDetail.delivery_label'), popup: order.recipient_address || t('orderDetail.delivery_location') });
  }

  /* ── Next possible statuses ── */
  const nextStatuses = NEXT_STATUSES[order?.status] || [];

  if (loading) return (
    <div className="page-container">
      <div className="od-loading">
        <div className="skeleton-pulse" style={{ height: 40, width: 200, borderRadius: 8 }} />
        <div className="skeleton-pulse" style={{ height: 300, borderRadius: 12, marginTop: 20 }} />
      </div>
    </div>
  );

  if (!order) return (
    <div className="page-container">
      <div className="ord-empty">
        <Package width={48} height={48} />
        <h3>{t("orderDetail.order_not_found")}</h3>
        <button className="btn-primary-action" onClick={() => navigate('/orders')}>
          <ArrowLeft width={15} height={15} /> {t('orderDetail.back_to_orders')}
        </button>
      </div>
    </div>
  );

  const sm = STATUS_META[order.status] || STATUS_META.pending;

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div className="od-page-header">
        <button className="od-back-btn" onClick={() => navigate('/orders')}>
          <ArrowLeft width={16} height={16} /> {t('orderDetail.orders_back')}
        </button>
        <div className="od-header-main">
          <div className="od-header-left">
            <h2 className="od-order-number">{order.order_number}</h2>
            <div className="od-header-meta">
              <StatusBadge status={order.status} />
              <span className="od-type-chip">{fmtType(order.order_type)}</span>
              {order.zone_name && <span className="od-zone-chip">{order.zone_name}</span>}
            </div>
          </div>
          <div className="od-header-actions">
            <button className="btn-outline-action" onClick={fetchOrder}>
              <Refresh width={14} height={14} /> {t('orderDetail.refresh')}
            </button>
            <button className="btn-outline-action" title={t('orderDetail.copy_tracking_link')} onClick={copyToken}>
              <Copy width={14} height={14} /> {copied ? t('orderDetail.copied') : order.tracking_token}
            </button>
            <a
              href={`/track/${order.tracking_token}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline-action"
              style={{ textDecoration: 'none' }}
            >
              <Box3dPoint width={14} height={14} /> {t('orderDetail.track')}
            </a>
            <button className="btn-outline-action" onClick={() => navigate('/dispatch')}
              style={{ color: '#16a34a', borderColor: '#bbf7d0' }}>
              <DeliveryTruck width={14} height={14} /> {t('orderDetail.dispatch')}
            </button>
            <button className="btn-outline-action" onClick={() => navigate('/shipment-tracking')}
              style={{ color: '#2563eb', borderColor: '#bfdbfe' }}>
              <MapPin width={14} height={14} /> {t('orderDetail.all_tracking')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Status Progress ── */}
      <div className="od-progress-card">
        <StatusProgress status={order.status} />
        <div className="od-timestamps">
          <span><Clock width={13} height={13} /> {t('orderDetail.created')} {fmtDatetime(order.created_at)}</span>
          {order.scheduled_at && <span><Calendar width={13} height={13} /> {t('orderDetail.scheduled')} {fmtDatetime(order.scheduled_at)}</span>}
          {order.picked_up_at && <span><Package width={13} height={13} /> {t('orderDetail.picked_up')} {fmtDatetime(order.picked_up_at)}</span>}
          {order.delivered_at && <span><Check width={13} height={13} /> {t('orderDetail.delivered')} {fmtDatetime(order.delivered_at)}</span>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="od-tabs">
        {['details','timeline','items'].map(tab => (
          <button key={tab} className={`od-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {t(`orderDetail.tab_${tab}`)}
            {tab === 'timeline' && order.status_logs?.length > 0 && (
              <span className="od-tab-badge">{order.status_logs.length}</span>
            )}
            {tab === 'items' && order.items?.length > 0 && (
              <span className="od-tab-badge">{order.items.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="od-body">

        {/* ════════════════ DETAILS TAB ════════════════ */}
        {activeTab === 'details' && (
          <div className="od-grid">

            {/* Recipient */}
            <div className="od-card">
              <h4 className="od-card-title"><User width={15} height={15} /> {t('orderDetail.section.recipient')}</h4>
              <InfoRow icon={User}    label={t('orderDetail.name')}    value={order.recipient_name} />
              <InfoRow icon={Phone}   label={t('orderDetail.phone')}   value={order.recipient_phone} mono />
              <InfoRow icon={MapPin}  label={t('orderDetail.address')} value={order.recipient_address} />
              {order.recipient_area && <InfoRow icon={MapPin} label={t('orderDetail.area')} value={order.recipient_area} />}
              <InfoRow icon={MapPin}  label={t('orderDetail.emirate')} value={order.recipient_emirate} />
            </div>

            {/* Order Info */}
            <div className="od-card">
              <h4 className="od-card-title"><Package width={15} height={15} /> {t('orderDetail.section.order_info')}</h4>
              <InfoRow icon={Hashtag}      label={t('orderDetail.order_num')}    value={order.order_number} mono />
              <InfoRow icon={Box3dPoint}   label={t('orderDetail.type')}       value={fmtType(order.order_type)} />
              <InfoRow icon={CreditCard}   label={t('orderDetail.payment')}    value={t(`orderDetail.payment_labels.${order.payment_method}`, { defaultValue: order.payment_method })} />
              <InfoRow icon={DollarCircle} label={t('orderDetail.cod_amount')} value={fmtAED(order.cod_amount)} />
              <InfoRow icon={DollarCircle} label={t('orderDetail.delivery_fee')} value={fmtAED(order.delivery_fee)} />
              {parseFloat(order.discount) > 0 && <InfoRow icon={DollarCircle} label={t('orderDetail.discount')} value={`- ${fmtAED(order.discount)}`} />}
              <InfoRow icon={Weight}       label={t('orderDetail.weight')}     value={order.weight_kg ? `${order.weight_kg} kg` : '—'} />
              {order.client_name && <InfoRow icon={User} label={t('orderDetail.client')} value={order.client_name} />}
            </div>

            {/* Financial Breakdown (#60 #61 #62) */}
            {(parseFloat(order.commission_amount) > 0 || parseFloat(order.vat_amount) > 0 || parseFloat(order.net_payable) > 0) && (
              <div className="od-card" style={{background:'linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%)',border:'1px solid #bbf7d0'}}>
                <h4 className="od-card-title" style={{color:'#16a34a'}}><DollarCircle width={15} height={15} /> {t('orderDetail.section.financial')}</h4>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#334155'}}>
                    <span>{t('orderDetail.fin.subtotal')}</span>
                    <span style={{fontWeight:600}}>{fmtAED(order.delivery_fee)}</span>
                  </div>
                  {parseFloat(order.discount) > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#dc2626'}}>
                      <span>{t('orderDetail.fin.discount')}</span>
                      <span>- {fmtAED(order.discount)}</span>
                    </div>
                  )}
                  {parseFloat(order.commission_amount) > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#d97706'}}>
                      <span>{t('orderDetail.fin.commission')} ({order.commission_rate}%)</span>
                      <span>- {fmtAED(order.commission_amount)}</span>
                    </div>
                  )}
                  {parseFloat(order.vat_amount) > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#6366f1'}}>
                      <span>{t('orderDetail.fin.vat')} ({order.vat_rate}%)</span>
                      <span>{fmtAED(order.vat_amount)}</span>
                    </div>
                  )}
                  {parseFloat(order.platform_fee) > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#64748b'}}>
                      <span>{t('orderDetail.fin.platform_fee')}</span>
                      <span>- {fmtAED(order.platform_fee)}</span>
                    </div>
                  )}
                  <div style={{borderTop:'1.5px solid #16a34a',paddingTop:8,marginTop:4,display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,color:'#16a34a'}}>
                    <span>{t('orderDetail.fin.net_payable')}</span>
                    <span>{fmtAED(order.net_payable)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:14,fontWeight:700,color:'#1e293b',paddingTop:2}}>
                    <span>{t('orderDetail.fin.total')}</span>
                    <span>{fmtAED(order.total_amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Driver */}
            <div className="od-card">
              <div className="od-card-title-row">
                <h4 className="od-card-title"><DeliveryTruck width={15} height={15} /> {t('orderDetail.section.driver')}</h4>
                {['pending','confirmed','assigned'].includes(order.status) && (
                  <button className="od-action-btn" onClick={() => setShowReassign(v => !v)}>
                    <EditPencil width={13} height={13} /> {order.driver_id ? t('orderDetail.reassign') : t('orderDetail.assign_driver')}
                  </button>
                )}
              </div>
              {order.driver_name ? (
                <>
                  <InfoRow icon={User}         label={t('orderDetail.name')}    value={order.driver_name} />
                  <InfoRow icon={Phone}         label={t('orderDetail.phone')}   value={order.driver_phone} mono />
                  <InfoRow icon={DeliveryTruck} label={t('orderDetail.vehicle')} value={fmtType(order.vehicle_type)} />
                  {order.vehicle_plate && <InfoRow icon={Hashtag} label={t('orderDetail.plate')} value={order.vehicle_plate} mono />}
                </>
              ) : (
                <p className="od-no-driver">{t("orderDetail.no_driver")}</p>
              )}
              {showReassign && (
                <div className="od-reassign-row">
                  <select className="od-select" value={reassignDriver}
                    onChange={e => setReassignDriver(e.target.value)}>
                    <option value="">{t('orderDetail.select_driver')}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({fmtType(d.vehicle_type)})
                      </option>
                    ))}
                  </select>
                  <button className="btn-primary-action" onClick={handleReassign} disabled={!reassignDriver || reassigning}>
                    {reassigning ? t('orderDetail.assigning') : t('orderDetail.confirm')}
                  </button>
                  <button className="btn-outline-action" onClick={() => setShowReassign(false)}>{t("common.cancel")}</button>
                </div>
              )}
            </div>

            {/* Notes */}
            {(order.notes || order.description || order.special_instructions) && (
              <div className="od-card">
                <h4 className="od-card-title"><Notes width={15} height={15} /> {t('orderDetail.section.notes')}</h4>
                {order.notes && <p className="od-note-text">{order.notes}</p>}
                {order.description && <p className="od-note-text">{order.description}</p>}
                {order.special_instructions && (
                  <p className="od-note-text od-note-warn">
                    <WarningTriangle width={13} height={13} /> {order.special_instructions}
                  </p>
                )}
              </div>
            )}

            {/* Status Update */}
            {nextStatuses.length > 0 && (
              <div className="od-card od-status-card">
                <h4 className="od-card-title"><ArrowRight width={15} height={15} /> {t('orderDetail.update_status')}</h4>
                <div className="od-status-actions">
                  {nextStatuses.map(s => {
                    const m = STATUS_META[s];
                    const Icon = m.icon;
                    return (
                      <button key={s}
                        className={`od-status-btn ${newStatus === s ? 'selected' : ''}`}
                        style={{ '--s-color': m.color, '--s-bg': m.bg }}
                        onClick={() => setNewStatus(ns => ns === s ? '' : s)}>
                        <Icon width={14} height={14} /> {t(`orderDetail.status.${s}`)}
                      </button>
                    );
                  })}
                </div>
                {newStatus && (
                  <div className="od-status-confirm">
                    <input
                      type="text"
                      className="od-note-input"
                      placeholder={t("orderDetail.add_note")}
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                    />
                    <button className="btn-primary-action" onClick={handleStatusUpdate} disabled={savingStatus}>
                      {savingStatus ? t('orderDetail.saving') : t('orderDetail.mark_as', { status: t(`orderDetail.status.${newStatus}`) })}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mini Map */}
            {mapMarkers.length > 0 && (
              <div className="od-card od-map-card">
                <h4 className="od-card-title"><MapPin width={15} height={15} /> {t('orderDetail.section.location')}</h4>
                <MapView
                  markers={mapMarkers}
                  height={260}
                  zoom={12}
                  center={mapMarkers[mapMarkers.length - 1] ? [mapMarkers[mapMarkers.length-1].lat, mapMarkers[mapMarkers.length-1].lng] : undefined}
                />
              </div>
            )}

          </div>
        )}

        {/* ════════════════ TIMELINE TAB ════════════════ */}
        {activeTab === 'timeline' && (
          <div className="od-timeline-wrap">
            {!order.status_logs?.length ? (
              <p className="od-empty-tab">{t("orderDetail.no_history")}</p>
            ) : (
              <div className="od-timeline">
                {order.status_logs.map((log, i) => {
                  const m = STATUS_META[log.status] || STATUS_META.pending;
                  const Icon = m.icon;
                  const isLast = i === order.status_logs.length - 1;
                  return (
                    <div key={log.id} className={`od-tl-item ${isLast ? 'latest' : ''}`}>
                      <div className="od-tl-dot" style={{ background: m.color }}>
                        <Icon width={11} height={11} color="#fff" />
                      </div>
                      {!isLast && <div className="od-tl-line" />}
                      <div className="od-tl-content">
                        <div className="od-tl-header">
                          <span className="od-tl-status" style={{ color: m.color }}>{t(`orderDetail.status.${log.status}`)}</span>
                          <span className="od-tl-time">{fmtDatetime(log.created_at)}</span>
                        </div>
                        {log.note && <p className="od-tl-note">{log.note}</p>}
                        {log.changed_by_name && (
                          <span className="od-tl-by">{t('orderDetail.by')} {log.changed_by_name}</span>
                        )}
                        {(log.lat && log.lng) && (
                          <span className="od-tl-gps">
                            <MapPin width={11} height={11} /> {parseFloat(log.lat).toFixed(5)}, {parseFloat(log.lng).toFixed(5)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ ITEMS TAB ════════════════ */}
        {activeTab === 'items' && (
          <div className="od-items-wrap">
            {!order.items?.length ? (
              <p className="od-empty-tab">{t('orderDetail.no_items')}</p>
            ) : (
              <table className="od-items-table">
                <thead>
                  <tr>
                    <th>{t('orderDetail.item')}</th>
                    <th>{t('orderDetail.qty')}</th>
                    <th>{t('orderDetail.weight')}</th>
                    <th>{t('orderDetail.unit_price')}</th>
                    <th>{t('orderDetail.notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td className="od-item-name">{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.weight_kg ? `${item.weight_kg} kg` : '—'}</td>
                      <td>{fmtAED(item.unit_price)}</td>
                      <td className="od-item-notes">{item.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
