import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const TYPE_META = {
  ecommerce:  { bg: '#dbeafe', color: '#1d4ed8', label: 'E-Commerce', icon: '🛒' },
  restaurant: { bg: '#dcfce7', color: '#16a34a', label: 'Restaurant',  icon: '🍽' },
  corporate:  { bg: '#ede9fe', color: '#7c3aed', label: 'Corporate',   icon: '🏢' },
  individual: { bg: '#fef3c7', color: '#d97706', label: 'Individual',  icon: '👤' },
  other:      { bg: '#f1f5f9', color: '#475569', label: 'Other',       icon: '📁' },
};
const EMIRATES = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'];
const CATEGORIES = ['retail','wholesale','food','logistics','healthcare','tech','other'];
const STATUS_COLORS = {
  pending:'#f59e0b',confirmed:'#3b82f6',assigned:'#8b5cf6',picked_up:'#06b6d4',
  in_transit:'#f97316',delivered:'#16a34a',failed:'#dc2626',returned:'#6b7280',cancelled:'#94a3b8',
};
const INPUT = { width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:14,boxSizing:'border-box' };
const LABEL = { display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:5 };

function Avatar({ name, size = 44 }) {
  const initials = name?.split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('') || '?';
  const bg = ['#f97316','#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b','#06b6d4'][(name?.charCodeAt(0)||0)%7];
  return (
    <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color:'#fff',
      fontWeight:700,fontSize:size*0.36,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
      {initials}
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background:'#fff',borderRadius:16,padding:'20px 22px',flex:1,minWidth:160,
      boxShadow:'0 1px 4px rgba(0,0,0,0.08)',borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:28,marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:28,fontWeight:900,lineHeight:1,color:'#1e293b' }}>{value}</div>
      <div style={{ fontSize:13,color:'#64748b',marginTop:5,fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ active }) {
  return (
    <span style={{ background:active?'#dcfce7':'#fee2e2',color:active?'#16a34a':'#dc2626',
      padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:700 }}>
      {active ? '● Active' : '○ Inactive'}
    </span>
  );
}

const LIMIT = 20;
const emptyForm = {
  full_name:'',company_name:'',email:'',phone:'',phone_alt:'',
  type:'individual',client_category:'other',
  address_line1:'',area:'',city:'',emirate:'Dubai',
  credit_limit:'',notes:'',is_active:true,
};

