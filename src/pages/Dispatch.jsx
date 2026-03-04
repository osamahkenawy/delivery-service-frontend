import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, DeliveryTruck, MapPin, Refresh, Check, Xmark, WarningTriangle, Map as MapIcon, ViewGrid,
  Weight, Wallet, CreditCard, Box3dPoint, Clock, Calendar, User, Phone, ArrowRight, HandBrake,
} from 'iconoir-react';
import JsBarcode from 'jsbarcode';
import api from '../lib/api';
import MapView from '../components/MapView';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

/* ── Barcode SVG ─────────────────────────────────────────── */
function OrderBarcode({ value }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        width: 1.4,
        height: 36,
        displayValue: false,
        margin: 0,
        background: 'transparent',
        lineColor: '#1e293b',
      });
    } catch {}
  }, [value]);
  if (!value) return null;
  return (
    <div style={{ background:'#f8fafc', borderRadius:8, padding:'8px 10px', textAlign:'center',
      border:'1px solid #e2e8f0', margin:'10px 0 4px' }}>
      <svg ref={svgRef} style={{ width:'100%', maxWidth:220, height:36 }} />
      <div style={{ fontFamily:'monospace', fontSize:10, color:'#64748b', letterSpacing:'0.12em',
        marginTop:2, fontWeight:600 }}>{String(value)}</div>
    </div>
  );
}

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
  const [mainTab, setMainTab]             = useState('deliveries');     // 'deliveries' | 'pickups'

  /* ── Pickup state ── */
  const [pickups, setPickups]             = useState([]);
  const [pickupStats, setPickupStats]     = useState({ pending_pickup: 0, scheduled: 0, picked_up_today: 0, total_awaiting: 0 });
  const [pickupLoading, setPickupLoading] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);  // order being scheduled
  const [scheduleForm, setScheduleForm]   = useState({ scheduled_at: '', scheduled_end: '', driver_id: '', notes: '' });
  const [pickupError, setPickupError]     = useState('');

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mainTab === 'pickups') fetchPickups();
  }, [mainTab]);

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

  const fetchPickups = async () => {
    setPickupLoading(true);
    try {
      const [pendingRes, statsRes] = await Promise.all([
        api.get('/pickup/pending'),
        api.get('/pickup/stats'),
      ]);
      if (pendingRes.success) setPickups(pendingRes.data || []);
      if (statsRes.success) setPickupStats(statsRes.data || {});
    } catch (e) { console.error('Pickup fetch error:', e); }
    finally { setPickupLoading(false); }
  };

  const handleRequestPickup = async (orderId) => {
    try {
      const res = await api.post(`/pickup/${orderId}/request`, {});
      if (res.success) { fetchPickups(); fetchBoard(); }
      else setPickupError(res.message);
    } catch { setPickupError(t('pickup.error_request')); }
  };

  const handleSchedulePickup = async () => {
    if (!scheduleModal || !scheduleForm.scheduled_at) return;
    try {
      const res = await api.post(`/pickup/${scheduleModal.id}/schedule`, scheduleForm);
      if (res.success) { setScheduleModal(null); setScheduleForm({ scheduled_at: '', scheduled_end: '', driver_id: '', notes: '' }); fetchPickups(); }
      else setPickupError(res.message);
    } catch { setPickupError(t('pickup.error_schedule')); }
  };

  const handleAssignPickupDriver = async (orderId, driverId) => {
    try {
      const res = await api.post(`/pickup/${orderId}/assign-driver`, { driver_id: driverId });
      if (res.success) fetchPickups();
      else setPickupError(res.message);
    } catch { setPickupError(t('pickup.error_assign')); }
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
    const barcodeValue = order.order_number || String(order.id);

    const paymentLabel = {
      cod: t('dispatch.payment.cod'),
      prepaid: t('dispatch.payment.prepaid'),
      credit: t('dispatch.payment.credit'),
      wallet: t('dispatch.payment.wallet'),
    }[order.payment_method] || order.payment_method;

    return (
      <div className={mini ? 'dispatch-mini-card' : 'dispatch-card'}>
        {/* Header: order # + status */}
        <div className="dispatch-card-header">
          <div>
            <div className="dispatch-order-id">#{order.order_number || order.id}</div>
            <div className="dispatch-recipient">{order.recipient_name}</div>
          </div>
          <span className="status-badge" style={sc}>{t(`dispatch.status.${order.status}`, order.status)}</span>
        </div>

        {/* Barcode */}
        {!mini && <OrderBarcode value={barcodeValue} />}

        {/* Details rows */}
        {!mini && (
          <div className="dispatch-meta">
            {order.recipient_address && (
              <span><MapPin width={13} height={13} />
                {order.recipient_address.length > 50
                  ? order.recipient_address.slice(0, 50) + '…'
                  : order.recipient_address}
              </span>
            )}
            {(order.recipient_area || order.recipient_emirate) && (
              <span style={{ color:'#64748b', fontSize:11 }}>
                🏙️ {[order.recipient_area, order.recipient_emirate].filter(Boolean).join(', ')}
              </span>
            )}
            {order.zone_name && (
              <span style={{ color:'#7c3aed', fontWeight:600 }}>
                <MapPin width={13} height={13} style={{ color:'#7c3aed' }} /> {order.zone_name}
              </span>
            )}
            {order.driver_name && (
              <span style={{ color:'#16a34a', fontWeight:600 }}>
                <DeliveryTruck width={13} height={13} style={{ color:'#16a34a' }} /> {order.driver_name}
              </span>
            )}
          </div>
        )}

        {/* Extra chips: COD / fee / weight / category */}
        {!mini && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, margin:'8px 0 4px' }}>
            {order.payment_method && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3,
                padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                background: order.payment_method === 'cod' ? '#fef3c7' : '#dbeafe',
                color:       order.payment_method === 'cod' ? '#92400e' : '#1d4ed8' }}>
                <CreditCard width={11} height={11} /> {paymentLabel}
              </span>
            )}
            {order.cod_amount > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3,
                padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                background:'#fef9c3', color:'#713f12' }}>
                <Wallet width={11} height={11} /> AED {parseFloat(order.cod_amount).toFixed(0)}
              </span>
            )}
            {order.delivery_fee > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3,
                padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600,
                background:'#f0fdf4', color:'#166534' }}>
                {t('dispatch.fee')}: AED {parseFloat(order.delivery_fee).toFixed(0)}
              </span>
            )}
            {order.weight_kg > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3,
                padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600,
                background:'#f3f4f6', color:'#374151' }}>
                <Weight width={11} height={11} /> {order.weight_kg} kg
              </span>
            )}
            {order.category && order.category !== 'other' && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3,
                padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600,
                background:'#ede9fe', color:'#5b21b6' }}>
                <Box3dPoint width={11} height={11} />
                {order.category.replace(/_/g,' ')}
              </span>
            )}
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
          <button className="module-btn module-btn-outline" onClick={mainTab === 'pickups' ? fetchPickups : fetchBoard}>
            <Refresh width={16} height={16} /> {t('dispatch.refresh')}
          </button>
        </div>
      </div>

      {/* ── Main Tab Switcher: Deliveries | Pickups ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', margin: '0 0 16px' }}>
        <button
          onClick={() => setMainTab('deliveries')}
          style={{
            padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            border: 'none', background: 'none',
            borderBottom: mainTab === 'deliveries' ? '3px solid #3b82f6' : '3px solid transparent',
            color: mainTab === 'deliveries' ? '#1e40af' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}
        >
          <DeliveryTruck width={16} height={16} /> {t('pickup.tab_deliveries')}
          <span style={{
            background: mainTab === 'deliveries' ? '#dbeafe' : '#f1f5f9',
            color: mainTab === 'deliveries' ? '#1d4ed8' : '#64748b',
            padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          }}>{(board.unassigned?.length || 0) + (board.active_deliveries?.length || 0)}</span>
        </button>
        <button
          onClick={() => setMainTab('pickups')}
          style={{
            padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            border: 'none', background: 'none',
            borderBottom: mainTab === 'pickups' ? '3px solid #f59e0b' : '3px solid transparent',
            color: mainTab === 'pickups' ? '#92400e' : '#64748b',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}
        >
          <HandBrake width={16} height={16} /> {t('pickup.tab_pickups')}
          {pickupStats.total_awaiting > 0 && (
            <span style={{
              background: '#fef3c7', color: '#92400e',
              padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            }}>{pickupStats.total_awaiting}</span>
          )}
        </button>
      </div>

      {/* ═══════════════ DELIVERIES TAB ═══════════════ */}
      {mainTab === 'deliveries' && (<>
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
      </>)}

      {/* ═══════════════ PICKUPS TAB ═══════════════ */}
      {mainTab === 'pickups' && (
        <div>
          {pickupError && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              <WarningTriangle width={16} height={16} /> {pickupError}
              <button onClick={() => setPickupError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                <Xmark width={14} height={14} />
              </button>
            </div>
          )}

          {/* Pickup Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: t('pickup.stat_pending'), value: pickupStats.pending_pickup || 0, color: '#f59e0b', bg: '#fef3c7', icon: <Clock width={20} height={20} color="#f59e0b" /> },
              { label: t('pickup.stat_scheduled'), value: pickupStats.scheduled || 0, color: '#3b82f6', bg: '#dbeafe', icon: <Calendar width={20} height={20} color="#3b82f6" /> },
              { label: t('pickup.stat_picked_today'), value: pickupStats.picked_up_today || 0, color: '#16a34a', bg: '#dcfce7', icon: <Check width={20} height={20} color="#16a34a" /> },
              { label: t('pickup.stat_total_awaiting'), value: pickupStats.total_awaiting || 0, color: '#7c3aed', bg: '#ede9fe', icon: <Package width={20} height={20} color="#7c3aed" /> },
            ].map(s => (
              <div key={s.label} style={{
                background: '#fff', borderRadius: 12, padding: '16px 18px',
                border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Request pickup from unassigned orders */}
          {board.unassigned?.filter(o => !o.pickup_status || o.pickup_status === 'none').length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package width={16} height={16} /> {t('pickup.orders_need_pickup')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {board.unassigned?.filter(o => !o.pickup_status || o.pickup_status === 'none').slice(0, 10).map(o => (
                  <button key={o.id} onClick={() => handleRequestPickup(o.id)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #fde68a', background: '#fff',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#92400e',
                    display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                  }}>
                    <ArrowRight width={12} height={12} /> #{o.order_number}
                    {o.sender_name && <span style={{ color: '#b45309', fontWeight: 400 }}>· {o.sender_name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pickup Cards */}
          {pickupLoading ? (
            <div className="loading-rows">
              {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : pickups.length === 0 ? (
            <div className="empty-state-mini" style={{ padding: '3rem 0', textAlign: 'center' }}>
              <HandBrake width={48} height={48} style={{ color: '#cbd5e1' }} />
              <p style={{ fontWeight: 600, marginTop: 12, color: '#64748b' }}>{t('pickup.no_pending')}</p>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>{t('pickup.no_pending_hint')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {pickups.map(p => {
                const isPending = p.pickup_status === 'pending_pickup';
                const isScheduled = p.pickup_status === 'pickup_scheduled';
                const scheduleTime = p.pickup_scheduled_at ? new Date(p.pickup_scheduled_at) : null;
                const scheduleEnd = p.pickup_scheduled_end ? new Date(p.pickup_scheduled_end) : null;
                return (
                  <div key={p.id} style={{
                    background: '#fff', borderRadius: 14, border: `1px solid ${isPending ? '#fde68a' : '#bfdbfe'}`,
                    overflow: 'hidden', transition: 'box-shadow 0.2s',
                  }}>
                    {/* Card header */}
                    <div style={{
                      padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: isPending ? 'linear-gradient(135deg, #fef3c7, #fef9c3)' : 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isPending ? '#92400e' : '#1d4ed8' }}>
                          #{p.order_number}
                        </div>
                        <div style={{ fontSize: 11, color: isPending ? '#b45309' : '#3b82f6', fontWeight: 600 }}>
                          {isPending ? t('pickup.status_pending') : t('pickup.status_scheduled')}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: isPending ? '#fef3c7' : '#dbeafe',
                        color: isPending ? '#d97706' : '#1d4ed8',
                        border: `1px solid ${isPending ? '#fcd34d' : '#93c5fd'}`,
                      }}>
                        {t(`dispatch.status.${p.status}`)}
                      </span>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Sender / Pickup From */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                          {t('pickup.from_label')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          <User width={13} height={13} style={{ opacity: 0.5 }} />
                          {p.sender_name || p.client_name || '—'}
                        </div>
                        {p.sender_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            <Phone width={11} height={11} style={{ opacity: 0.5 }} /> {p.sender_phone}
                          </div>
                        )}
                        {p.sender_address && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            <MapPin width={11} height={11} style={{ opacity: 0.5 }} />
                            {p.sender_address.length > 60 ? p.sender_address.slice(0, 60) + '…' : p.sender_address}
                          </div>
                        )}
                      </div>

                      {/* Deliver to (brief) */}
                      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                          {t('pickup.deliver_to')}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {p.recipient_name} · {[p.recipient_area, p.recipient_emirate].filter(Boolean).join(', ') || p.recipient_address || '—'}
                        </div>
                      </div>

                      {/* Schedule info */}
                      {isScheduled && scheduleTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', borderRadius: 8, padding: '8px 10px' }}>
                          <Calendar width={14} height={14} color="#3b82f6" />
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                            {scheduleTime.toLocaleDateString('en-AE', { day: '2-digit', month: 'short' })}
                            {' '}
                            {scheduleTime.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
                            {scheduleEnd && (<> — {scheduleEnd.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</>)}
                          </div>
                        </div>
                      )}

                      {/* Pickup driver */}
                      {p.pickup_driver_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', borderRadius: 8, padding: '8px 10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>
                            {p.pickup_driver_name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>{p.pickup_driver_name}</div>
                            <div style={{ fontSize: 10, color: '#16a34a' }}>{t('pickup.pickup_driver')}</div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {p.pickup_notes && (
                        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '0 2px' }}>
                          📋 {p.pickup_notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {isPending && (
                          <button
                            onClick={() => { setScheduleModal(p); setScheduleForm({ scheduled_at: '', scheduled_end: '', driver_id: '', notes: '' }); }}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #93c5fd',
                              background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            }}
                          >
                            <Calendar width={13} height={13} /> {t('pickup.schedule')}
                          </button>
                        )}
                        {!p.pickup_driver_name && (
                          <select
                            onChange={e => { if (e.target.value) handleAssignPickupDriver(p.id, e.target.value); }}
                            defaultValue=""
                            style={{
                              flex: 1, padding: '8px 6px', borderRadius: 8, border: '1px solid #e2e8f0',
                              background: '#fff', fontWeight: 600, fontSize: 12, color: '#475569', cursor: 'pointer',
                            }}
                          >
                            <option value="">{t('pickup.assign_driver')}</option>
                            {board.available_drivers?.map(d => (
                              <option key={d.id} value={d.id}>{d.full_name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Schedule Pickup Modal ── */}
          {scheduleModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }} onClick={() => setScheduleModal(null)}>
              <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  padding: '18px 20px', borderBottom: '1px solid #e2e8f0',
                  fontWeight: 800, fontSize: 16, color: '#1e293b',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Calendar width={18} height={18} color="#3b82f6" />
                  {t('pickup.schedule_title')} — #{scheduleModal.order_number}
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {t('pickup.schedule_start')} *
                    </label>
                    <input type="datetime-local" value={scheduleForm.scheduled_at}
                      onChange={e => setScheduleForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {t('pickup.schedule_end')}
                    </label>
                    <input type="datetime-local" value={scheduleForm.scheduled_end}
                      onChange={e => setScheduleForm(f => ({ ...f, scheduled_end: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {t('pickup.assign_pickup_driver')}
                    </label>
                    <select value={scheduleForm.driver_id}
                      onChange={e => setScheduleForm(f => ({ ...f, driver_id: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
                    >
                      <option value="">{t('pickup.optional_driver')}</option>
                      {board.available_drivers?.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name} — {d.vehicle_type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {t('pickup.notes')}
                    </label>
                    <textarea value={scheduleForm.notes} rows={2}
                      onChange={e => setScheduleForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={t('pickup.notes_placeholder')}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }}
                    />
                  </div>
                </div>
                <div style={{ padding: '0 20px 18px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setScheduleModal(null)} style={{
                    padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc',
                    fontWeight: 700, fontSize: 13, color: '#64748b', cursor: 'pointer',
                  }}>
                    {t('dispatch.cancel')}
                  </button>
                  <button onClick={handleSchedulePickup} disabled={!scheduleForm.scheduled_at} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none',
                    background: scheduleForm.scheduled_at ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e2e8f0',
                    color: scheduleForm.scheduled_at ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 13, cursor: scheduleForm.scheduled_at ? 'pointer' : 'default',
                  }}>
                    <Calendar width={14} height={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {t('pickup.confirm_schedule')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
