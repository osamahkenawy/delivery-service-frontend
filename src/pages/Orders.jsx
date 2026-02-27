import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Plus, Search, EditPencil, Trash, Eye, DeliveryTruck,
  Check, Xmark, NavArrowRight, NavArrowLeft, Filter, Copy,
  Clock, MapPin, User, Phone, Building, Download,
  WarningTriangle, CheckCircle, StatsUpSquare, Wallet,
  DollarCircle, Calendar, Box3dPoint, Hashtag,
  CreditCard, Weight, Prohibition, Refresh, Group, OpenNewWindow, ShareAndroid,
} from 'iconoir-react';
import api from '../lib/api';
import Toast, { useToast } from '../components/Toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* Fix leaflet marker icon paths (Vite) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */
const STATUS_META = {
  pending:    { label:'Pending',    bg:'#fef3c7', color:'#d97706', icon: Clock },
  confirmed:  { label:'Confirmed',  bg:'#dbeafe', color:'#2563eb', icon: Check },
  assigned:   { label:'Assigned',   bg:'#ede9fe', color:'#7c3aed', icon: User },
  picked_up:  { label:'Picked Up',  bg:'#fce7f3', color:'#be185d', icon: Package },
  in_transit: { label:'In Transit', bg:'#e0f2fe', color:'#0369a1', icon: DeliveryTruck },
  delivered:  { label:'Delivered',  bg:'#dcfce7', color:'#16a34a', icon: Check },
  failed:     { label:'Failed',     bg:'#fee2e2', color:'#dc2626', icon: Xmark },
  returned:   { label:'Returned',   bg:'#fff7ed', color:'#ea580c', icon: NavArrowLeft },
  cancelled:  { label:'Cancelled',  bg:'#f1f5f9', color:'#64748b', icon: Prohibition },
};
const ORDER_TYPES   = ['standard','express','same_day','scheduled','return'];
const CATEGORIES    = ['parcel','document','food','grocery','medicine','electronics','fragile','other'];
const EMIRATES      = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'];
const PAYMENT_MAP   = { cod:'Cash on Delivery', prepaid:'Prepaid', credit:'Credit', wallet:'Wallet' };
const INPUT  = { width:'100%', padding:'10px 13px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:14, boxSizing:'border-box', outline:'none' };
const LABEL  = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' };
const LIMIT  = 10;

const STEPS = [
  { num:1, titleKey:'orders.form.step1_title',  descKey:'orders.form.step1_desc' },
  { num:2, titleKey:'orders.form.step2_title', descKey:'orders.form.step2_desc' },
  { num:3, titleKey:'orders.form.step3_title', descKey:'orders.form.step3_desc' },
];

const EMPTY_FORM = {
  client_id:'', sender_name:'', sender_phone:'', sender_address:'',
  sender_lat:'', sender_lng:'',
  recipient_name:'', recipient_phone:'', recipient_email:'', recipient_address:'', recipient_area:'',
  recipient_emirate:'Dubai', recipient_lat:'', recipient_lng:'',
  zone_id:'', order_type:'standard', category:'parcel',
  payment_method:'cod', cod_amount:'', delivery_fee:'', discount:'',
  weight_kg:'', dimensions:'', description:'', special_instructions:'',
  scheduled_at:'', notes:'',
};

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
const fmtDate = (d, language = 'en') => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-AE',{day:'2-digit',month:'short',year:'numeric'}) : '\u2014';
const fmtTime = (d, language = 'en') => d ? new Date(d).toLocaleTimeString(language === 'ar' ? 'ar-AE' : 'en-AE',{hour:'2-digit',minute:'2-digit'}) : '';
const fmtAED  = v => { const n = parseFloat(v); return !isNaN(n) && n > 0 ? `AED ${n.toFixed(2)}` : '\u2014'; };
const fmtType = t => t ? t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '\u2014';

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */
function Avatar({ name, size = 44 }) {
  const initials = name?.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('') || '?';
  const hue = (name?.charCodeAt(0)||0) % 360;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%',
      background:`hsl(${hue},55%,46%)`, color:'#fff', fontWeight:700,
      fontSize:size*0.36, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      {initials}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'20px 22px', flex:1, minWidth:155,
      boxShadow:'0 1px 4px rgba(0,0,0,0.08)', borderTop:`3px solid ${color}` }}>
      <div style={{ width:38, height:38, borderRadius:10, background:color+'18',
        display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
        <Icon width={21} height={21} color={color} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize:30, fontWeight:900, color:'#1e293b', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:13, color:'#64748b', marginTop:5, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const { t } = useTranslation();
  const m = STATUS_META[status] || STATUS_META.pending;
  const Icon = m.icon;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
      borderRadius:20, fontSize:12, fontWeight:700, background:m.bg, color:m.color }}>
      <Icon width={12} height={12} />{t(`orders.status.${status}`)}
    </span>
  );
}

