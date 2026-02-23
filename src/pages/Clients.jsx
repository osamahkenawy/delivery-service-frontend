import { useState, useEffect, useCallback } from 'react';
import {
  Group, User, Search, EditPencil, Trash, Plus,
  Mail, Phone, Building, MapPin, Download, NavArrowRight, NavArrowLeft,
  WarningTriangle, Xmark, CheckCircle, Package, DeliveryTruck,
  StatsUpSquare, Wallet, Filter, Eye,
} from 'iconoir-react';
import api from '../lib/api';

const TYPE_META = {
  ecommerce:  { bg: '#dbeafe', color: '#1d4ed8', label: 'E-Commerce'  },
  restaurant: { bg: '#dcfce7', color: '#16a34a', label: 'Restaurant'   },
  corporate:  { bg: '#ede9fe', color: '#7c3aed', label: 'Corporate'    },
  individual: { bg: '#fef3c7', color: '#d97706', label: 'Individual'   },
  other:      { bg: '#f1f5f9', color: '#475569', label: 'Other'        },
};
const EMIRATES   = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'];
const CATEGORIES = ['retail','wholesale','food','logistics','healthcare','tech','other'];
const STATUS_COLORS = {
  pending:'#f59e0b', confirmed:'#3b82f6', assigned:'#8b5cf6', picked_up:'#06b6d4',
  in_transit:'#f97316', delivered:'#16a34a', failed:'#dc2626', returned:'#6b7280',
};
const INPUT = { width:'100%', padding:'10px 13px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:14, boxSizing:'border-box', outline:'none' };
const LABEL = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' };
const LIMIT = 20;
const emptyForm = {
  full_name:'', company_name:'', email:'', phone:'', phone_alt:'',
  type:'individual', client_category:'other',
  address_line1:'', area:'', city:'', emirate:'Dubai',
  credit_limit:'', notes:'', is_active:true,
};

/* ── Helpers ── */
function Avatar({ name, size = 44 }) {
  const initials = name?.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('') || '?';
  const hue = (name?.charCodeAt(0)||0) % 360;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%',
      background:`hsl(${hue},55%,46%)`,
      color:'#fff', fontWeight:700, fontSize:size*0.36, flexShrink:0,
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

function StatusPill({ active }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      background:active?'#dcfce7':'#fee2e2', color:active?'#16a34a':'#dc2626',
      padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:active?'#16a34a':'#dc2626', display:'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ── Step indicator ── */
const STEPS = [
  { num:1, title:'Basic Info',     desc:'Name & contact details' },
  { num:2, title:'Business Info',  desc:'Type, category & emirate' },
  { num:3, title:'Address & Limit', desc:'Location, credit & notes' },
];

function StepBar({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'22px 28px 0' }}>
      {STEPS.map((s, i) => {
        const done    = current > s.num;
        const active  = current === s.num;
        const lineW   = i < STEPS.length - 1 ? 1 : 0;
        return (
          <div key={s.num} style={{ display:'flex', alignItems:'center', flex: lineW ? 1 : undefined }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', fontWeight:800, fontSize:15,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: done?'#16a34a' : active?'#f97316':'#f1f5f9',
                color: done||active?'#fff':'#94a3b8',
                boxShadow: active?'0 0 0 4px rgba(249,115,22,0.18)':'none',
                transition:'all 0.25s' }}>
                {done ? <CheckCircle width={18} height={18} /> : s.num}
              </div>
              <div style={{ fontSize:11, fontWeight:active?700:500, color:active?'#f97316':done?'#16a34a':'#94a3b8', whiteSpace:'nowrap' }}>
                {s.title}
              </div>
            </div>
            {lineW > 0 && (
              <div style={{ flex:1, height:2, margin:'0 8px', marginTop:-14,
                background:done?'#16a34a':'#e2e8f0', transition:'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main component ── */
export default function Clients() {
  const [clients,       setClients]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [emirateFilter, setEmirateFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [step,          setStep]          = useState(1);
  const [selected,      setSelected]      = useState(null);
  const [drawer,        setDrawer]        = useState(null);
  const [drawerOrders,  setDrawerOrders]  = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (search)        params.set('search',  search);
    if (typeFilter)    params.set('type',    typeFilter);
    if (emirateFilter) params.set('emirate', emirateFilter);
    const res = await api.get(`/clients?${params}`);
    if (res.success) {
      let data = res.data || [];
      if (statusFilter === 'active')   data = data.filter(c => c.is_active !== false);
      if (statusFilter === 'inactive') data = data.filter(c => c.is_active === false);
      setClients(data);
      setTotal(res.pagination?.total || data.length);
    }
    setLoading(false);
  }, [search, typeFilter, emirateFilter, statusFilter, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openDrawer = async (client) => {
    setDrawer(client);
    setDrawerLoading(true);
    const res = await api.get(`/clients/${client.id}`);
    if (res.success) { setDrawer(res.data); setDrawerOrders(res.data.orders || []); }
    setDrawerLoading(false);
  };

  const openEdit = (c, e) => {
    e?.stopPropagation();
    setSelected(c);
    setForm({ ...emptyForm, ...c });
    setFormError(''); setStep(1);
    setShowForm(true);
  };

  const openCreate = () => {
    setSelected(null); setForm(emptyForm);
    setFormError(''); setStep(1);
    setShowForm(true);
  };

  /* validate current step before going next */
  const validateStep = () => {
    if (step === 1) {
      if (!form.full_name.trim()) { setFormError('Full name is required'); return false; }
      if (!form.phone.trim())     { setFormError('Phone number is required'); return false; }
    }
    setFormError('');
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => { setFormError(''); setStep(s => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    const res = selected
      ? await api.put(`/clients/${selected.id}`, form)
      : await api.post('/clients', form);
    if (res.success) {
      setShowForm(false); setSelected(null);
      fetchClients();
      if (drawer && drawer.id === selected?.id) setDrawer(res.data);
    } else { setFormError(res.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleToggle = async (c, e) => {
    e?.stopPropagation();
    await api.put(`/clients/${c.id}`, { ...c, is_active: !(c.is_active !== false) });
    fetchClients();
    if (drawer?.id === c.id) setDrawer(d => ({ ...d, is_active: !(d.is_active !== false) }));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await api.delete(`/clients/${deleteConfirm.id}`);
    setDeleteConfirm(null);
    if (drawer?.id === deleteConfirm.id) setDrawer(null);
    fetchClients();
  };

  const exportCSV = () => {
    const headers = ['ID','Name','Company','Type','Phone','Email','Emirate','Orders','Delivered','Credit Limit','Status'];
    const rows = clients.map(c => [
      c.id, c.full_name, c.company_name||'', TYPE_META[c.type]?.label||c.type,
      c.phone, c.email||'', c.emirate||'',
      c.total_orders||0, c.delivered_orders||0, c.credit_limit||0,
      c.is_active!==false?'Active':'Inactive',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v=>`"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `clients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const clearFilters = () => { setSearch(''); setTypeFilter(''); setEmirateFilter(''); setStatusFilter(''); setPage(1); };
  const hasFilters   = search || typeFilter || emirateFilter || statusFilter;
  const activeCount  = clients.filter(c => c.is_active !== false).length;
  const totalOrders  = clients.reduce((s,c) => s + (parseInt(c.total_orders)||0), 0);

  /* ── Render ── */
  return (
    <div className="page-container">

      {/* Page Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:26, fontWeight:900, color:'#1e293b', display:'flex', alignItems:'center', gap:10 }}>
            <Group width={28} height={28} color="#f97316" /> Clients
          </h2>
          <p style={{ margin:'5px 0 0', color:'#64748b', fontSize:14 }}>
            {total} registered · {activeCount} active
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={exportCSV}
            style={{ padding:'10px 18px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff',
              cursor:'pointer', fontWeight:600, fontSize:13, color:'#475569',
              display:'flex', alignItems:'center', gap:7 }}>
            <Download width={15} height={15} /> Export CSV
          </button>
          <button onClick={openCreate}
            style={{ padding:'10px 22px', borderRadius:10, border:'none',
              background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff',
              cursor:'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', gap:7,
              boxShadow:'0 4px 14px rgba(249,115,22,0.38)' }}>
            <Plus width={16} height={16} /> New Client
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'flex', gap:14, marginBottom:24, flexWrap:'wrap' }}>
        <KPICard icon={Group}          label="Total Clients" value={clients.length}                      sub={`${activeCount} active`}        color="#f97316" />
        <KPICard icon={Package}        label="Total Orders"  value={totalOrders}                        sub="all time"                       color="#3b82f6" />
        <KPICard icon={Building}       label="Corporate B2B" value={clients.filter(c=>c.type==='corporate').length} sub="business accounts" color="#8b5cf6" />
        <KPICard icon={DeliveryTruck}  label="E-Commerce"    value={clients.filter(c=>c.type==='ecommerce').length} sub="online stores"    color="#10b981" />
      </div>

      {/* Filter Bar */}
      <div style={{ background:'#fff', borderRadius:14, padding:'15px 18px',
        boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:20,
        display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:220 }}>
          <Search width={15} height={15} color="#9ca3af"
            style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input placeholder="Search name, phone, email, company…"
            value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
            style={{ ...INPUT, paddingLeft:33 }} />
        </div>
        <select value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }}
          style={{ ...INPUT, width:148 }}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([t,m]) => <option key={t} value={t}>{m.label}</option>)}
        </select>
        <select value={emirateFilter} onChange={e=>{ setEmirateFilter(e.target.value); setPage(1); }}
          style={{ ...INPUT, width:150 }}>
          <option value="">All Emirates</option>
          {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ ...INPUT, width:128 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding:'9px 13px', borderRadius:8, border:'1px solid #fecaca', background:'#fff5f5',
              color:'#dc2626', cursor:'pointer', fontSize:13, fontWeight:600,
              display:'flex', alignItems:'center', gap:5 }}>
            <Xmark width={13} height={13} /> Clear
          </button>
        )}
      </div>

      {/* Table Card */}
      <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', overflow:'hidden' }}>
        {/* Segment pills */}
        <div style={{ padding:'12px 18px', borderBottom:'1px solid #f1f5f9',
          display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginRight:4, letterSpacing:'0.06em' }}>SEGMENT</span>
          {Object.entries(TYPE_META).map(([t,m]) => {
            const cnt    = clients.filter(c => c.type === t).length;
            const active = typeFilter === t;
            if (!cnt) return null;
            return (
              <button key={t} onClick={() => { setTypeFilter(active?'':t); setPage(1); }}
                style={{ background:active?m.color:m.bg, color:active?'#fff':m.color,
                  border:'none', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {m.label} ({cnt})
              </button>
            );
          })}
          <span style={{ marginLeft:'auto', color:'#94a3b8', fontSize:13 }}>{clients.length} shown</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:70, color:'#94a3b8', fontSize:16 }}>Loading clients…</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign:'center', padding:70 }}>
            <Group width={56} height={56} color="#e2e8f0" style={{ marginBottom:14 }} />
            <div style={{ fontWeight:800, fontSize:20, marginBottom:6 }}>
              {hasFilters ? 'No clients match your filters' : 'No clients yet'}
            </div>
            <div style={{ color:'#94a3b8', marginBottom:24, fontSize:14 }}>
              {hasFilters ? 'Try adjusting your search or filters' : 'Add your first client to get started'}
            </div>
            {hasFilters
              ? <button onClick={clearFilters} style={{ padding:'10px 24px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontWeight:600 }}>Clear Filters</button>
              : <button onClick={openCreate}   style={{ padding:'11px 28px', borderRadius:10, border:'none', background:'#f97316', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:15 }}>+ Add First Client</button>
            }
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
                    {['Client','Type','Contact','Emirate','Orders','Credit Limit','Status',''].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11,
                        fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => {
                    const tm       = TYPE_META[client.type] || TYPE_META.other;
                    const creditL  = parseFloat(client.credit_limit) || 0;
                    const creditU  = parseFloat(client.credit_used   || 0);
                    const creditPct= creditL > 0 ? Math.min(100,(creditU/creditL)*100) : 0;
                    const isActive = client.is_active !== false;
                    return (
                      <tr key={client.id} onClick={() => openDrawer(client)}
                        style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'13px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                            <Avatar name={client.full_name} />
                            <div>
                              <div style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{client.full_name}</div>
                              {client.company_name && (
                                <div style={{ fontSize:12, color:'#64748b', marginTop:1, display:'flex', alignItems:'center', gap:4 }}>
                                  <Building width={11} height={11} /> {client.company_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'13px 16px' }}>
                          <span style={{ background:tm.bg, color:tm.color, padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{tm.label}</span>
                        </td>
                        <td style={{ padding:'13px 16px' }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', display:'flex', alignItems:'center', gap:5 }}>
                            <Phone width={12} height={12} color="#94a3b8" /> {client.phone}
                          </div>
                          {client.email && (
                            <div style={{ fontSize:12, color:'#94a3b8', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                              <Mail width={11} height={11} /> {client.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding:'13px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#475569' }}>
                            <MapPin width={13} height={13} color="#94a3b8" /> {client.emirate||'—'}
                          </div>
                        </td>
                        <td style={{ padding:'13px 16px' }}>
                          <div style={{ fontSize:17, fontWeight:800, color:'#1e293b' }}>{client.total_orders||0}</div>
                          {parseInt(client.delivered_orders)>0 && (
                            <div style={{ fontSize:11, color:'#16a34a', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                              <CheckCircle width={11} height={11} /> {client.delivered_orders} done
                            </div>
                          )}
                        </td>
                        <td style={{ padding:'13px 16px', minWidth:130 }}>
                          {creditL > 0 ? (
                            <>
                              <div style={{ fontSize:12, color:'#64748b', marginBottom:5, fontWeight:600 }}>
                                AED {creditU.toFixed(0)} / {creditL.toFixed(0)}
                              </div>
                              <div style={{ height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:creditPct+'%', borderRadius:3,
                                  background:creditPct>80?'#dc2626':creditPct>50?'#f59e0b':'#16a34a', transition:'width 0.4s' }} />
                              </div>
                            </>
                          ) : <span style={{ color:'#cbd5e1', fontSize:13 }}>No limit</span>}
                        </td>
                        <td style={{ padding:'13px 16px' }}><StatusPill active={isActive} /></td>
                        <td style={{ padding:'13px 16px' }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={e=>openEdit(client,e)}
                              style={{ padding:'6px 11px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff',
                                cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151',
                                display:'flex', alignItems:'center', gap:5 }}>
                              <EditPencil width={13} height={13} /> Edit
                            </button>
                            <button onClick={e=>{ e.stopPropagation(); setDeleteConfirm(client); }}
                              style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #fecaca',
                                background:'#fff5f5', color:'#dc2626', cursor:'pointer',
                                display:'flex', alignItems:'center' }}>
                              <Trash width={13} height={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total > LIMIT && (
              <div style={{ padding:'13px 18px', borderTop:'1px solid #f1f5f9',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#64748b' }}>
                  Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
                    style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
                      background:page===1?'#f8fafc':'#fff', cursor:page===1?'not-allowed':'pointer',
                      fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                    <NavArrowLeft width={14} height={14} /> Prev
                  </button>
                  <span style={{ padding:'7px 12px', fontSize:13, color:'#64748b', fontWeight:600 }}>Page {page}</span>
                  <button disabled={page*LIMIT>=total} onClick={()=>setPage(p=>p+1)}
                    style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
                      background:page*LIMIT>=total?'#f8fafc':'#fff', cursor:page*LIMIT>=total?'not-allowed':'pointer',
                      fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                    Next <NavArrowRight width={14} height={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Client Detail Drawer ── */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:900 }} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:510, maxWidth:'96vw',
            background:'#f8fafc', zIndex:901, overflowY:'auto',
            boxShadow:'-8px 0 40px rgba(0,0,0,0.14)', display:'flex', flexDirection:'column' }}>

            <div style={{ background:'linear-gradient(135deg,#1e293b,#334155)', padding:'26px 26px 22px', position:'relative' }}>
              <button onClick={() => setDrawer(null)}
                style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.1)',
                  border:'none', color:'#fff', width:30, height:30, borderRadius:'50%',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Xmark width={15} height={15} />
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:16 }}>
                <Avatar name={drawer.full_name} size={60} />
                <div>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:20, lineHeight:1.2 }}>{drawer.full_name}</div>
                  {drawer.company_name && (
                    <div style={{ color:'#94a3b8', fontSize:13, marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                      <Building width={12} height={12} /> {drawer.company_name}
                    </div>
                  )}
                  <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <StatusPill active={drawer.is_active!==false} />
                    {drawer.type && (
                      <span style={{ background:TYPE_META[drawer.type]?.bg, color:TYPE_META[drawer.type]?.color,
                        padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                        {TYPE_META[drawer.type]?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={e=>openEdit(drawer,e)}
                  style={{ flex:1, padding:'10px', borderRadius:10, border:'none',
                    background:'#f97316', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  <EditPencil width={15} height={15} /> Edit Client
                </button>
                <button onClick={e=>handleToggle(drawer,e)}
                  style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,0.2)',
                    background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  {drawer.is_active!==false ? <Xmark width={14} height={14} /> : <CheckCircle width={14} height={14} />}
                  {drawer.is_active!==false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            <div style={{ padding:22, flex:1 }}>
              {drawerLoading ? (
                <div style={{ textAlign:'center', padding:50, color:'#94a3b8' }}>Loading details…</div>
              ) : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                    {[
                      { label:'Total Orders',  value:drawer.total_orders||0,    Icon:Package,       color:'#3b82f6' },
                      { label:'Delivered',     value:drawer.delivered_orders||0, Icon:CheckCircle,   color:'#16a34a' },
                      { label:'Credit Limit',  value:drawer.credit_limit ? 'AED '+parseFloat(drawer.credit_limit).toFixed(0) : 'No limit', Icon:Wallet, color:'#8b5cf6' },
                      { label:'Emirate',       value:drawer.emirate||'—',        Icon:MapPin,        color:'#f97316' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'13px 15px',
                        borderLeft:`4px solid ${s.color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
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

                  <div style={{ background:'#fff', borderRadius:14, padding:18,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:16 }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                      display:'flex', alignItems:'center', gap:7, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      <User width={15} height={15} color="#f97316" /> Profile Information
                    </div>
                    {[
                      { label:'Phone',    Icon:Phone,   value:drawer.phone },
                      { label:'Alt Phone',Icon:Phone,   value:drawer.phone_alt },
                      { label:'Email',    Icon:Mail,    value:drawer.email },
                      { label:'Emirate',  Icon:MapPin,  value:drawer.emirate },
                      { label:'Zone',     Icon:MapPin,  value:drawer.zone_name },
                      { label:'Address',  Icon:MapPin,  value:[drawer.address_line1,drawer.area,drawer.city].filter(Boolean).join(', ') },
                      { label:'Notes',    Icon:Eye,     value:drawer.notes },
                      { label:'Joined',   Icon:StatsUpSquare, value:drawer.created_at ? new Date(drawer.created_at).toLocaleDateString() : null },
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} style={{ display:'flex', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                        <div style={{ width:105, display:'flex', alignItems:'center', gap:5, color:'#94a3b8', fontSize:11, fontWeight:700, flexShrink:0, paddingTop:2 }}>
                          <row.Icon width={12} height={12} /> {row.label}
                        </div>
                        <span style={{ color:'#1e293b', fontWeight:500, flex:1 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {drawerOrders.length > 0 && (
                    <div style={{ background:'#fff', borderRadius:14, padding:18,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:13, color:'#374151',
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <DeliveryTruck width={15} height={15} color="#f97316" /> Recent Orders
                        </span>
                        <span style={{ color:'#94a3b8', fontSize:12, fontWeight:400, textTransform:'none' }}>{drawerOrders.length} total</span>
                      </div>
                      {drawerOrders.slice(0,8).map(o => {
                        const sc = STATUS_COLORS[o.status]||'#94a3b8';
                        return (
                          <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                            padding:'9px 0', borderBottom:'1px solid #f8fafc' }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>#{o.order_number}</div>
                              <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <span style={{ background:sc+'20', color:sc, padding:'3px 9px',
                                borderRadius:20, fontSize:11, fontWeight:700, textTransform:'capitalize' }}>
                                {o.status?.replace(/_/g,' ')}
                              </span>
                              {o.total_amount && (
                                <div style={{ fontSize:12, color:'#64748b', marginTop:3, fontWeight:600 }}>
                                  AED {parseFloat(o.total_amount).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Multi-Step Form Modal ── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:600,
            maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 70px rgba(0,0,0,0.2)' }}>

            {/* Modal Header */}
            <div style={{ padding:'22px 28px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h3 style={{ margin:0, fontSize:20, fontWeight:800, color:'#1e293b' }}>
                  {selected ? 'Edit Client' : 'New Client'}
                </h3>
                <p style={{ margin:'3px 0 0', color:'#94a3b8', fontSize:13 }}>
                  Step {step} of {STEPS.length} — {STEPS[step-1].desc}
                </p>
              </div>
              <button onClick={() => setShowForm(false)}
                style={{ background:'#f1f5f9', border:'none', cursor:'pointer', color:'#64748b',
                  width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Xmark width={16} height={16} />
              </button>
            </div>

            {/* Step Bar */}
            <StepBar current={step} />

            {/* Divider */}
            <div style={{ margin:'20px 0 0', height:1, background:'#f1f5f9' }} />

            <form onSubmit={handleSubmit}>
              <div style={{ padding:'22px 28px 0' }}>
                {formError && (
                  <div style={{ background:'#fee2e2', color:'#dc2626', padding:'10px 14px',
                    borderRadius:8, marginBottom:16, fontSize:14,
                    display:'flex', alignItems:'center', gap:8 }}>
                    <WarningTriangle width={16} height={16} /> {formError}
                  </div>
                )}

                {/* ── Step 1: Basic Info ── */}
                {step === 1 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Full Name *</label>
                      <input required value={form.full_name} onChange={e=>set('full_name',e.target.value)}
                        style={INPUT} placeholder="e.g. Ahmed Al Mansouri" autoFocus />
                    </div>
                    <div>
                      <label style={LABEL}>Phone *</label>
                      <input required value={form.phone} onChange={e=>set('phone',e.target.value)}
                        style={INPUT} placeholder="+971 50 123 4567" />
                    </div>
                    <div>
                      <label style={LABEL}>Alternate Phone</label>
                      <input value={form.phone_alt} onChange={e=>set('phone_alt',e.target.value)}
                        style={INPUT} placeholder="Optional" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Email Address</label>
                      <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                        style={INPUT} placeholder="client@company.com" />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Business Info ── */}
                {step === 2 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Company Name</label>
                      <input value={form.company_name} onChange={e=>set('company_name',e.target.value)}
                        style={INPUT} placeholder="Acme LLC" />
                    </div>
                    <div>
                      <label style={LABEL}>Client Type</label>
                      <select value={form.type} onChange={e=>set('type',e.target.value)} style={INPUT}>
                        {Object.entries(TYPE_META).map(([t,m]) => <option key={t} value={t}>{m.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LABEL}>Business Category</label>
                      <select value={form.client_category} onChange={e=>set('client_category',e.target.value)} style={INPUT}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Emirate</label>
                      <select value={form.emirate} onChange={e=>set('emirate',e.target.value)} style={INPUT}>
                        {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Address & Settings ── */}
                {step === 3 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Street Address</label>
                      <input value={form.address_line1} onChange={e=>set('address_line1',e.target.value)}
                        style={INPUT} placeholder="Building, Street, Floor, Flat" />
                    </div>
                    <div>
                      <label style={LABEL}>Area / Community</label>
                      <input value={form.area} onChange={e=>set('area',e.target.value)}
                        style={INPUT} placeholder="Downtown, JVC, Business Bay…" />
                    </div>
                    <div>
                      <label style={LABEL}>City</label>
                      <input value={form.city} onChange={e=>set('city',e.target.value)}
                        style={INPUT} placeholder="Dubai" />
                    </div>
                    <div>
                      <label style={LABEL}>Credit Limit (AED)</label>
                      <input type="number" min="0" value={form.credit_limit}
                        onChange={e=>set('credit_limit',e.target.value)}
                        style={INPUT} placeholder="0 = No limit" />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:9, paddingTop:22 }}>
                      <input type="checkbox" id="chk_active"
                        checked={form.is_active !== false}
                        onChange={e=>set('is_active',e.target.checked)}
                        style={{ width:16, height:16, accentColor:'#f97316', cursor:'pointer' }} />
                      <label htmlFor="chk_active" style={{ fontSize:14, fontWeight:600, cursor:'pointer', color:'#374151' }}>
                        Active client
                      </label>
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={LABEL}>Internal Notes</label>
                      <textarea rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)}
                        style={{ ...INPUT, resize:'vertical' }}
                        placeholder="Any internal notes or special instructions…" />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <div style={{ padding:'22px 28px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                <button type="button"
                  onClick={step > 1 ? prevStep : () => setShowForm(false)}
                  style={{ padding:'10px 22px', borderRadius:10, border:'1px solid #e2e8f0',
                    background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14,
                    display:'flex', alignItems:'center', gap:7, color:'#475569' }}>
                  <NavArrowLeft width={15} height={15} />
                  {step > 1 ? 'Back' : 'Xmark'}
                </button>

                {step < STEPS.length ? (
                  <button type="button" onClick={nextStep}
                    style={{ padding:'10px 28px', borderRadius:10, border:'none',
                      background:'linear-gradient(135deg,#f97316,#ea580c)', color:'#fff',
                      cursor:'pointer', fontWeight:700, fontSize:14,
                      display:'flex', alignItems:'center', gap:7,
                      boxShadow:'0 4px 14px rgba(249,115,22,0.35)' }}>
                    Next <NavArrowRight width={15} height={15} />
                  </button>
                ) : (
                  <button type="submit" disabled={saving}
                    style={{ padding:'10px 28px', borderRadius:10, border:'none',
                      background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff',
                      cursor:saving?'not-allowed':'pointer', fontWeight:700, fontSize:14,
                      opacity:saving?0.7:1, display:'flex', alignItems:'center', gap:7,
                      boxShadow:'0 4px 14px rgba(22,163,74,0.35)' }}>
                    <CheckCircle width={15} height={15} />
                    {saving ? 'Saving…' : selected ? 'Update Client' : 'Create Client'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirm ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:34, width:390, textAlign:'center',
            boxShadow:'0 24px 70px rgba(0,0,0,0.2)' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'#fee2e2',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <WarningTriangle width={28} height={28} color="#dc2626" />
            </div>
            <h3 style={{ margin:'0 0 10px', fontSize:19, fontWeight:800 }}>Deactivate Client?</h3>
            <p style={{ color:'#64748b', marginBottom:26, lineHeight:1.6 }}>
              <strong>{deleteConfirm.full_name}</strong> will be marked as inactive. No data will be deleted.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDeleteConfirm(null)}
                style={{ flex:1, padding:12, borderRadius:10, border:'1px solid #e2e8f0',
                  background:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>Xmark</button>
              <button onClick={handleDelete}
                style={{ flex:1, padding:12, borderRadius:10, border:'none',
                  background:'#dc2626', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
