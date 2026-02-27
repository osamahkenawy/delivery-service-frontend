import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, MapPin, Refresh, Check, Xmark, WarningTriangle, Map as MapIcon, ViewGrid
} from 'iconoir-react';
import api from '../lib/api';
import MapView from '../components/MapView';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

const STATUS_STYLE = {
  pending:    { background: '#fef3c7', color: '#d97706' },
  confirmed:  { background: '#dbeafe', color: '#1d4ed8' },
  assigned:   { background: '#ede9fe', color: '#7c3aed' },
  picked_up:  { background: '#fce7f3', color: '#be185d' },
  in_transit: { background: '#e0f2fe', color: '#0369a1' },
};

export default function Dispatch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [board, setBoard]                 = useState({ unassigned: [], active_deliveries: [], available_drivers: [] });
  const [loading, setLoading]             = useState(true);
  const [assigning, setAssigning]         = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [error, setError]                 = useState('');
  const [view, setView]                   = useState('board');          // 'board' | 'map'

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dispatch');
      if (res.success) {
        setBoard(res.data || { unassigned: [], active_deliveries: [], available_drivers: [] });
      }
    } catch (e) { console.error('Dispatch fetch error:', e); }
    finally { setLoading(false); }
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedDriver) return;
    setAssigning(selectedOrder);
    setError('');
    try {
      const res = await api.post('/dispatch/assign', { order_id: selectedOrder, driver_id: selectedDriver });
      if (res.success) { setSelectedOrder(null); setSelectedDriver(''); fetchBoard(); }
      else { setError(res.message || t('dispatch.error.assignment_failed')); }
    } catch { setError(t('dispatch.error.assign_failed')); }
    finally { setAssigning(null); }
  };

  const handleUnassign = async (orderId) => {
    if (!window.confirm(t('dispatch.confirm_unassign'))) return;
    try { await api.post('/dispatch/unassign', { order_id: orderId }); fetchBoard(); }
    catch { /* ignore */ }
  };

  /* ── Popup styles ── */
  const popupStyles = {
    card: { minWidth: 240, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', lineHeight: 1.5 },
    header: (bg, color) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', borderRadius: '8px 8px 0 0',
      background: bg, color, fontWeight: 700, fontSize: '0.85rem',
    }),
    body: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
    row: { display: 'flex', alignItems: 'center', gap: 6, color: '#374151' },
    icon: { width: 14, height: 14, flexShrink: 0, opacity: 0.6 },
    label: { fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
    value: { fontWeight: 500 },
    badge: (bg, color) => ({
      display: 'inline-flex', padding: '2px 8px', borderRadius: 12,
      fontSize: '0.72rem', fontWeight: 700, background: bg, color, textTransform: 'capitalize',
    }),
    divider: { borderTop: '1px solid #f3f4f6', margin: '2px 0' },
    driverTag: {
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
      background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0',
    },
    codTag: {
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      background: '#fef3c7', borderRadius: 6, fontWeight: 700, color: '#92400e', fontSize: '0.78rem',
    },
  };

  const statusBadgeInfo = (status) => {
    const map = {
      pending:    { bg: '#fef3c7', color: '#d97706', label: t('dispatch.status.pending') },
      confirmed:  { bg: '#dbeafe', color: '#1d4ed8', label: t('dispatch.status.confirmed') },
      assigned:   { bg: '#ede9fe', color: '#7c3aed', label: t('dispatch.status.assigned') },
      picked_up:  { bg: '#fce7f3', color: '#be185d', label: t('dispatch.status.picked_up') },
      in_transit: { bg: '#e0f2fe', color: '#0369a1', label: t('dispatch.status.in_transit') },
      delivered:  { bg: '#dcfce7', color: '#16a34a', label: t('dispatch.status.delivered') },
    };
    return map[status] || map.pending;
  };

  /* ── Order Popup (rich JSX) ── */
  const OrderPopup = ({ o, variant }) => {
    const si = statusBadgeInfo(o.status);
    const headerBg = variant === 'unassigned' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)';
    return (
      <div style={popupStyles.card}>
        <div style={{ ...popupStyles.header('#fff', '#fff'), background: headerBg }}>
          <span>{t('dispatch.order_label')} #{o.order_number || o.id}</span>
          <span style={popupStyles.badge(si.bg, si.color)}>{si.label}</span>
        </div>
        <div style={popupStyles.body}>
          {/* Recipient */}
          <div>
            <div style={popupStyles.label}>{t('dispatch.popup.recipient')}</div>
            <div style={{ ...popupStyles.row, fontWeight: 600, fontSize: '0.88rem' }}>
              <span>👤</span> {o.recipient_name || '—'}
            </div>
            {o.recipient_phone && (
              <div style={popupStyles.row}>
                <span>📱</span> <span style={popupStyles.value}>{o.recipient_phone}</span>
              </div>
            )}
          </div>

          <div style={popupStyles.divider} />

          {/* Address */}
          <div>
            <div style={popupStyles.label}>{t('dispatch.popup.delivery_address')}</div>
            <div style={popupStyles.row}>
              <span>📍</span> <span style={popupStyles.value}>{o.recipient_address || '—'}</span>
            </div>
            {(o.recipient_area || o.recipient_emirate) && (
              <div style={{ ...popupStyles.row, fontSize: '0.78rem', color: '#6b7280' }}>
                <span>🏙️</span> {[o.recipient_area, o.recipient_emirate].filter(Boolean).join(', ')}
              </div>
            )}
            {o.zone_name && (
              <div style={{ ...popupStyles.row, fontSize: '0.78rem', color: '#6b7280' }}>
                <span>🗺️</span> {t('dispatch.popup.zone')} {o.zone_name}
              </div>
            )}
          </div>

          {/* Driver (if assigned) */}
          {o.driver_name && (
            <>
              <div style={popupStyles.divider} />
              <div>
                <div style={popupStyles.label}>{t('dispatch.popup.driver')}</div>
                <div style={popupStyles.driverTag}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem' }}>
                    {o.driver_name.charAt(0)}
                  </span>
                  <span style={{ fontWeight: 600 }}>{o.driver_name}</span>
                </div>
              </div>
            </>
          )}

          {/* Payment / COD */}
          {(o.payment_method || o.cod_amount > 0) && (
            <>
              <div style={popupStyles.divider} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {o.payment_method && (
                  <span style={popupStyles.badge('#f3f4f6', '#374151')}>
                    {o.payment_method === 'cod' ? `💵 ${t('dispatch.popup.cod')}` : o.payment_method === 'prepaid' ? `💳 ${t('dispatch.popup.prepaid')}` : o.payment_method}
                  </span>
                )}
                {o.cod_amount > 0 && (
                  <span style={popupStyles.codTag}>{t('dispatch.currency')} {parseFloat(o.cod_amount).toFixed(0)}</span>
                )}
                {o.delivery_fee > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('dispatch.popup.fee')} {t('dispatch.currency')} {parseFloat(o.delivery_fee).toFixed(0)}</span>
                )}
              </div>
            </>
          )}

          {/* Description / Instructions */}
          {(o.description || o.special_instructions) && (
            <>
              <div style={popupStyles.divider} />
              <div style={{ fontSize: '0.76rem', color: '#6b7280', fontStyle: 'italic', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📋 {o.special_instructions || o.description}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ── Driver Popup (rich JSX) ── */
  const DriverPopup = ({ d }) => (
    <div style={popupStyles.card}>
      <div style={{ ...popupStyles.header('#fff', '#fff'), background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
            {d.full_name?.charAt(0)}
          </span>
          <span>{d.full_name}</span>
        </div>
        <span style={popupStyles.badge('#dcfce7', '#16a34a')}>{t('dispatch.status.available')}</span>
      </div>
      <div style={popupStyles.body}>
        <div>
          <div style={popupStyles.label}>{t('dispatch.popup.vehicle')}</div>
          <div style={popupStyles.row}>
            <span>🚗</span>
            <span style={{ ...popupStyles.value, textTransform: 'capitalize' }}>{d.vehicle_type || '—'}</span>
            <span style={{ color: '#9ca3af' }}>•</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>{d.vehicle_plate || '—'}</span>
          </div>
        </div>
        {d.phone && (
          <>
            <div style={popupStyles.divider} />
            <div style={popupStyles.row}>
              <span>📱</span> <span style={popupStyles.value}>{d.phone}</span>
            </div>
          </>
        )}
        {d.zone_name && (
          <>
            <div style={popupStyles.divider} />
            <div style={popupStyles.row}>
              <span>🗺️</span> <span style={popupStyles.value}>{t('dispatch.popup.zone')} {d.zone_name}</span>
            </div>
          </>
        )}
        {d.active_orders > 0 && (
          <>
            <div style={popupStyles.divider} />
            <div style={popupStyles.row}>
              <span>📦</span> <span style={popupStyles.value}>{t('dispatch.popup.active_orders', { count: d.active_orders })}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ── Build map data ── */
  const buildMapMarkers = () => {
    const markers = [];
    (board.unassigned || []).forEach(o => {
      if (o.recipient_lat && o.recipient_lng) {
        markers.push({
          lat: parseFloat(o.recipient_lat), lng: parseFloat(o.recipient_lng),
          type: 'delivery', label: `#${o.id}`,
          popup: <OrderPopup o={o} variant="unassigned" />,
          id: `unassigned-${o.id}`,
        });
      }
    });
    (board.active_deliveries || []).forEach(o => {
      if (o.recipient_lat && o.recipient_lng) {
        markers.push({
          lat: parseFloat(o.recipient_lat), lng: parseFloat(o.recipient_lng),
          type: 'order', label: `#${o.id}`,
          popup: <OrderPopup o={o} variant="active" />,
          id: `active-${o.id}`,
        });
      }
    });
    (board.available_drivers || []).forEach(d => {
      if (d.last_lat && d.last_lng) {
        markers.push({
          lat: parseFloat(d.last_lat), lng: parseFloat(d.last_lng),
          type: 'driver', label: d.full_name?.split(' ')[0],
          popup: <DriverPopup d={d} />,
          id: `driver-${d.id}`,
        });
      }
    });
    return markers;
  };

  /* ── Order Card (used in board & sidebar) ── */
  const OrderCard = ({ order, showUnassign, mini }) => {
    const sc = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
    const isSelected = selectedOrder === order.id;
    return (
      <div className={mini ? 'dispatch-mini-card' : 'dispatch-card'}>
        <div className="dispatch-card-header">
          <div>
            <div className="dispatch-order-id">#{order.id}</div>
            <div className="dispatch-recipient">{order.recipient_name}</div>
          </div>
          <span className="status-badge" style={sc}>{t(`dispatch.status.${order.status}`, order.status)}</span>
        </div>
        {!mini && (
          <div className="dispatch-meta">
            <span><MapPin width={13} height={13} /> {order.recipient_address}</span>
            {order.zone_name && <span><MapPin width={13} height={13} /> {order.zone_name}</span>}
            {order.driver_name && <span><DeliveryTruck width={13} height={13} /> {order.driver_name}</span>}
          </div>
        )}
        <div className="dispatch-actions">
          {!showUnassign && (
            <button
              className={`btn-sm ${isSelected ? 'btn-sm-primary' : 'btn-sm-outline'}`}
              onClick={() => setSelectedOrder(isSelected ? null : order.id)}
            >
              {isSelected ? <><Check width={14} height={14} /> {t('dispatch.selected')}</> : t('dispatch.select')}
            </button>
          )}
          {showUnassign && (
            <button className="btn-sm btn-sm-danger" onClick={() => handleUnassign(order.id)}>
              <Xmark width={14} height={14} /> {t('dispatch.unassign')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const mapMarkers = view === 'map' ? buildMapMarkers() : [];

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="module-hero">
        <div className="module-hero-left">
          <h2 className="module-hero-title">{t('dispatch.title')}</h2>
          <p className="module-hero-sub">{t('dispatch.subtitle')}</p>
        </div>
        <div className="module-hero-actions">
          <button onClick={() => navigate('/orders')} style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#475569',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Package width={14} height={14} /> {t('dispatch.orders')}
          </button>
          <button onClick={() => navigate('/live-map')} style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#2563eb',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <MapIcon width={14} height={14} /> {t('dispatch.live_map')}
          </button>
          <button onClick={() => navigate('/shipment-tracking')} style={{
            padding: '8px 14px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4',
            cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#16a34a',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <MapPin width={14} height={14} /> {t('dispatch.track')}
          </button>
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
              <ViewGrid width={15} height={15} /> {t('dispatch.view.board')}
            </button>
            <button className={`view-toggle-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
              <MapIcon width={15} height={15} /> {t('dispatch.view.map')}
            </button>
          </div>
          <button className="module-btn module-btn-outline" onClick={fetchBoard}>
            <Refresh width={16} height={16} /> {t('dispatch.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <WarningTriangle width={16} height={16} /> {error}
        </div>
      )}

      {/* ── Assignment Panel ── */}
      {selectedOrder && (
        <div className="assign-panel">
          <div className="assign-panel-label">
            <Package width={16} height={16} />
            {t('dispatch.order_label')} <strong>#{selectedOrder}</strong> {t('dispatch.order_selected_suffix')}
          </div>
          <select className="assign-select" value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}>
            <option value="">{t('dispatch.select_driver')}</option>
            {board.available_drivers?.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name} &mdash; {d.vehicle_type} ({d.vehicle_plate})
              </option>
            ))}
          </select>
          <button className="module-btn module-btn-primary" onClick={handleAssign}
            disabled={!selectedDriver || assigning}>
            {assigning ? t('dispatch.assigning') : t('dispatch.assign_driver')}
          </button>
          <button className="module-btn module-btn-outline"
            onClick={() => { setSelectedOrder(null); setSelectedDriver(''); }}>
            {t('dispatch.cancel')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-rows">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : view === 'board' ? (
        /* ═══════ BOARD VIEW ═══════ */
        <div className="dispatch-board">
          {/* Unassigned */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#f59e0b' }} />
              <h3>{t('dispatch.col.unassigned')}</h3>
              <span className="col-count amber">{board.unassigned?.length || 0}</span>
            </div>
            {board.unassigned?.length === 0
              ? <div className="empty-col">{t("dispatch.no_pending")}</div>
              : board.unassigned.map(o => <OrderCard key={o.id} order={o} showUnassign={false} />)
            }
          </div>

          {/* In Progress */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#3b82f6' }} />
              <h3>{t('dispatch.col.in_progress')}</h3>
              <span className="col-count blue">{board.active_deliveries?.length || 0}</span>
            </div>
            {board.active_deliveries?.length === 0
              ? <div className="empty-col">{t('dispatch.no_active')}</div>
              : board.active_deliveries.map(o => <OrderCard key={o.id} order={o} showUnassign={true} />)
            }
          </div>

          {/* Available Drivers */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#22c55e' }} />
              <h3>{t("dispatch.available_drivers")}</h3>
              <span className="col-count green">{board.available_drivers?.length || 0}</span>
            </div>
            {board.available_drivers?.length === 0
              ? <div className="empty-col">{t('dispatch.no_drivers')}</div>
              : board.available_drivers.map(driver => (
                <div key={driver.id} className="driver-card">
                  <div className="driver-avatar">{driver.full_name?.charAt(0)}</div>
                  <div className="driver-info">
                    <div className="driver-name">{driver.full_name}</div>
                    <div className="driver-meta">{driver.vehicle_type} &bull; {driver.vehicle_plate}</div>
                  </div>
                  <span className="status-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>{t('dispatch.online')}</span>
                </div>
              ))
            }
          </div>
        </div>
      ) : (
        /* ═══════ MAP VIEW ═══════ */
        <div className="dispatch-map-layout">
          <div className="dispatch-map-main">
            {mapMarkers.length === 0 ? (
              <div className="empty-state-mini" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <MapPin width={48} height={48} />
                <p style={{ fontWeight: 600, marginTop: 12 }}>{t('dispatch.map.no_locations')}</p>
                <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                  {t('dispatch.map.no_coords')}
                </p>
              </div>
            ) : (
              <MapView markers={mapMarkers} height={520} />
            )}
            {/* Legend */}
            <div style={{ display:'flex', gap:20, marginTop:10, fontSize:'0.82rem', color:'var(--gray-500)' }}>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }}/>
                {t('dispatch.legend.unassigned')}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#3b82f6', display:'inline-block' }}/>
                {t('dispatch.legend.in_progress')}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/>
                {t('dispatch.legend.drivers')}
              </span>
            </div>
          </div>

          {/* Sidebar mini cards */}
          <div className="dispatch-map-sidebar">
            <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:8, color:'var(--gray-700)' }}>
              {t('dispatch.sidebar.unassigned', { count: board.unassigned?.length || 0 })}
            </div>
            {board.unassigned?.map(o => (
              <OrderCard key={o.id} order={o} showUnassign={false} mini />
            ))}
            <div style={{ fontWeight:700, fontSize:'0.85rem', margin:'12px 0 8px', color:'var(--gray-700)' }}>
              {t('dispatch.sidebar.active', { count: board.active_deliveries?.length || 0 })}
            </div>
            {board.active_deliveries?.map(o => (
              <OrderCard key={o.id} order={o} showUnassign={true} mini />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