/* ── Order Number Tooltip ── */
function OrderNumCell({ orderNumber, trackingToken, onCopyToken, copied }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [show, setShow] = useState(false);
  const displayNum = orderNumber ? orderNumber.substring(0, 5) + (orderNumber.length > 5 ? '…' : '') : '—';
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderNumber).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    });
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, cursor: 'default', letterSpacing: '.02em' }}>
        {displayNum}
      </div>
      {show && (
        <div style={{
          position: 'absolute', [isRTL?'right':'left']: 0, top: '110%', zIndex: 9999,
          background: '#1e293b', color: '#fff', borderRadius: 10,
          padding: '10px 14px', minWidth: 230, boxShadow: '0 8px 24px rgba(0,0,0,.22)',
          pointerEvents: 'all',
        }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}>
          {/* Arrow */}
          <div style={{ position: 'absolute', top: -7, [isRTL?'right':'left']: 14, width: 14, height: 14, background: '#1e293b', transform: 'rotate(45deg)', borderRadius: 2 }} />
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{t('orders.tooltip.order_number')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '.03em',
              color: '#f97316', userSelect: 'all', cursor: 'text',
            }}>{orderNumber}</span>
            <button
              onClick={handleCopy}
              title="Copy order number"
              style={{
                background: justCopied ? '#22c55e' : 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 600,
                transition: 'background .2s', flexShrink: 0,
              }}>
              {justCopied ? t('orders.tooltip.copied') : <Copy width={12} height={12} />}
            </button>
          </div>
          {trackingToken && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{t('orders.tooltip.tracking_token')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', userSelect: 'all', cursor: 'text' }}>{trackingToken}</span>
                <button
                  onClick={e => { e.stopPropagation(); onCopyToken(trackingToken); }}
                  title="Copy tracking token"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}>
                  <Copy width={11} height={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepBar({ current, t }) {
  const isMobile = window.innerWidth <= 768;
  const stepSize = isMobile ? 28 : 32;
  const fontSize = isMobile ? 12 : 14;
  const titleFontSize = isMobile ? 11 : 12;
  const descFontSize = isMobile ? 9 : 10;
  
  return (
    <div style={{ display:'flex', padding: isMobile ? '14px 20px 0' : '18px 28px 0', position:'relative' }}>
      {STEPS.map((s, i) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
            {i < STEPS.length - 1 && (
              <div style={{ position:'absolute', top:stepSize/2 - 1.5, left:'50%', width:'100%', height:3,
                background: done ? '#f97316' : '#e2e8f0', borderRadius:2, zIndex:0 }} />
            )}
            <div style={{ width:stepSize, height:stepSize, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:fontSize, zIndex:1,
              background: done ? '#f97316' : active ? '#fff' : '#f1f5f9',
              color: done ? '#fff' : active ? '#f97316' : '#94a3b8',
              border: active ? '2px solid #f97316' : done ? '2px solid #f97316' : '2px solid #e2e8f0' }}>
              {done ? <Check width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} /> : s.num}
            </div>
            <div style={{ marginTop: isMobile ? 6 : 8, textAlign:'center' }}>
              <div style={{ fontSize:titleFontSize, fontWeight:700, color: active||done ? '#1e293b' : '#94a3b8' }}>
                {t(s.titleKey)}
              </div>
              {!isMobile && <div style={{ fontSize:descFontSize, color:'#94a3b8', marginTop:1 }}>{t(s.descKey)}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Address search (Nominatim) */
function AddressSearch({ onSelect }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [q, setQ]         = useState('');
  const [results, setRes] = useState([]);
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);
  const timer             = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const search = (val) => {
    setQ(val);
    clearTimeout(timer.current);
    if (val.length < 3) { setRes([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=ae&limit=5`);
        const data = await r.json();
        setRes(data); setOpen(true);
      } catch { setRes([]); }
    }, 400);
  };

  return (
    <div ref={ref} style={{ position:'relative', gridColumn:'1/-1' }}>
      <label style={LABEL}>{t('orders.form.search_address')}</label>
      <div style={{ position:'relative' }}>
        <Search width={14} height={14} style={{ position:'absolute', [isRTL?'right':'left']:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
        <input value={q} onChange={e=>search(e.target.value)} onFocus={()=>results.length&&setOpen(true)}
          style={{ ...INPUT, [isRTL?'paddingRight':'paddingLeft']:34 }} placeholder={t('orders.placeholders.search_address')} />
      </div>
      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', borderRadius:10,
          boxShadow:'0 8px 30px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0', zIndex:50, maxHeight:220, overflowY:'auto', marginTop:4 }}>
          {results.map((r,i) => (
            <div key={i} onClick={() => { onSelect({ lat:r.lat, lng:r.lon, display:r.display_name }); setQ(r.display_name.split(',')[0]); setOpen(false); }}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc', fontSize:13, color:'#1e293b' }}
              onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
              onMouseOut={e=>e.currentTarget.style.background='#fff'}>
              <div style={{ fontWeight:600 }}>{r.display_name.split(',')[0]}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{r.display_name.split(',').slice(1,3).join(',')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Map click handler ── */
function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
}
function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.6 }); }, [center]);
  return null;
}

/* Location picker map for order form */
function LocationPickerMap({ lat, lng, onPick }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const center = (lat && lng) ? [parseFloat(lat), parseFloat(lng)] : [25.2048, 55.2708]; // Dubai default
  const hasPin = lat && lng;
  const isMobile = window.innerWidth <= 768;
  const mapHeight = isMobile ? 180 : 240;
  
  return (
    <div style={{ gridColumn:'1/-1' }}>
      <label style={LABEL}>
        <MapPin width={12} height={12} style={{ [isRTL?'marginLeft':'marginRight']:4, verticalAlign:'middle' }} />
        {t('orders.form.pin_location')} <span style={{ fontWeight:400, textTransform:'none', fontSize:11, color:'#94a3b8' }}>
          {isMobile ? ` — ${t('orders.form.tap_map')}` : ` — ${t('orders.form.click_map')}`}
        </span>
      </label>
      <div style={{ borderRadius: isMobile ? 8 : 12, overflow:'hidden', border:'1.5px solid #e2e8f0', 
        height: mapHeight, position:'relative' }}>
        <MapContainer center={center} zoom={hasPin ? 15 : 11} style={{ height:'100%', width:'100%' }}
          scrollWheelZoom={!isMobile} doubleClickZoom={false} attributionControl={false}
          dragging={!isMobile} touchZoom={isMobile}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onClick={(latlng) => onPick(latlng.lat, latlng.lng)} />
          {hasPin && <FlyTo center={center} />}
          {hasPin && <Marker position={center} />}
        </MapContainer>
        {hasPin && (
          <div style={{ position:'absolute', bottom: isMobile ? 4 : 8, [isRTL?'right':'left']: isMobile ? 4 : 8, 
            background:'rgba(0,0,0,.7)', color:'#fff',
            borderRadius:6, padding: isMobile ? '2px 6px' : '4px 10px', 
            fontSize: isMobile ? 10 : 11, fontWeight:600, zIndex:999, backdropFilter:'blur(4px)' }}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function Orders() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  /* state */
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState({});
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [filters,    setFilters]    = useState({ status:'', search:'', date_from:'', date_to:'', order_type:'', client_id:'' });
  const [showForm,   setShowForm]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [drawer,     setDrawer]     = useState(null);
  const [drawerFull, setDrawerFull] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [step,       setStep]       = useState(1);
  const [formError,  setFormError]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [zones,      setZones]      = useState([]);
  const [clients,    setClients]    = useState([]);
  const [drivers,    setDrivers]    = useState([]);
  const { toasts, showToast } = useToast();
  const [copied,     setCopied]     = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [driverPicker, setDriverPicker] = useState(null); // { orderId } when open
  const [driverSearch, setDriverSearch] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(null); // driver.id being assigned
  const debounceRef = useRef(null);
  const didAutoOpen = useRef(false);

  /* Auto-open new order if ?client_id= is in the URL (from Clients drawer) */
  useEffect(() => {
    if (didAutoOpen.current) return;
    const cid = searchParams.get('client_id');
    if (cid && clients.length > 0) {
      const c = clients.find(cl => String(cl.id) === String(cid));
      if (c) {
        openNew(c);
        setSearchParams({}, { replace: true });
        didAutoOpen.current = true;
      }
    }
  }, [clients, searchParams]);

  /* data fetching */
  useEffect(() => { fetchOrders(); }, [page, filters.status, filters.date_from, filters.date_to, filters.order_type, filters.client_id]);
  useEffect(() => { fetchDropdowns(); fetchStats(); }, []);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(), 350);
    return () => clearTimeout(debounceRef.current);
  }, [filters.search]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (filters.status)     p.append('status', filters.status);
      if (filters.search)     p.append('search', filters.search);
      if (filters.date_from)  p.append('date_from', filters.date_from);
      if (filters.date_to)    p.append('date_to', filters.date_to);
      if (filters.order_type) p.append('order_type', filters.order_type);
      if (filters.client_id)  p.append('client_id', filters.client_id);
      const res = await api.get(`/orders?${p}`);
      if (res.success) {
        setOrders(res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/orders/stats');
      if (res.success) setStats(res.data || {});
    } catch {}
  };

  const fetchDropdowns = async () => {
    try {
      const [zRes, cRes, dRes] = await Promise.all([
        api.get('/zones'), api.get('/clients?limit=500'), api.get('/drivers?limit=500')
      ]);
      if (zRes.success) setZones(zRes.data || []);
      if (cRes.success) setClients(cRes.data || []);
      if (dRes.success) setDrivers(dRes.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchOrderDetail = async (orderId) => {
    setDrawerLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.success) setDrawerFull(res.data);
    } catch {}
    finally { setDrawerLoading(false); }
  };

  /* form helpers */
  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'client_id' && v) {
        const c = clients.find(cl => String(cl.id) === String(v));
        if (c) {
          // Auto-fill sender info
          next.sender_name    = c.full_name || '';
          next.sender_phone   = c.phone || '';
          next.sender_address = [c.address_line1, c.area, c.city].filter(Boolean).join(', ');
          next.sender_lat     = c.latitude || '';
          next.sender_lng     = c.longitude || '';
          // Auto-fill delivery/recipient defaults from client location
          next.recipient_address = [c.address_line1, c.area, c.city].filter(Boolean).join(', ');
          next.recipient_area    = c.area || '';
          next.recipient_emirate = c.emirate || 'Dubai';
          next.recipient_lat     = c.latitude || '';
          next.recipient_lng     = c.longitude || '';
          next.recipient_email   = c.email || '';
          if (c.zone_id) next.zone_id = String(c.zone_id);
        }
      }
      if (k === 'client_id' && !v) {
        next.sender_name = ''; next.sender_phone = ''; next.sender_address = '';
        next.sender_lat = ''; next.sender_lng = '';
        // Clear recipient auto-fill too
        next.recipient_address = ''; next.recipient_area = '';
        next.recipient_emirate = 'Dubai'; next.recipient_lat = ''; next.recipient_lng = '';
        next.recipient_email = '';
        next.zone_id = '';
      }
      return next;
    });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.client_id && !form.sender_name) return t('orders.validation.select_client_or_sender');
      if (!form.client_id && !form.sender_phone) return t('orders.validation.sender_phone_required');
    }
    if (step === 2) {
      if (!form.recipient_name) return t('orders.validation.recipient_name_required');
      if (!form.recipient_phone) return t('orders.validation.recipient_phone_required');
      if (!form.recipient_address) return t('orders.validation.delivery_address_required');
    }
    // Validate numeric ranges on final step
    if (step === STEPS.length) {
      const w = parseFloat(form.weight_kg);
      if (form.weight_kg !== '' && (isNaN(w) || w < 0 || w > 99999))
        return t('orders.validation.weight_range');
      const cod = parseFloat(form.cod_amount);
      if (form.cod_amount !== '' && (isNaN(cod) || cod < 0 || cod > 99999999))
        return t('orders.validation.cod_range');
      const fee = parseFloat(form.delivery_fee);
      if (form.delivery_fee !== '' && (isNaN(fee) || fee < 0 || fee > 99999999))
        return t('orders.validation.fee_range');
      const disc = parseFloat(form.discount);
      if (form.discount !== '' && (isNaN(disc) || disc < 0 || disc > 99999999))
        return t('orders.validation.discount_range');
    }
    return null;
  };

  const nextStep = (e) => {
    e.preventDefault(); e.stopPropagation();
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError('');
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const prevStep = (e) => {
    e.preventDefault(); e.stopPropagation();
    setFormError('');
    setStep(s => Math.max(s - 1, 1));
  };

  const openNew = (presetClient) => {
    setSelected(null);
    const f = { ...EMPTY_FORM };
    if (presetClient) {
      f.client_id = String(presetClient.id);
      f.sender_name = presetClient.full_name || '';
      f.sender_phone = presetClient.phone || '';
      f.sender_address = [presetClient.address_line1, presetClient.area, presetClient.city].filter(Boolean).join(', ');
      f.sender_lat = presetClient.latitude || '';
      f.sender_lng = presetClient.longitude || '';
      // Also pre-fill delivery defaults from client
      f.recipient_address = [presetClient.address_line1, presetClient.area, presetClient.city].filter(Boolean).join(', ');
      f.recipient_area    = presetClient.area || '';
      f.recipient_emirate = presetClient.emirate || 'Dubai';
      f.recipient_lat     = presetClient.latitude || '';
      f.recipient_lng     = presetClient.longitude || '';
      f.recipient_email   = presetClient.email || '';
      if (presetClient.zone_id) f.zone_id = String(presetClient.zone_id);
    }
    setForm(f);
    setStep(1); setFormError(''); setShowForm(true);
  };

  const openEdit = (order) => {
    setSelected(order);
    setForm({
      client_id:          order.client_id          || '',
      sender_name:        order.sender_name        || '',
      sender_phone:       order.sender_phone       || '',
      sender_address:     order.sender_address     || '',
      sender_lat:         order.sender_lat         || '',
      sender_lng:         order.sender_lng         || '',
      recipient_name:     order.recipient_name     || '',
      recipient_phone:    order.recipient_phone    || '',
      recipient_email:    order.recipient_email    || '',
      recipient_address:  order.recipient_address  || '',
      recipient_area:     order.recipient_area     || '',
      recipient_emirate:  order.recipient_emirate  || 'Dubai',
      recipient_lat:      order.recipient_lat      || '',
      recipient_lng:      order.recipient_lng      || '',
      zone_id:            order.zone_id            || '',
      order_type:         order.order_type         || 'standard',
      category:           order.category           || 'parcel',
      payment_method:     order.payment_method     || 'cod',
      cod_amount:         order.cod_amount         || '',
      delivery_fee:       order.delivery_fee       || '',
      discount:           order.discount           || '',
      weight_kg:          order.weight_kg          || '',
      dimensions:         order.dimensions         || '',
      description:        order.description        || '',
      special_instructions: order.special_instructions || '',
      scheduled_at:       order.scheduled_at ? order.scheduled_at.slice(0,16) : '',
      notes:              order.notes              || '',
    });
    setStep(1); setFormError(''); setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setSelected(null); setForm(EMPTY_FORM); setFormError(''); setStep(1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== STEPS.length) return;
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError(''); setSaving(true);
    try {
      const payload = { ...form };
      ['cod_amount','delivery_fee','discount','weight_kg'].forEach(k => {
        if (payload[k] === '') payload[k] = 0;
      });
      const res = selected
        ? await api.put(`/orders/${selected.id}`, payload)
        : await api.post('/orders', payload);
      if (res.success) {
        closeForm();
        fetchOrders();
        fetchStats();
        showToast(selected ? t('orders.toast.updated') : `${t('orders.toast.created')} \u2014 ${res.data?.order_number || ''}`);
      } else {
        setFormError(res.message || t('orders.toast.save_failed'));
      }
    } catch { setFormError(t('orders.toast.network_error')); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (orderId, newStatus, note = '') => {
    // If changing to "assigned", show driver picker instead of direct status change
    if (newStatus === 'assigned') {
      const order = drawerFull || drawer;
      if (!order?.driver_id) {
        setDriverPicker({ orderId });
        setDriverSearch('');
        return;
      }
    }
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus, note });
      if (res.success) {
        fetchOrders(); fetchStats();
        showToast(t('orders.toast.status_updated', { status: t(`orders.status.${newStatus}`) }));
        if (drawerFull && drawerFull.id === orderId) {
          setDrawerFull(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        showToast(res.message || t('orders.toast.status_failed'), 'error');
      }
    } catch { showToast(t('orders.toast.status_network_error'), 'error'); }
  };

  const handleAssignDriver = async (driverId) => {
    if (!driverPicker) return;
    setAssigningDriver(driverId);
    try {
      const res = await api.patch(`/orders/${driverPicker.orderId}/assign-driver`, { driver_id: driverId });
      if (res.success) {
        fetchOrders(); fetchStats();
        const driver = drivers.find(d => d.id === driverId);
        showToast(t('orders.toast.driver_assigned', { name: driver?.full_name || '' }));
        if (drawerFull && drawerFull.id === driverPicker.orderId) {
          setDrawerFull(prev => ({ ...prev, status: 'assigned', driver_id: driverId, driver_name: driver?.full_name }));
        }
        setDriverPicker(null);
      } else {
        showToast(res.message || t('orders.toast.assign_failed'), 'error');
      }
    } catch { showToast(t('orders.toast.status_network_error'), 'error'); }
    finally { setAssigningDriver(null); }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) return;
    const { id } = cancelConfirm;
    setCancelConfirm(null);
    await handleStatusChange(id, 'cancelled', 'Cancelled by admin');
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token).then(() => { setCopied(token); setTimeout(() => setCopied(''), 1500); });
  };

  const openDrawer = (order) => {
    setDrawer(order);
    setDrawerFull(null);
    fetchOrderDetail(order.id);
  };

  /* CSV export — fetches ALL orders with current filters */
  const [exporting, setExporting] = useState(false);
  const exportCSV = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams({ page: 1, limit: 10000 });
      if (filters.status)     p.append('status', filters.status);
      if (filters.search)     p.append('search', filters.search);
      if (filters.date_from)  p.append('date_from', filters.date_from);
      if (filters.date_to)    p.append('date_to', filters.date_to);
      if (filters.order_type) p.append('order_type', filters.order_type);
      if (filters.client_id)  p.append('client_id', filters.client_id);
      const res = await api.get(`/orders?${p}`);
      const allOrders = res.success ? (res.data || []) : [];
      if (!allOrders.length) { setExporting(false); return; }
      const headers = ['Order #','Status','Client','Recipient','Phone','Emirate','Zone','Type','Payment','COD Amount','Delivery Fee','Date'];
      const rows = allOrders.map(o => [
        o.order_number, o.status, o.client_name||'Walk-in', o.recipient_name, o.recipient_phone,
        o.recipient_emirate, o.zone_name||'', o.order_type, o.payment_method,
        o.cod_amount||0, o.delivery_fee||0, fmtDate(o.created_at)
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type:'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  const clearFilters = () => setFilters({ status:'', search:'', date_from:'', date_to:'', order_type:'', client_id:'' });
  const hasFilters = filters.status || filters.search || filters.date_from || filters.date_to || filters.order_type || filters.client_id;
  const totalPages = Math.ceil(total / LIMIT);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding:'28px 32px', maxWidth:1400, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:26, fontWeight:900, color:'#1e293b' }}>{t('orders.title')}</h2>
          <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:14 }}>
            {total > 0 ? t('orders.subtitle_count', { count: total }) : t('orders.subtitle_empty')}
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => navigate('/shipment-tracking')} title="Track shipments"
            style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #bfdbfe',
              background:'#eff6ff', cursor:'pointer', fontWeight:600, fontSize:14,
              color:'#2563eb', display:'flex', alignItems:'center', gap:7 }}>
            <MapPin width={15} height={15} /> {t('orders.actions.track')}
          </button>
          <button onClick={() => navigate('/dispatch')} title="Dispatch board"
            style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #d9f99d',
              background:'#f7fee7', cursor:'pointer', fontWeight:600, fontSize:14,
              color:'#65a30d', display:'flex', alignItems:'center', gap:7 }}>
            <DeliveryTruck width={15} height={15} /> {t('orders.actions.dispatch')}
          </button>
          <button onClick={exportCSV} disabled={exporting} title="Export all orders as CSV"
            style={{ padding:'10px 16px', borderRadius:10, border:'1px solid #e2e8f0',
              background: exporting ? '#f8fafc' : '#fff',
              cursor: exporting ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:14,
              color: exporting ? '#94a3b8' : '#475569',
              display:'flex', alignItems:'center', gap:7 }}>
            <Download width={15} height={15} /> {exporting ? t('orders.actions.exporting') : t('orders.actions.export')}
          </button>
          <button onClick={() => openNew()}
            style={{ padding:'10px 22px', borderRadius:10, border:'none',
              background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff',
              cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:7,
              boxShadow:'0 4px 14px rgba(249,115,22,0.3)' }}>
            <Plus width={16} height={16} /> {t('orders.new_order')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <KPICard icon={Package}       label={t('orders.stats.total_orders')}  value={stats.total || 0}      sub={t('orders.stats.today_count', { count: stats.today||0 })}       color="#244066" />
        <KPICard icon={Clock}         label={t('orders.stats.pending')}       value={stats.pending || 0}     sub={t('orders.stats.awaiting_confirmation')}            color="#d97706" />
        <KPICard icon={DeliveryTruck} label={t('orders.stats.in_transit')}    value={stats.in_transit || 0}  sub={t('orders.stats.picked_up_count', { count: stats.picked_up||0 })} color="#0369a1" />
        <KPICard icon={CheckCircle}   label={t('orders.stats.delivered')}     value={stats.delivered || 0}   sub={fmtAED(stats.total_revenue)}       color="#16a34a" />
      </div>

      {/* Status filter chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <button onClick={() => setFilters(f=>({...f, status:''}))}
          style={{ padding:'6px 16px', borderRadius:20, border: !filters.status ? '2px solid #244066' : '1px solid #e2e8f0',
            background: !filters.status ? '#eff6ff' : '#fff', color: !filters.status ? '#244066' :'#64748b',
            cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {t('orders.filters.all_with_count', { count: stats.total||0 })}
        </button>
        {Object.entries(STATUS_META).map(([k,m]) => (
          <button key={k} onClick={() => setFilters(f=>({...f, status: f.status===k ? '' : k}))}
            style={{ padding:'6px 14px', borderRadius:20,
              border: filters.status===k ? `2px solid ${m.color}` : '1px solid #e2e8f0',
              background: filters.status===k ? m.bg : '#fff', color: filters.status===k ? m.color : '#64748b',
              cursor:'pointer', fontWeight:600, fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:m.color }} />
            {t(`orders.status.${k}`)} ({stats[k]||0})
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:220 }}>
          <Search width={15} height={15} style={{ position:'absolute', [isRTL?'right':'left']:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input type="text" placeholder={t('orders.filters.search_placeholder')}
            value={filters.search} onChange={e => setFilters(f=>({...f, search:e.target.value}))}
            style={{ ...INPUT, [isRTL?'paddingRight':'paddingLeft']:36, background:'#fff' }} />
        </div>
        <select value={filters.order_type} onChange={e=>setFilters(f=>({...f, order_type:e.target.value}))}
          style={{ ...INPUT, width:140, background:'#fff' }}>
          <option value="">{t('orders.filters.all_types')}</option>
          {ORDER_TYPES.map(t => <option key={t} value={t}>{fmtType(t)}</option>)}
        </select>
        <select value={filters.client_id} onChange={e=>setFilters(f=>({...f, client_id:e.target.value}))}
          style={{ ...INPUT, width:180, background:'#fff' }}>
          <option value="">{t('orders.filters.all_clients')}</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` (${c.company_name})` : ''}</option>)}
        </select>
        <input type="date" value={filters.date_from} onChange={e=>setFilters(f=>({...f, date_from:e.target.value}))}
          style={{ ...INPUT, width:140 }} />
        <span style={{ color:'#94a3b8', fontSize:13 }}>{t('orders.filters.to')}</span>
        <input type="date" value={filters.date_to} onChange={e=>setFilters(f=>({...f, date_to:e.target.value}))}
          style={{ ...INPUT, width:140 }} />
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding:'10px 14px', borderRadius:9, border:'1px solid #fecaca', background:'#fff5f5',
              color:'#dc2626', cursor:'pointer', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
            <Xmark width={14} height={14} /> {t('common.clear')}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
         ORDERS TABLE
         ══════════════════════════════════════════════════════ */}
      <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'#94a3b8' }}>{t('orders.loading')}</div>
        ) : orders.length === 0 ? (
          <div style={{ padding:60, textAlign:'center' }}>
            <Package width={48} height={48} style={{ color:'#cbd5e1', marginBottom:16 }} />
            <h3 style={{ color:'#1e293b', fontSize:16, fontWeight:700 }}>{t('orders.empty.title')}</h3>
            <p style={{ color:'#94a3b8', fontSize:14, marginBottom:18 }}>
              {hasFilters ? t('orders.empty.subtitle_filter') : t('orders.empty.subtitle_new')}
            </p>
            {!hasFilters && (
              <button onClick={() => openNew()}
                style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'#f97316', color:'#fff',
                  cursor:'pointer', fontWeight:700, fontSize:14 }}>
                <Plus width={16} height={16} /> {t('orders.new_order')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
                    {[t('orders.table.order_num'),t('orders.table.status'),t('orders.table.client_sender'),t('orders.table.recipient'),t('orders.table.zone'),t('orders.table.type'),t('orders.table.payment'),t('orders.table.fee'),t('orders.table.date'),''].map(h => (
                      <th key={h} style={{ padding:'12px 16px', textAlign: isRTL ? 'right' : 'left', fontWeight:700, fontSize:12,
                        color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} onClick={() => openDrawer(o)}
                      style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer', transition:'background 0.15s' }}
                      onMouseOver={e=>e.currentTarget.style.background='#fafbfc'}
                      onMouseOut={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{ padding:'13px 16px' }}>
                        <OrderNumCell
                          orderNumber={o.order_number}
                          trackingToken={o.tracking_token}
                          onCopyToken={copyToken}
                          copied={copied}
                        />
                      </td>
                      <td style={{ padding:'13px 16px' }}><StatusPill status={o.status} /></td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={o.client_name || o.sender_name || t('orders.walk_in')} size={34} />
                          <div>
                            <div style={{ fontWeight:600, color:'#1e293b', fontSize:13 }}>
                              {o.client_name || o.sender_name || t('orders.walk_in')}
                            </div>
                            {o.client_name && (
                              <div style={{ fontSize:11, color:'#94a3b8' }}>
                                <Building width={10} height={10} style={{ verticalAlign:'middle', [isRTL?'marginLeft':'marginRight']:3 }} />
                                {t('orders.table.client_label')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ fontWeight:600, color:'#1e293b', fontSize:13 }}>{o.recipient_name}</div>
                        <div style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:3 }}>
                          <Phone width={10} height={10} /> {o.recipient_phone}
                        </div>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#475569' }}>
                          <MapPin width={13} height={13} color="#94a3b8" />
                          {o.zone_name || o.recipient_emirate || '\u2014'}
                        </div>
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                          background:'#f1f5f9', color:'#475569' }}>
                          {fmtType(o.order_type)}
                        </span>
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:12, color:'#64748b' }}>
                        {t(`orders.payment.${o.payment_method}`) || o.payment_method}
                        {parseFloat(o.cod_amount) > 0 && (
                          <div style={{ fontSize:11, color:'#d97706', fontWeight:600, marginTop:2 }}>
                            COD {fmtAED(o.cod_amount)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'13px 16px', fontWeight:700, color:'#1e293b', fontSize:14 }}>
                        {fmtAED(o.delivery_fee)}
                      </td>
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ fontSize:13, color:'#475569' }}>{fmtDate(o.created_at)}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{fmtTime(o.created_at)}</div>
                      </td>
                      <td style={{ padding:'13px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => openEdit(o)} title="Edit"
                            style={{ padding:'6px 11px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff',
                              cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:5 }}>
                            <EditPencil width={13} height={13} /> {t('orders.actions.edit')}
                          </button>
                          {o.tracking_token && (
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/track/${o.tracking_token}`); showToast(t('orders.toast.tracking_copied')); }} title="Copy public tracking link"
                              style={{ padding:'6px 8px', borderRadius:8, border:'1px solid #bbf7d0', background:'#f0fdf4',
                                color:'#16a34a', cursor:'pointer', display:'flex', alignItems:'center' }}>
                              <ShareAndroid width={13} height={13} />
                            </button>
                          )}
                          {o.tracking_token && (
                            <button onClick={() => window.open(`/track/${o.tracking_token}`, '_blank')} title="Live track"
                              style={{ padding:'6px 8px', borderRadius:8, border:'1px solid #bfdbfe', background:'#eff6ff',
                                color:'#2563eb', cursor:'pointer', display:'flex', alignItems:'center' }}>
                              <OpenNewWindow width={13} height={13} />
                            </button>
                          )}
                          {!['delivered','cancelled','returned'].includes(o.status) && (
                            <button onClick={() => setCancelConfirm(o)} title="Cancel"
                              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #fecaca',
                                background:'#fff5f5', color:'#dc2626', cursor:'pointer', display:'flex', alignItems:'center' }}>
                              <Xmark width={13} height={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (() => {
              /* build visible page numbers: always show first, last, current ±2, with ellipsis */
              const delta = 2;
              const range = [];
              for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
              const pages = [1, ...range, totalPages].filter((v,i,a) => a.indexOf(v) === i).sort((a,b)=>a-b);
              const btnBase = { padding:'7px 11px', borderRadius:8, border:'1px solid #e2e8f0',
                fontSize:13, fontWeight:600, cursor:'pointer', minWidth:36, textAlign:'center' };
              return (
                <div style={{ padding:'14px 18px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                  <span style={{ fontSize:13, color:'#64748b' }}>
                    {t('common.showing')} {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} {t('common.of')} <strong>{total}</strong> {t('common.orders')}
                  </span>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                      style={{ ...btnBase, background:page===1?'#f8fafc':'#fff', cursor:page===1?'not-allowed':'pointer',
                        display:'flex', alignItems:'center', gap:4, opacity:page===1?0.5:1 }}>
                      {isRTL ? <NavArrowRight width={14} height={14} /> : <NavArrowLeft width={14} height={14} />} {t('orders.pagination.prev')}
                    </button>
                    {pages.map((p2, i) => {
                      const prev = pages[i - 1];
                      return (
                        <>
                          {prev && p2 - prev > 1 && (
                            <span key={`e${p2}`} style={{ padding:'7px 4px', fontSize:13, color:'#94a3b8' }}>…</span>
                          )}
                          <button key={p2} onClick={() => setPage(p2)}
                            style={{ ...btnBase,
                              background: p2 === page ? '#244066' : '#fff',
                              color: p2 === page ? '#fff' : '#374151',
                              border: p2 === page ? '1px solid #244066' : '1px solid #e2e8f0',
                              fontWeight: p2 === page ? 800 : 600 }}>
                            {p2}
                          </button>
                        </>
                      );
                    })}
                    <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}
                      style={{ ...btnBase, background:page>=totalPages?'#f8fafc':'#fff', cursor:page>=totalPages?'not-allowed':'pointer',
                        display:'flex', alignItems:'center', gap:4, opacity:page>=totalPages?0.5:1 }}>
                      {t('orders.pagination.next')} {isRTL ? <NavArrowLeft width={14} height={14} /> : <NavArrowRight width={14} height={14} />}
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
         ORDER DETAIL DRAWER
         ══════════════════════════════════════════════════════ */}
      {drawer && (
        <>
          <div onClick={() => { setDrawer(null); setDrawerFull(null); }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:9990 }} />
          <div style={{ position:'fixed', top:0, [isRTL?'left':'right']:0, bottom:0, width:540, maxWidth:'96vw',
            background:'#f8fafc', zIndex:9991, overflowY:'auto',
            boxShadow: isRTL ? '8px 0 40px rgba(0,0,0,0.14)' : '-8px 0 40px rgba(0,0,0,0.14)', display:'flex', flexDirection:'column' }}>

            {/* Drawer Header */}
            <div style={{ background:'linear-gradient(135deg,#1e293b,#334155)', padding:'26px 26px 22px', position:'relative' }}>
              <button onClick={() => { setDrawer(null); setDrawerFull(null); }}
                style={{ position:'absolute', top:14, [isRTL?'left':'right']:14, background:'rgba(255,255,255,0.1)',
                  border:'none', color:'#fff', width:30, height:30, borderRadius:'50%',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Xmark width={15} height={15} />
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'#f9731620',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Package width={24} height={24} color="#f97316" />
                </div>
                <div>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{drawer.order_number}</div>
                  <div style={{ color:'#94a3b8', fontSize:13, fontFamily:'monospace', display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <Copy width={11} height={11} style={{ cursor:'pointer' }} onClick={() => copyToken(drawer.tracking_token)} />
                    {drawer.tracking_token}
                    {copied === drawer.tracking_token && <span style={{ color:'#16a34a', fontSize:11 }}>{t('orders.drawer.copied')}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                <StatusPill status={drawerFull?.status || drawer.status} />
                <select value={drawerFull?.status || drawer.status}
                  onChange={e => handleStatusChange(drawer.id, e.target.value)}
                  style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)',
                    background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  {Object.entries(STATUS_META).map(([k,m]) => <option key={k} value={k} style={{ color:'#1e293b' }}>{t(`orders.status.${k}`)}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:14 }}>
                <button onClick={() => { setDrawer(null); setDrawerFull(null); openEdit(drawerFull || drawer); }}
                  style={{ flex:1, padding:'10px', borderRadius:10, border:'none',
                    background:'#f97316', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  <EditPencil width={15} height={15} /> {t('orders.actions.edit')}
                </button>
                {drawer.tracking_token && (
                  <button onClick={() => window.open(`/track/${drawer.tracking_token}`, '_blank')}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:'none',
                      background:'#2563eb', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    <OpenNewWindow width={14} height={14} /> {t('orders.actions.track_live')}
                  </button>
                )}
                {!['delivered','cancelled','returned'].includes(drawer.status) && (
                  <button onClick={() => { setDrawer(null); setCancelConfirm(drawer); }}
                    style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.2)',
                      background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                    <Prohibition width={14} height={14} /> {t('orders.actions.cancel_order')}
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ padding:22, flex:1 }}>
              {drawerLoading ? (
                <div style={{ textAlign:'center', padding:50, color:'#94a3b8' }}>{t('orders.drawer.loading')}</div>
              ) : drawerFull ? (
                <>
                  {/* Quick stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                    {[
                      { label:t('orders.drawer.delivery_fee'),  value:fmtAED(drawerFull.delivery_fee), Icon:DollarCircle, color:'#16a34a' },
                      { label:t('orders.drawer.cod_amount'),    value:fmtAED(drawerFull.cod_amount),   Icon:Wallet,       color:'#d97706' },
                      { label:t('orders.drawer.weight_label'),        value:drawerFull.weight_kg ? `${parseFloat(drawerFull.weight_kg).toFixed(1)} kg` : '\u2014', Icon:Weight, color:'#0369a1' },
                      { label:t('orders.drawer.type'),          value:fmtType(drawerFull.order_type),  Icon:Package,      color:'#8b5cf6' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'13px 15px',
                        [isRTL?'borderRight':'borderLeft']:`4px solid ${s.color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <s.Icon width={22} height={22} color={s.color} />
                          <div>
                            <div style={{ fontWeight:800, fontSize:17, color:'#1e293b' }}>{s.value}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginTop:1 }}>{s.label}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Client / Sender */}
                  <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                      display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <Building width={15} height={15} color="#f97316" /> {t('orders.drawer.client_sender')}
                    </div>
                    {drawerFull.client_name ? (
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #f8fafc' }}>
                        <Avatar name={drawerFull.client_name} size={40} />
                        <div>
                          <div style={{ fontWeight:700, color:'#1e293b' }}>{drawerFull.client_name}</div>
                          {drawerFull.company_name && <div style={{ fontSize:12, color:'#64748b' }}>{drawerFull.company_name}</div>}
                          {drawerFull.client_phone && <div style={{ fontSize:12, color:'#94a3b8' }}>{drawerFull.client_phone}</div>}
                        </div>
                      </div>
                    ) : (
                      <>
                        {[
                          { label:t('orders.drawer.sender'), value: drawerFull.sender_name || t('orders.walk_in') },
                          { label:t('orders.drawer.phone'),  value: drawerFull.sender_phone },
                          { label:t('orders.drawer.address'),value: drawerFull.sender_address },
                        ].filter(r=>r.value).map(row => (
                          <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                            <span style={{ color:'#94a3b8', fontWeight:600, fontSize:11 }}>{row.label}</span>
                            <span style={{ color:'#1e293b', fontWeight:500, textAlign: isRTL ? 'left' : 'right' }}>{row.value}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Recipient */}
                  <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                      display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <User width={15} height={15} color="#f97316" /> {t('orders.drawer.recipient')}
                    </div>
                    {[
                      { label:t('orders.drawer.name'),    value: drawerFull.recipient_name },
                      { label:t('orders.drawer.phone'),   value: drawerFull.recipient_phone, link: true },
                      { label:t('orders.drawer.address'), value: drawerFull.recipient_address },
                      { label:t('orders.drawer.area'),    value: drawerFull.recipient_area },
                      { label:t('orders.drawer.emirate'), value: drawerFull.recipient_emirate },
                    ].filter(r=>r.value).map(row => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                        <span style={{ color:'#94a3b8', fontWeight:600, fontSize:11 }}>{row.label}</span>
                        {row.link ? (
                          <a href={`tel:${row.value}`} style={{ color:'#f97316', fontWeight:600, textDecoration:'none' }}>{row.value}</a>
                        ) : (
                          <span style={{ color:'#1e293b', fontWeight:500, textAlign: isRTL ? 'left' : 'right', maxWidth:'60%' }}>{row.value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Delivery details */}
                  <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                      display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <DeliveryTruck width={15} height={15} color="#f97316" /> {t('orders.drawer.delivery_details')}
                    </div>
                    {[
                      { label:t('orders.drawer.zone'),       value: drawerFull.zone_name },
                      { label:t('orders.drawer.driver'),     value: drawerFull.driver_name || t('orders.drawer.unassigned'), muted: !drawerFull.driver_name, assignable: !drawerFull.driver_name },
                      { label:t('orders.drawer.category'),   value: fmtType(drawerFull.category) },
                      { label:t('orders.drawer.payment'),    value: t(`orders.payment.${drawerFull.payment_method}`) || drawerFull.payment_method },
                      { label:t('orders.drawer.dimensions'), value: drawerFull.dimensions },
                      { label:t('orders.drawer.scheduled'),  value: drawerFull.scheduled_at ? `${fmtDate(drawerFull.scheduled_at)} ${fmtTime(drawerFull.scheduled_at)}` : null },
                    ].filter(r=>r.value).map(row => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                        <span style={{ color:'#94a3b8', fontWeight:600, fontSize:11 }}>{row.label}</span>
                        {row.assignable ? (
                          <button onClick={() => { setDriverPicker({ orderId: drawerFull.id }); setDriverSearch(''); }}
                            style={{ background:'#ede9fe', color:'#7c3aed', border:'none', borderRadius:6,
                              padding:'3px 10px', fontSize:12, fontWeight:700, cursor:'pointer',
                              display:'flex', alignItems:'center', gap:4 }}>
                            <Plus width={11} height={11} /> {t('orders.driver_picker.title')}
                          </button>
                        ) : (
                          <span style={{ color: row.muted ? '#94a3b8' : '#1e293b', fontWeight:500, fontStyle: row.muted ? 'italic' : 'normal' }}>{row.value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {(drawerFull.description || drawerFull.special_instructions || drawerFull.notes) && (
                    <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                        display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        <Eye width={15} height={15} color="#f97316" /> {t('orders.drawer.notes_instructions')}
                      </div>
                      {drawerFull.description && (
                        <div style={{ padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                          <div style={{ color:'#94a3b8', fontWeight:600, fontSize:11, marginBottom:4 }}>{t('orders.drawer.description')}</div>
                          <div style={{ color:'#1e293b', whiteSpace:'pre-wrap' }}>{drawerFull.description}</div>
                        </div>
                      )}
                      {drawerFull.special_instructions && (
                        <div style={{ padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                          <div style={{ color:'#94a3b8', fontWeight:600, fontSize:11, marginBottom:4 }}>{t('orders.drawer.special_instructions')}</div>
                          <div style={{ color:'#1e293b', whiteSpace:'pre-wrap' }}>{drawerFull.special_instructions}</div>
                        </div>
                      )}
                      {drawerFull.notes && (
                        <div style={{ padding:'8px 0', fontSize:13 }}>
                          <div style={{ color:'#94a3b8', fontWeight:600, fontSize:11, marginBottom:4 }}>{t('orders.drawer.internal_notes')}</div>
                          <div style={{ color:'#1e293b', whiteSpace:'pre-wrap' }}>{drawerFull.notes}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Timeline */}
                  {drawerFull.status_logs && drawerFull.status_logs.length > 0 && (
                    <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                        display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        <Clock width={15} height={15} color="#f97316" /> {t('orders.drawer.status_timeline')}
                      </div>
                      {drawerFull.status_logs.map((log, i) => {
                        const m = STATUS_META[log.status] || STATUS_META.pending;
                        return (
                          <div key={i} style={{ display:'flex', gap:12, position:'relative', paddingBottom: i < drawerFull.status_logs.length-1 ? 16 : 0 }}>
                            {i < drawerFull.status_logs.length - 1 && (
                              <div style={{ position:'absolute', [isRTL?'right':'left']:11, top:24, bottom:0, width:2, background:'#e2e8f0' }} />
                            )}
                            <div style={{ width:24, height:24, borderRadius:'50%', background:m.bg, flexShrink:0,
                              display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
                              <m.icon width={12} height={12} style={{ color:m.color }} />
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <span style={{ fontWeight:700, fontSize:13, color:m.color }}>{t(`orders.status.${log.status}`)}</span>
                                <span style={{ fontSize:11, color:'#94a3b8' }}>{fmtDate(log.created_at)} {fmtTime(log.created_at)}</span>
                              </div>
                              {log.changed_by_name && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{t('orders.drawer.by')} {log.changed_by_name}</div>}
                              {log.note && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{log.note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Items */}
                  {drawerFull.items && drawerFull.items.length > 0 && (
                    <div style={{ background:'#fff', borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                        display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        <Box3dPoint width={15} height={15} color="#f97316" /> {t('orders.drawer.items')} ({drawerFull.items.length})
                      </div>
                      {drawerFull.items.map((item, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'8px 0', borderBottom: i < drawerFull.items.length-1 ? '1px solid #f8fafc' : 'none', fontSize:13 }}>
                          <div>
                            <div style={{ fontWeight:600, color:'#1e293b' }}>{item.name}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{t('orders.drawer.qty')} {item.quantity}{item.weight_kg ? ` \u00B7 ${item.weight_kg}kg` : ''}</div>
                          </div>
                          {item.unit_price > 0 && (
                            <span style={{ fontWeight:700, color:'#16a34a' }}>AED {parseFloat(item.unit_price).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta timestamps */}
                  <div style={{ background:'#f8fafc', borderRadius:12, padding:14, border:'1px solid #e2e8f0', fontSize:12, color:'#94a3b8' }}>
                    <div>{t('orders.drawer.created')} {fmtDate(drawerFull.created_at)} {fmtTime(drawerFull.created_at)}</div>
                    {drawerFull.picked_up_at && <div>{t('orders.drawer.picked_up')} {fmtDate(drawerFull.picked_up_at)} {fmtTime(drawerFull.picked_up_at)}</div>}
                    {drawerFull.delivered_at && <div>{t('orders.drawer.delivered')} {fmtDate(drawerFull.delivered_at)} {fmtTime(drawerFull.delivered_at)}</div>}
                    {drawerFull.failed_at && <div>{t('orders.drawer.failed')} {fmtDate(drawerFull.failed_at)} {fmtTime(drawerFull.failed_at)}</div>}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
         CREATE / EDIT 3-STEP WIZARD
         ══════════════════════════════════════════════════════ */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'10px', 
          paddingTop: window.innerWidth <= 768 ? '20px' : '40px',
          overflowY:'auto', 
          WebkitOverflowScrolling: 'touch' }}>
          <div style={{ background:'#fff', borderRadius:window.innerWidth <= 768 ? 12 : 20, 
            width:'100%', 
            maxWidth: window.innerWidth <= 768 ? '100%' : 640,
            maxHeight: window.innerWidth <= 768 ? 'calc(100vh - 40px)' : '90vh',
            minHeight: window.innerWidth <= 768 ? 'auto' : '600px',
            display:'flex', flexDirection:'column', overflow:'hidden', 
            boxShadow:'0 24px 70px rgba(0,0,0,0.2)',
            margin: window.innerWidth <= 768 ? '0' : 'auto' }}>

            {/* Modal Header */}
            <div style={{ padding: window.innerWidth <= 768 ? '16px 20px 0' : '22px 28px 0', 
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ margin:0, fontSize: window.innerWidth <= 768 ? 18 : 20, fontWeight:800, color:'#1e293b' }}>
                  {selected ? `${t('orders.edit_order')} \u2014 ${selected.order_number}` : t('orders.new_order')}
                </h3>
                <p style={{ margin:'3px 0 0', color:'#94a3b8', fontSize: window.innerWidth <= 768 ? 12 : 13 }}>
                  {t('common.step')} {step} {t('common.of')} {STEPS.length} \u2014 {t(STEPS[step-1].descKey)}
                </p>
              </div>
              <button type="button" onClick={closeForm}
                style={{ background:'#f1f5f9', border:'none', cursor:'pointer', color:'#64748b',
                  width: window.innerWidth <= 768 ? 32 : 34, 
                  height: window.innerWidth <= 768 ? 32 : 34, 
                  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Xmark width={window.innerWidth <= 768 ? 14 : 16} height={window.innerWidth <= 768 ? 14 : 16} />
              </button>
            </div>

            <StepBar current={step} t={t} />
            <div style={{ margin:'20px 0 0', height:1, background:'#f1f5f9' }} />

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
              <div style={{ overflowY:'auto', flex:1, 
                padding: window.innerWidth <= 768 ? '16px 20px 0' : '22px 28px 0',
                WebkitOverflowScrolling: 'touch' }}>
                {formError && (
                  <div style={{ background:'#fee2e2', color:'#dc2626', padding:'10px 14px',
                    borderRadius:8, marginBottom:16, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                    <WarningTriangle width={16} height={16} /> {formError}
                  </div>
                )}

                {/* Step 1: Client & Sender */}
                {step === 1 && (
                  <div style={{ display:'grid', 
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', 
                    gap: window.innerWidth <= 768 ? 12 : 16 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>{t('orders.form.client_selection')}</label>
                      <select value={form.client_id} onChange={e=>set('client_id',e.target.value)} style={INPUT}>
                        <option value="">{t('orders.form.no_client')}</option>
                        {clients.filter(c=>!!c.is_active).map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}{c.company_name ? ` \u2014 ${c.company_name}` : ''} ({c.phone})</option>
                        ))}
                      </select>
                      {form.client_id && (() => {
                        const c = clients.find(cl=>String(cl.id)===String(form.client_id));
                        return c ? (
                          <div style={{ marginTop:8, padding:'10px 14px', background:'#eff6ff', borderRadius:10, border:'1px solid #dbeafe', fontSize:12 }}>
                            <div style={{ fontWeight:700, color:'#1d4ed8', marginBottom:4 }}>{t('orders.form.client_selected')}</div>
                            <div style={{ color:'#64748b' }}>{c.full_name} \u00B7 {c.phone} \u00B7 {c.emirate}</div>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div style={{ gridColumn:'1/-1', padding:'10px 0' }}>
                      <div style={{ height:1, background:'#f1f5f9', position:'relative' }}>
                        <span style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
                          background:'#fff', padding:'0 12px', fontSize:12, color:'#94a3b8', fontWeight:600 }}>
                          {form.client_id ? t('orders.form.auto_filled') : t('orders.form.sender_details')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={LABEL}>{t('orders.form.sender_name')} {form.client_id ? '' : '*'}</label>
                      <input value={form.sender_name} onChange={e=>set('sender_name',e.target.value)}
                        style={{ ...INPUT, background: form.client_id ? '#f8fafc' : '#fff' }}
                        placeholder={t('orders.placeholders.company_or_person')}
                        readOnly={!!form.client_id} />
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.sender_phone')} {form.client_id ? '' : '*'}</label>
                      <input value={form.sender_phone} onChange={e=>set('sender_phone',e.target.value)}
                        style={{ ...INPUT, background: form.client_id ? '#f8fafc' : '#fff' }}
                        placeholder={t('orders.placeholders.phone')}
                        readOnly={!!form.client_id} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>{t('orders.form.sender_address')}</label>
                      <input value={form.sender_address} onChange={e=>set('sender_address',e.target.value)}
                        style={{ ...INPUT, background: form.client_id ? '#f8fafc' : '#fff' }}
                        placeholder={t('orders.placeholders.pickup_address')}
                        readOnly={!!form.client_id} />
                    </div>
                    {!form.client_id && (
                      <LocationPickerMap
                        lat={form.sender_lat} lng={form.sender_lng}
                        onPick={async (lat, lng) => {
                          set('sender_lat', lat);
                          set('sender_lng', lng);
                          try {
                            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                            const data = await r.json();
                            if (data.display_name) set('sender_address', data.display_name);
                          } catch {}
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Step 2: Recipient & Delivery */}
                {step === 2 && (() => {
                  const selectedClient = form.client_id ? clients.find(cl => String(cl.id) === String(form.client_id)) : null;
                  const hasClientLocation = selectedClient && (selectedClient.address_line1 || selectedClient.area || selectedClient.latitude);
                  return (
                    <div style={{ display:'grid', 
                      gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', 
                      gap: window.innerWidth <= 768 ? 12 : 16 }}>
                      {/* Client location auto-fill notice */}
                      {hasClientLocation && (
                        <div style={{ gridColumn:'1/-1', padding:'10px 14px', background:'#eff6ff', borderRadius:10, border:'1px solid #dbeafe', fontSize:12, display:'flex', alignItems:'center', gap:8 }}>                          <MapPin width={15} height={15} color="#3b82f6" />
                          <div>
                            <div style={{ fontWeight:700, color:'#1d4ed8', marginBottom:2 }}>{t('orders.form.delivery_prefilled')} {selectedClient.full_name}</div>
                            <div style={{ color:'#64748b' }}>{t('orders.form.change_fields')}</div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={LABEL}>{t('orders.form.recipient_name')} *</label>
                        <input required value={form.recipient_name} onChange={e=>set('recipient_name',e.target.value)}
                          style={INPUT} placeholder={t('orders.placeholders.full_name')} autoFocus />
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.recipient_phone')} *</label>
                        <input required value={form.recipient_phone} onChange={e=>set('recipient_phone',e.target.value)}
                          style={INPUT} placeholder={t('orders.placeholders.phone')} />
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.recipient_email')}</label>
                        <input type="email" value={form.recipient_email} onChange={e=>set('recipient_email',e.target.value)}
                          style={INPUT} placeholder={t('orders.placeholders.email')} />
                      </div>

                      <AddressSearch onSelect={({ lat, lng, display }) => {
                        set('recipient_lat', lat);
                        set('recipient_lng', lng);
                        if (display) set('recipient_address', display);
                      }} />

                      <LocationPickerMap
                        lat={form.recipient_lat} lng={form.recipient_lng}
                        onPick={async (lat, lng) => {
                          set('recipient_lat', lat);
                          set('recipient_lng', lng);
                          // Reverse geocode to fill address
                          try {
                            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                            const data = await r.json();
                            if (data.display_name) set('recipient_address', data.display_name);
                            if (data.address?.suburb || data.address?.neighbourhood) set('recipient_area', data.address.suburb || data.address.neighbourhood);
                          } catch {}
                        }}
                      />

                      <div style={{ gridColumn:'1/-1' }}>
                        <label style={LABEL}>{t('orders.form.delivery_address')} *</label>
                        <input required value={form.recipient_address} onChange={e=>set('recipient_address',e.target.value)}
                          style={INPUT} placeholder={t('orders.placeholders.building_street')} />
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.area')}</label>
                        <input value={form.recipient_area} onChange={e=>set('recipient_area',e.target.value)}
                          style={INPUT} placeholder={t('orders.placeholders.area')} />
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.emirate')}</label>
                        <select value={form.recipient_emirate} onChange={e=>set('recipient_emirate',e.target.value)} style={INPUT}>
                          {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn:'1/-1' }}>
                        <label style={LABEL}>{t('orders.form.delivery_zone')}</label>
                        <select value={form.zone_id} onChange={e=>set('zone_id',e.target.value)} style={INPUT}>
                          <option value="">{t('orders.form.select_zone')}</option>
                          {zones.filter(z=>z.is_active).map(z =>
                            <option key={z.id} value={z.id}>{z.name} \u2014 {z.emirate}{z.base_delivery_fee ? ` (AED ${z.base_delivery_fee})` : ''}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.order_type')}</label>
                        <select value={form.order_type} onChange={e=>set('order_type',e.target.value)} style={INPUT}>
                          {ORDER_TYPES.map(t => <option key={t} value={t}>{fmtType(t)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={LABEL}>{t('orders.form.scheduled_at')}</label>
                        <input type="datetime-local" value={form.scheduled_at} onChange={e=>set('scheduled_at',e.target.value)}
                          style={INPUT} />
                      </div>
                    </div>
                  );
                })()}

                {/* Step 3: Package & Payment */}
                {step === 3 && (
                  <div style={{ display:'grid', 
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', 
                    gap: window.innerWidth <= 768 ? 12 : 16 }}>
                    <div>
                      <label style={LABEL}>{t('orders.form.category')}</label>
                      <select value={form.category} onChange={e=>set('category',e.target.value)} style={INPUT}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{fmtType(c)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.weight_kg')}</label>
                      <input type="number" min="0" max="99999" step="0.1" value={form.weight_kg}
                        onChange={e=>set('weight_kg',e.target.value)} style={INPUT} placeholder={t('orders.placeholders.weight')} />
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.dimensions')}</label>
                      <input value={form.dimensions} onChange={e=>set('dimensions',e.target.value)}
                        style={INPUT} placeholder={t('orders.placeholders.dimensions')} />
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.payment_method')}</label>
                      <select value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} style={INPUT}>
                        {Object.entries(PAYMENT_MAP).map(([k,v]) => <option key={k} value={k}>{t(`orders.payment.${k}`)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.cod_aed')}</label>
                      <input type="number" min="0" step="0.01" value={form.cod_amount}
                        onChange={e=>set('cod_amount',e.target.value)} style={INPUT} placeholder={t('orders.placeholders.cod_amount')} />
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.fee_aed')}</label>
                      <input type="number" min="0" step="0.01" value={form.delivery_fee}
                        onChange={e=>set('delivery_fee',e.target.value)} style={INPUT} placeholder={t('orders.placeholders.delivery_fee')} />
                    </div>
                    <div>
                      <label style={LABEL}>{t('orders.form.discount_aed')}</label>
                      <input type="number" min="0" step="0.01" value={form.discount}
                        onChange={e=>set('discount',e.target.value)} style={INPUT} placeholder={t('orders.placeholders.discount')} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>{t('orders.form.package_description')}</label>
                      <textarea rows={2} value={form.description} onChange={e=>set('description',e.target.value)}
                        style={{ ...INPUT, resize:'vertical' }} placeholder={t('orders.placeholders.description')} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>{t('orders.form.special_instructions')}</label>
                      <textarea rows={2} value={form.special_instructions} onChange={e=>set('special_instructions',e.target.value)}
                        style={{ ...INPUT, resize:'vertical' }} placeholder={t('orders.placeholders.instructions')} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>{t('orders.form.internal_notes')}</label>
                      <textarea rows={2} value={form.notes} onChange={e=>set('notes',e.target.value)}
                        style={{ ...INPUT, resize:'vertical' }} placeholder={t('orders.placeholders.notes')} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer nav — sticky */}
              <div style={{ padding: window.innerWidth <= 768 ? '12px 20px 16px' : '16px 28px 20px', 
                display:'flex', justifyContent:'space-between', alignItems:'center',
                borderTop:'1px solid #f1f5f9', background:'#fff', flexShrink:0,
                gap: window.innerWidth <= 768 ? '8px' : '0' }}>
                <button type="button"
                  onClick={step > 1 ? (e) => prevStep(e) : closeForm}
                  style={{ padding: window.innerWidth <= 768 ? '8px 16px' : '10px 22px', 
                    borderRadius:10, border:'1px solid #e2e8f0',
                    background:'#fff', cursor:'pointer', fontWeight:600, 
                    fontSize: window.innerWidth <= 768 ? 13 : 14,
                    display:'flex', alignItems:'center', gap: window.innerWidth <= 768 ? 6 : 7, 
                    color:'#475569', flex: window.innerWidth <= 768 ? '1' : 'none' }}>
                  {isRTL ? <NavArrowRight width={15} height={15} /> : <NavArrowLeft width={15} height={15} />}
                  {step > 1 ? t('orders.form.back') : t('orders.form.cancel')}
                </button>

                {step < STEPS.length ? (
                  <button type="button" onClick={(e) => nextStep(e)}
                    style={{ padding: window.innerWidth <= 768 ? '8px 20px' : '10px 28px', 
                      borderRadius:10, border:'none',
                      background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff',
                      cursor:'pointer', fontWeight:700, fontSize: window.innerWidth <= 768 ? 13 : 14, 
                      display:'flex', alignItems:'center', gap: window.innerWidth <= 768 ? 6 : 7,
                      boxShadow:'0 4px 14px rgba(249,115,22,0.35)',
                      flex: window.innerWidth <= 768 ? '2' : 'none' }}>
                    {t('orders.form.next')} {isRTL ? <NavArrowLeft width={15} height={15} /> : <NavArrowRight width={15} height={15} />}
                  </button>
                ) : (
                  <button type="submit" disabled={saving}
                    style={{ padding: window.innerWidth <= 768 ? '8px 20px' : '10px 28px', 
                      borderRadius:10, border:'none',
                      background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff',
                      cursor:saving?'not-allowed':'pointer', fontWeight:700, 
                      fontSize: window.innerWidth <= 768 ? 13 : 14,
                      opacity:saving?0.7:1, display:'flex', alignItems:'center', 
                      gap: window.innerWidth <= 768 ? 6 : 7,
                      boxShadow:'0 4px 14px rgba(22,163,74,0.35)',
                      flex: window.innerWidth <= 768 ? '2' : 'none' }}>
                    <CheckCircle width={15} height={15} />
                    {saving ? t('orders.form.saving') : selected ? t('orders.form.update_order') : t('orders.form.create_order')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:34, width:390, textAlign:'center',
            boxShadow:'0 24px 70px rgba(0,0,0,0.2)' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'#fee2e2',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <WarningTriangle width={28} height={28} color="#dc2626" />
            </div>
            <h3 style={{ margin:'0 0 10px', fontSize:19, fontWeight:800 }}>{t('orders.cancel.title')}</h3>
            <p style={{ color:'#64748b', marginBottom:26, lineHeight:1.6 }}>
              <strong>{cancelConfirm.order_number}</strong> {t('orders.cancel.message')}
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setCancelConfirm(null)}
                style={{ flex:1, padding:12, borderRadius:10, border:'1px solid #e2e8f0',
                  background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
                {t('orders.cancel.keep')}
              </button>
              <button onClick={handleCancel}
                style={{ flex:1, padding:12, borderRadius:10, border:'none',
                  background:'#dc2626', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                {t('orders.cancel.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Picker Modal ── */}
      {driverPicker && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setDriverPicker(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:440, maxWidth:'96vw',
            maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 70px rgba(0,0,0,0.22)',
            overflow:'hidden', animation:'fadeInUp 0.25s ease' }}>
            {/* Header */}
            <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'#ede9fe',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <User width={20} height={20} color="#7c3aed" />
                  </div>
                  <div>
                    <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:'#1e293b' }}>{t('orders.driver_picker.title')}</h3>
                    <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>{t('orders.driver_picker.subtitle')}</p>
                  </div>
                </div>
                <button onClick={() => setDriverPicker(null)}
                  style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'#f1f5f9',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Xmark width={14} height={14} color="#64748b" />
                </button>
              </div>
              {/* Search */}
              <div style={{ position:'relative' }}>
                <Search width={14} height={14} style={{ position:'absolute', [isRTL?'right':'left']:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                <input value={driverSearch} onChange={e => setDriverSearch(e.target.value)}
                  placeholder={t('orders.driver_picker.search_placeholder')}
                  style={{ width:'100%', padding:'9px 12px', [isRTL?'paddingRight':'paddingLeft']:34, borderRadius:10,
                    border:'1px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  autoFocus />
              </div>
            </div>
            {/* Driver List */}
            <div style={{ overflowY:'auto', padding:'8px 12px', flex:1 }}>
              {drivers
                .filter(d => d.is_active)
                .filter(d => {
                  if (!driverSearch) return true;
                  const q = driverSearch.toLowerCase();
                  return (d.full_name||'').toLowerCase().includes(q) || (d.phone||'').includes(q) || (d.zone_name||'').toLowerCase().includes(q);
                })
                .map(d => {
                  const statusColor = d.status === 'available' ? '#16a34a' : d.status === 'busy' ? '#f59e0b' : '#94a3b8';
                  const statusBg    = d.status === 'available' ? '#dcfce7' : d.status === 'busy' ? '#fef3c7' : '#f1f5f9';
                  const isAssigning = assigningDriver === d.id;
                  return (
                    <button key={d.id} onClick={() => handleAssignDriver(d.id)} disabled={isAssigning}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                        borderRadius:12, border:'1px solid #f1f5f9', background: isAssigning ? '#f8fafc' : '#fff',
                        cursor: isAssigning ? 'wait' : 'pointer', marginBottom:6, textAlign: isRTL ? 'right' : 'left',
                        transition:'all 0.15s', opacity: isAssigning ? 0.7 : 1 }}
                      onMouseOver={e => { if (!isAssigning) e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0'; }}
                      onMouseOut={e => { if (!isAssigning) e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#f1f5f9'; }}>
                      {/* Avatar */}
                      <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#244066,#334155)',
                        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
                        fontWeight:800, fontSize:14, flexShrink:0 }}>
                        {(d.full_name || '?')[0].toUpperCase()}
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'#1e293b', marginBottom:2 }}>{d.full_name}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#94a3b8', flexWrap:'wrap' }}>
                          <span>{d.phone}</span>
                          {d.vehicle_type && <span style={{ background:'#f1f5f9', padding:'1px 6px', borderRadius:4 }}>{d.vehicle_type}</span>}
                          {d.zone_name && <span>{d.zone_name}</span>}
                        </div>
                      </div>
                      {/* Status + Orders */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                          background: statusBg, color: statusColor, textTransform:'capitalize' }}>
                          {t(`orders.driver_picker.status_${d.status}`) || d.status}
                        </span>
                        {d.orders_today > 0 && (
                          <span style={{ fontSize:10, color:'#94a3b8' }}>{d.orders_today} {t('orders.driver_picker.today')}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              {drivers.filter(d => d.is_active).length === 0 && (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#94a3b8' }}>
                  <User width={36} height={36} style={{ marginBottom:8, opacity:0.4 }} />
                  <p style={{ fontSize:14, fontWeight:600 }}>{t('orders.driver_picker.no_drivers')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