export default function Clients() {
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [emirateFilter, setEmirateFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [showForm,      setShowForm]      = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [drawer,        setDrawer]        = useState(null);
  const [drawerOrders,  setDrawerOrders]  = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const set = (k,v) => setForm(p => ({ ...p, [k]: v }));

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (search)       params.set('search', search);
    if (typeFilter)   params.set('type', typeFilter);
    if (emirateFilter)params.set('emirate', emirateFilter);
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
    setFormError('');
    setShowForm(true);
  };

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

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
    const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `clients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // Computed stats
  const activeCount   = clients.filter(c => c.is_active !== false).length;
  const totalOrders   = clients.reduce((s,c) => s + (parseInt(c.total_orders)||0), 0);
  const corporateCount = clients.filter(c => c.type === 'corporate').length;
  const ecomCount      = clients.filter(c => c.type === 'ecommerce').length;

  const clearFilters = () => { setSearch(''); setTypeFilter(''); setEmirateFilter(''); setStatusFilter(''); setPage(1); };
  const hasFilters = search || typeFilter || emirateFilter || statusFilter;

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <h2 style={{ margin:0,fontSize:27,fontWeight:900,color:'#1e293b',display:'flex',alignItems:'center',gap:10 }}>
            👥 Clients
          </h2>
          <p style={{ margin:'5px 0 0',color:'#64748b',fontSize:14 }}>
            {total} registered clients · {activeCount} active
          </p>
        </div>
        <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
          <button onClick={exportCSV}
            style={{ padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',
              cursor:'pointer',fontWeight:600,fontSize:13,color:'#475569',display:'flex',alignItems:'center',gap:6 }}>
            ⬇ Export CSV
          </button>
          <button onClick={openCreate}
            style={{ padding:'10px 22px',borderRadius:10,border:'none',
              background:'linear-gradient(135deg,#f97316,#ea580c)',color:'#fff',
              cursor:'pointer',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:6,
              boxShadow:'0 4px 14px rgba(249,115,22,0.4)' }}>
            + New Client
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display:'flex',gap:14,marginBottom:24,flexWrap:'wrap' }}>
        <KPICard icon="👥" label="Total Clients"  value={clients.length} sub={`${activeCount} active`}      color="#f97316" />
        <KPICard icon="📦" label="Total Orders"   value={totalOrders}    sub="all time"                     color="#3b82f6" />
        <KPICard icon="🏢" label="Corporate B2B"  value={corporateCount} sub="business accounts"            color="#8b5cf6" />
        <KPICard icon="🛒" label="E-Commerce"     value={ecomCount}      sub="online stores"                color="#10b981" />
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background:'#fff',borderRadius:14,padding:'16px 20px',
        boxShadow:'0 1px 3px rgba(0,0,0,0.07)',marginBottom:20,
        display:'flex',gap:12,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ position:'relative',flex:1,minWidth:220 }}>
          <span style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af' }}>🔍</span>
          <input placeholder="Search name, phone, email, company..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ ...INPUT, paddingLeft:36 }} />
        </div>
        <select value={typeFilter} onChange={e=>{ setTypeFilter(e.target.value); setPage(1); }}
          style={{ ...INPUT, width:155 }}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([t,m]) => <option key={t} value={t}>{m.icon} {m.label}</option>)}
        </select>
        <select value={emirateFilter} onChange={e=>{ setEmirateFilter(e.target.value); setPage(1); }}
          style={{ ...INPUT, width:155 }}>
          <option value="">All Emirates</option>
          {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ ...INPUT, width:130 }}>
          <option value="">All Status</option>
          <option value="active">● Active</option>
          <option value="inactive">○ Inactive</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters}
            style={{ padding:'9px 14px',borderRadius:8,border:'1px solid #fecaca',background:'#fff5f5',
              color:'#dc2626',cursor:'pointer',fontSize:13,fontWeight:600 }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Table Card ── */}
      <div style={{ background:'#fff',borderRadius:16,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'hidden' }}>
        {/* Type breakdown pills */}
        <div style={{ padding:'13px 20px',borderBottom:'1px solid #f1f5f9',
          display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
          <span style={{ fontSize:12,color:'#94a3b8',fontWeight:700,marginRight:4 }}>SEGMENT:</span>
          {Object.entries(TYPE_META).map(([t,m]) => {
            const cnt = clients.filter(c => c.type === t).length;
            if (!cnt) return null;
            const active = typeFilter === t;
            return (
              <button key={t} onClick={() => { setTypeFilter(active?'':t); setPage(1); }}
                style={{ background:active?m.color:m.bg, color:active?'#fff':m.color,
                  border:'none',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700,cursor:'pointer',
                  transition:'all 0.2s' }}>
                {m.icon} {m.label} <span style={{ opacity:0.75 }}>({cnt})</span>
              </button>
            );
          })}
          <span style={{ marginLeft:'auto',color:'#94a3b8',fontSize:13 }}>
            {clients.length} shown
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:70 }}>
            <div style={{ fontSize:44,marginBottom:14 }}>⏳</div>
            <div style={{ color:'#94a3b8',fontSize:16 }}>Loading clients...</div>
          </div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign:'center',padding:70 }}>
            <div style={{ fontSize:56,marginBottom:12 }}>👥</div>
            <div style={{ fontWeight:800,fontSize:20,marginBottom:6 }}>
              {hasFilters ? 'No clients match your filters' : 'No clients yet'}
            </div>
            <div style={{ color:'#94a3b8',marginBottom:24,fontSize:14 }}>
              {hasFilters ? 'Try adjusting your search or filters' : 'Add your first client to get started'}
            </div>
            {hasFilters
              ? <button onClick={clearFilters} style={{ padding:'10px 24px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontWeight:600 }}>Clear Filters</button>
              : <button onClick={openCreate} style={{ padding:'11px 28px',borderRadius:10,border:'none',background:'#f97316',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:15 }}>+ Add First Client</button>
            }
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:860 }}>
                <thead>
                  <tr style={{ background:'#f8fafc',borderBottom:'2px solid #f1f5f9' }}>
                    {['Client','Type','Contact','Emirate','Orders','Credit Limit','Status',''].map(h => (
                      <th key={h} style={{ padding:'11px 16px',textAlign:'left',fontSize:11,
                        fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => {
                    const tm = TYPE_META[client.type] || TYPE_META.other;
                    const creditLimit = parseFloat(client.credit_limit)||0;
                    const creditPct   = creditLimit > 0 ? Math.min(100,(parseFloat(client.credit_used||0)/creditLimit)*100) : 0;
                    const isActive = client.is_active !== false;
                    return (
                      <tr key={client.id}
                        onClick={() => openDrawer(client)}
                        style={{ borderBottom:'1px solid #f8fafc',cursor:'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                            <Avatar name={client.full_name} />
                            <div>
                              <div style={{ fontWeight:700,fontSize:14,color:'#1e293b' }}>{client.full_name}</div>
                              {client.company_name && <div style={{ fontSize:12,color:'#64748b',marginTop:1 }}>🏢 {client.company_name}</div>}
                              {!isActive && <div style={{ fontSize:11,color:'#dc2626',marginTop:1,fontWeight:600 }}>Deactivated</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <span style={{ background:tm.bg,color:tm.color,padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:700 }}>
                            {tm.icon} {tm.label}
                          </span>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ fontSize:13,fontWeight:600,color:'#1e293b' }}>{client.phone}</div>
                          {client.email && <div style={{ fontSize:12,color:'#94a3b8',marginTop:1 }}>{client.email}</div>}
                        </td>
                        <td style={{ padding:'14px 16px',fontSize:13,color:'#475569' }}>{client.emirate||'—'}</td>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ fontSize:17,fontWeight:800,color:'#1e293b' }}>{client.total_orders||0}</div>
                          {parseInt(client.delivered_orders)>0 && (
                            <div style={{ fontSize:11,color:'#16a34a',fontWeight:600 }}>✓ {client.delivered_orders} done</div>
                          )}
                        </td>
                        <td style={{ padding:'14px 16px',minWidth:130 }}>
                          {creditLimit > 0 ? (
                            <>
                              <div style={{ fontSize:12,color:'#64748b',marginBottom:5,fontWeight:600 }}>
                                AED {parseFloat(client.credit_used||0).toFixed(0)} / {creditLimit.toFixed(0)}
                              </div>
                              <div style={{ height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden' }}>
                                <div style={{ height:'100%',borderRadius:3,width:creditPct+'%',
                                  background:creditPct>80?'#dc2626':creditPct>50?'#f59e0b':'#16a34a',
                                  transition:'width 0.4s' }} />
                              </div>
                            </>
                          ) : <span style={{ color:'#cbd5e1',fontSize:13 }}>No limit</span>}
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <StatusPill active={isActive} />
                        </td>
                        <td style={{ padding:'14px 16px' }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex',gap:6 }}>
                            <button onClick={e=>openEdit(client,e)}
                              style={{ padding:'6px 12px',borderRadius:8,border:'1px solid #e2e8f0',
                                background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151' }}>
                              ✏ Edit
                            </button>
                            <button onClick={e=>{ e.stopPropagation(); setDeleteConfirm(client); }}
                              style={{ padding:'6px 10px',borderRadius:8,border:'1px solid #fecaca',
                                background:'#fff5f5',color:'#dc2626',cursor:'pointer',fontSize:13 }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div style={{ padding:'14px 20px',borderTop:'1px solid #f1f5f9',
                display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:13,color:'#64748b' }}>
                  Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total} clients
                </span>
                <div style={{ display:'flex',gap:8 }}>
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
                    style={{ padding:'7px 16px',borderRadius:8,border:'1px solid #e2e8f0',
                      background:page===1?'#f8fafc':'#fff',cursor:page===1?'not-allowed':'pointer',fontSize:13,fontWeight:600 }}>
                    ← Prev
                  </button>
                  <span style={{ padding:'7px 14px',fontSize:13,color:'#64748b',fontWeight:600 }}>
                    Page {page}
                  </span>
                  <button disabled={page*LIMIT>=total} onClick={()=>setPage(p=>p+1)}
                    style={{ padding:'7px 16px',borderRadius:8,border:'1px solid #e2e8f0',
                      background:page*LIMIT>=total?'#f8fafc':'#fff',cursor:page*LIMIT>=total?'not-allowed':'pointer',fontSize:13,fontWeight:600 }}>
                    Next →
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
            style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:900 }} />
          <div style={{ position:'fixed',top:0,right:0,bottom:0,width:520,maxWidth:'96vw',
            background:'#f8fafc',zIndex:901,overflowY:'auto',
            boxShadow:'-8px 0 40px rgba(0,0,0,0.15)',display:'flex',flexDirection:'column' }}>

            {/* Drawer top */}
            <div style={{ background:'linear-gradient(135deg,#1e293b,#334155)',padding:'28px 28px 24px',position:'relative' }}>
              <button onClick={() => setDrawer(null)}
                style={{ position:'absolute',top:16,right:16,background:'rgba(255,255,255,0.12)',border:'none',
                  color:'#fff',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:16,
                  display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
              <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:16 }}>
                <Avatar name={drawer.full_name} size={62} />
                <div>
                  <div style={{ color:'#fff',fontWeight:800,fontSize:21,lineHeight:1.2 }}>{drawer.full_name}</div>
                  {drawer.company_name && <div style={{ color:'#94a3b8',fontSize:13,marginTop:3 }}>🏢 {drawer.company_name}</div>}
                  <div style={{ marginTop:8,display:'flex',gap:8,flexWrap:'wrap' }}>
                    <StatusPill active={drawer.is_active!==false} />
                    {drawer.type && (
                      <span style={{ background:TYPE_META[drawer.type]?.bg,color:TYPE_META[drawer.type]?.color,
                        padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:700 }}>
                        {TYPE_META[drawer.type]?.icon} {TYPE_META[drawer.type]?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={e=>openEdit(drawer,e)}
                  style={{ flex:1,padding:'10px',borderRadius:10,border:'none',
                    background:'#f97316',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14 }}>
                  ✏ Edit Client
                </button>
                <button onClick={e=>handleToggle(drawer,e)}
                  style={{ flex:1,padding:'10px',borderRadius:10,border:'1px solid rgba(255,255,255,0.2)',
                    background:'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontWeight:600,fontSize:14 }}>
                  {drawer.is_active!==false ? '⏸ Deactivate' : '▶ Activate'}
                </button>
              </div>
            </div>

            <div style={{ padding:24,flex:1 }}>
              {drawerLoading ? (
                <div style={{ textAlign:'center',padding:50,color:'#94a3b8',fontSize:16 }}>Loading details...</div>
              ) : (
                <>
                  {/* Mini stats */}
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:22 }}>
                    {[
                      { label:'Total Orders',  value:drawer.total_orders||0,                       icon:'📦',color:'#3b82f6' },
                      { label:'Delivered',     value:drawer.delivered_orders||0,                   icon:'✅',color:'#16a34a' },
                      { label:'Credit Limit',  value:drawer.credit_limit ? 'AED '+parseFloat(drawer.credit_limit).toFixed(0) : 'No limit', icon:'💳',color:'#8b5cf6' },
                      { label:'Emirate',       value:drawer.emirate||'—',                          icon:'📍',color:'#f97316' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#fff',borderRadius:12,padding:'14px 16px',
                        borderLeft:`4px solid ${s.color}`,boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                          <span style={{ fontSize:24 }}>{s.icon}</span>
                          <div>
                            <div style={{ fontWeight:800,fontSize:17,color:'#1e293b' }}>{s.value}</div>
                            <div style={{ fontSize:11,color:'#94a3b8',fontWeight:600,marginTop:1 }}>{s.label}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Profile */}
                  <div style={{ background:'#fff',borderRadius:14,padding:20,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.07)',marginBottom:18 }}>
                    <div style={{ fontWeight:700,fontSize:14,marginBottom:14,color:'#374151',
                      display:'flex',alignItems:'center',gap:6 }}>
                      📋 Profile Information
                    </div>
                    {[
                      { label:'Phone',    value:drawer.phone },
                      { label:'Alt Phone',value:drawer.phone_alt },
                      { label:'Email',    value:drawer.email },
                      { label:'Emirates', value:drawer.emirate },
                      { label:'Zone',     value:drawer.zone_name },
                      { label:'Address',  value:[drawer.address_line1,drawer.area,drawer.city].filter(Boolean).join(', ') },
                      { label:'Category', value:CATEGORIES.includes(drawer.client_category)?drawer.client_category?.charAt(0).toUpperCase()+drawer.client_category?.slice(1):drawer.client_category },
                      { label:'Notes',    value:drawer.notes },
                      { label:'Joined',   value:drawer.created_at ? new Date(drawer.created_at).toLocaleDateString() : null },
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} style={{ display:'flex',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:14 }}>
                        <span style={{ width:110,color:'#94a3b8',fontSize:12,fontWeight:600,flexShrink:0,paddingTop:1 }}>{row.label}</span>
                        <span style={{ color:'#1e293b',fontWeight:500,flex:1 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent orders */}
                  {drawerOrders.length > 0 && (
                    <div style={{ background:'#fff',borderRadius:14,padding:20,
                      boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
                      <div style={{ fontWeight:700,fontSize:14,marginBottom:14,color:'#374151',
                        display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                        <span>🚚 Recent Orders</span>
                        <span style={{ color:'#94a3b8',fontSize:12,fontWeight:500 }}>{drawerOrders.length} total</span>
                      </div>
                      {drawerOrders.slice(0,8).map(o => {
                        const sc = STATUS_COLORS[o.status]||'#94a3b8';
                        return (
                          <div key={o.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',
                            padding:'10px 0',borderBottom:'1px solid #f8fafc' }}>
                            <div>
                              <div style={{ fontWeight:700,fontSize:13,color:'#1e293b' }}>#{o.order_number}</div>
                              <div style={{ fontSize:11,color:'#94a3b8',marginTop:1 }}>{new Date(o.created_at).toLocaleDateString()}</div>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <span style={{ background:sc+'20',color:sc,padding:'3px 10px',
                                borderRadius:20,fontSize:11,fontWeight:700,textTransform:'capitalize' }}>
                                {o.status?.replace(/_/g,' ')}
                              </span>
                              {o.total_amount && (
                                <div style={{ fontSize:12,color:'#64748b',marginTop:3,fontWeight:600 }}>
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

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:20,width:'100%',maxWidth:660,
            maxHeight:'92vh',overflowY:'auto',boxShadow:'0 24px 70px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'24px 28px',borderBottom:'1px solid #f1f5f9',
              display:'flex',justifyContent:'space-between',alignItems:'center',
              background:'linear-gradient(135deg,#fff,#f8fafc)',borderRadius:'20px 20px 0 0' }}>
              <div>
                <h3 style={{ margin:0,fontSize:21,fontWeight:800,color:'#1e293b' }}>
                  {selected ? '✏ Edit Client' : '+ New Client'}
                </h3>
                <p style={{ margin:'4px 0 0',color:'#94a3b8',fontSize:13 }}>
                  {selected ? 'Update client information below' : 'Fill in the details to register a new client'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)}
                style={{ background:'#f1f5f9',border:'none',fontSize:20,cursor:'pointer',
                  color:'#64748b',width:36,height:36,borderRadius:'50%',
                  display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding:28 }}>
              {formError && (
                <div style={{ background:'#fee2e2',color:'#dc2626',padding:'10px 14px',
                  borderRadius:8,marginBottom:18,fontSize:14,display:'flex',alignItems:'center',gap:8 }}>
                  ⚠ {formError}
                </div>
              )}

              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                {/* Full Name */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={LABEL}>Full Name *</label>
                  <input required value={form.full_name} onChange={e=>set('full_name',e.target.value)}
                    style={INPUT} placeholder="e.g. Ahmed Al Mansouri" />
                </div>
                {/* Company */}
                <div>
                  <label style={LABEL}>Company Name</label>
                  <input value={form.company_name} onChange={e=>set('company_name',e.target.value)}
                    style={INPUT} placeholder="Acme LLC" />
                </div>
                {/* Type */}
                <div>
                  <label style={LABEL}>Client Type</label>
                  <select value={form.type} onChange={e=>set('type',e.target.value)} style={INPUT}>
                    {Object.entries(TYPE_META).map(([t,m]) => <option key={t} value={t}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
                {/* Phone */}
                <div>
                  <label style={LABEL}>Phone *</label>
                  <input required value={form.phone} onChange={e=>set('phone',e.target.value)}
                    style={INPUT} placeholder="+971 50 123 4567" />
                </div>
                {/* Alt Phone */}
                <div>
                  <label style={LABEL}>Alt Phone</label>
                  <input value={form.phone_alt} onChange={e=>set('phone_alt',e.target.value)}
                    style={INPUT} placeholder="Optional" />
                </div>
                {/* Email */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={LABEL}>Email Address</label>
                  <input type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                    style={INPUT} placeholder="client@company.com" />
                </div>
                {/* Emirate */}
                <div>
                  <label style={LABEL}>Emirate</label>
                  <select value={form.emirate} onChange={e=>set('emirate',e.target.value)} style={INPUT}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                {/* Category */}
                <div>
                  <label style={LABEL}>Business Category</label>
                  <select value={form.client_category} onChange={e=>set('client_category',e.target.value)} style={INPUT}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                {/* Address */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={LABEL}>Street Address</label>
                  <input value={form.address_line1} onChange={e=>set('address_line1',e.target.value)}
                    style={INPUT} placeholder="Building, Street, Floor, Flat" />
                </div>
                {/* Area */}
                <div>
                  <label style={LABEL}>Area / Community</label>
                  <input value={form.area} onChange={e=>set('area',e.target.value)}
                    style={INPUT} placeholder="Downtown, JVC, Business Bay…" />
                </div>
                {/* City */}
                <div>
                  <label style={LABEL}>City</label>
                  <input value={form.city} onChange={e=>set('city',e.target.value)}
                    style={INPUT} placeholder="Dubai" />
                </div>
                {/* Credit Limit */}
                <div>
                  <label style={LABEL}>Credit Limit (AED)</label>
                  <input type="number" min="0" value={form.credit_limit}
                    onChange={e=>set('credit_limit',e.target.value)}
                    style={INPUT} placeholder="0 = No limit" />
                </div>
                {/* Active */}
                <div style={{ display:'flex',alignItems:'center',gap:10,paddingTop:22 }}>
                  <input type="checkbox" id="chk_active" checked={form.is_active!==false}
                    onChange={e=>set('is_active',e.target.checked)}
                    style={{ width:17,height:17,accentColor:'#f97316' }} />
                  <label htmlFor="chk_active" style={{ fontSize:14,fontWeight:600,cursor:'pointer',color:'#374151' }}>
                    Active client
                  </label>
                </div>
                {/* Notes */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={LABEL}>Internal Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)}
                    style={{ ...INPUT,resize:'vertical' }}
                    placeholder="Any internal notes or special instructions…" />
                </div>
              </div>

              <div style={{ display:'flex',gap:12,marginTop:26,justifyContent:'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{ padding:'11px 24px',borderRadius:10,border:'1px solid #e2e8f0',
                    background:'#fff',cursor:'pointer',fontWeight:600,fontSize:14 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding:'11px 32px',borderRadius:10,border:'none',
                    background:'linear-gradient(135deg,#f97316,#ea580c)',color:'#fff',
                    cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:14,
                    opacity:saving?0.7:1,boxShadow:'0 4px 14px rgba(249,115,22,0.35)' }}>
                  {saving ? '⏳ Saving…' : selected ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirm ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:1100,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:20,padding:36,width:400,textAlign:'center',
            boxShadow:'0 24px 70px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:52,marginBottom:14 }}>⚠️</div>
            <h3 style={{ margin:'0 0 10px',fontSize:20,fontWeight:800 }}>Deactivate Client?</h3>
            <p style={{ color:'#64748b',marginBottom:28,lineHeight:1.6 }}>
              <strong>{deleteConfirm.full_name}</strong> will be marked as inactive and hidden from active lists.
              No data will be deleted.
            </p>
            <div style={{ display:'flex',gap:12 }}>
              <button onClick={()=>setDeleteConfirm(null)}
                style={{ flex:1,padding:12,borderRadius:10,border:'1px solid #e2e8f0',
                  background:'#fff',cursor:'pointer',fontWeight:600,fontSize:14 }}>Cancel</button>
              <button onClick={handleDelete}
                style={{ flex:1,padding:12,borderRadius:10,border:'none',
                  background:'#dc2626',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14 }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
