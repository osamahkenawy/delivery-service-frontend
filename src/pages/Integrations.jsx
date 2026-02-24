import { useState, useEffect, useCallback } from 'react';
import {
  Key, Network, DataTransferBoth, Plus, Trash, RefreshDouble,
  Copy, Check, ArrowUpRight, Lock, CheckCircle, Clock
} from 'iconoir-react';
import api from '../lib/api';
import './Integrations.css';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-AE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const trunc   = (s, n = 50) => s?.length > n ? s.slice(0, n) + '…' : s;

const EVENT_GROUPS = {
  'Order Events':   ['order.created','order.confirmed','order.assigned','order.picked_up','order.in_transit','order.delivered','order.failed','order.returned','order.cancelled'],
  'Return Events':  ['return.created','return.approved','return.picked_up','return.refunded'],
  'Driver Events':  ['driver.assigned','driver.location'],
  'Finance Events': ['cod.settled'],
};

const STATUS_BADGE = {
  sent:    { bg: '#dcfce7', color: '#16a34a', label: 'Sent' },
  failed:  { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
};

function APIKeysTab() {
  const [keys,       setKeys]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form,       setForm]       = useState({ name: '', permissions: 'read', expires_at: '' });
  const [saving,     setSaving]     = useState(false);
  const [newKey,     setNewKey]     = useState(null);
  const [copied,     setCopied]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/integrations');
    if (res.success) setKeys(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async e => {
    e.preventDefault(); setSaving(true);
    const res = await api.post('/integrations', form);
    if (res.success) {
      setNewKey(res.data?.key || res.data?.api_key || res.data?.secret);
      setForm({ name: '', permissions: 'read', expires_at: '' });
      setShowCreate(false);
      load();
    }
    setSaving(false);
  };

  const copy = val => { navigator.clipboard.writeText(val); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <div className="intg-section-header">
        <div>
          <h3 className="intg-section-title">API Keys</h3>
          <p className="intg-section-sub">Authenticate external systems — Shopify, WooCommerce, ERPs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus width={16} height={16} /> Generate Key
        </button>
      </div>
      {newKey && (
        <div className="intg-key-banner">
          <div className="intg-key-banner-title"><CheckCircle width={17} height={17} /> API Key Created — copy now, it will not be shown again</div>
          <div className="intg-key-banner-row">
            <code className="intg-key-code">{newKey}</code>
            <button className={`intg-copy-btn${copied?' copied':''}`} onClick={() => copy(newKey)}>
              {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button className="intg-dismiss" onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}
      {loading ? <div className="loading-state">Loading…</div>
       : keys.length === 0 ? (
        <div className="empty-state">
          <Key width={40} height={40} className="empty-state-icon" />
          <div className="empty-state-title">No API keys yet</div>
          <div className="empty-state-sub">Generate a key to connect third-party apps</div>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead><tr>{['Name','Key Preview','Permissions','Status','Expires','Created','Actions'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td><div className="td-primary">{k.name}</div></td>
                  <td><code className="intg-key-preview">{k.key_preview || (k.api_key ? k.api_key.slice(0,22)+'…' : '••••')}</code></td>
                  <td><span className="badge badge-blue">{k.permissions||'read'}</span></td>
                  <td><span className={`badge ${k.is_active?'badge-green':'badge-gray'}`}>{k.is_active?'Active':'Revoked'}</span></td>
                  <td className="td-secondary">{k.expires_at ? fmtDate(k.expires_at) : 'Never'}</td>
                  <td className="td-secondary">{fmtDate(k.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-ghost-sm" onClick={() => api.patch(`/integrations/${k.id}/toggle`).then(load)}>
                        {k.is_active ? 'Revoke' : 'Enable'}
                      </button>
                      <button className="btn-danger-sm" onClick={async()=>{if(!confirm('Delete this key?'))return; await api.delete(`/integrations/${k.id}`); load();}}>
                        <Trash width={13} height={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="modal-box">
            <div className="modal-header"><h3>Generate API Key</h3><button className="modal-close" onClick={()=>setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Key Name *</label><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. WooCommerce" className="form-input" /></div>
              <div className="form-group"><label>Permissions</label>
                <select value={form.permissions} onChange={e=>setForm(f=>({...f,permissions:e.target.value}))} className="form-select">
                  <option value="read">Read Only</option><option value="write">Read and Write</option><option value="full">Full Access</option>
                </select>
              </div>
              <div className="form-group"><label>Expires At (optional)</label><input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} className="form-input" /></div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Generating…':'Generate Key'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhooksTab() {
  const [webhooks,   setWebhooks]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [form,       setForm]       = useState({ name:'', url:'', description:'', events:[] });
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(null);
  const [testResult, setTestResult] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/webhooks');
    if (res.success) setWebhooks(res.data || []);
    else setWebhooks([]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({name:'',url:'',description:'',events:[]}); setEditId(null); setShowModal(true); };
  const openEdit   = wh => { setForm({name:wh.name,url:wh.url,description:wh.description||'',events:wh.events||[]}); setEditId(wh.id); setShowModal(true); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    const res = editId ? await api.put(`/webhooks/${editId}`, form) : await api.post('/webhooks', form);
    if (res.success) { setShowModal(false); load(); }
    setSaving(false);
  };

  const toggle    = async id => { await api.patch(`/webhooks/${id}/toggle`); load(); };
  const del       = async id => { if(!confirm('Delete this webhook?'))return; await api.delete(`/webhooks/${id}`); load(); };

  const testPing  = async id => {
    setTesting(id);
    const res = await api.post(`/webhooks/${id}/test`);
    setTestResult(r => ({ ...r, [id]: res.data || res }));
    setTesting(null);
  };

  const toggleEvent = ev => setForm(f => ({
    ...f, events: f.events.includes(ev) ? f.events.filter(e=>e!==ev) : [...f.events, ev],
  }));

  const toggleGroup = evts => setForm(f => {
    const all = evts.every(e => f.events.includes(e));
    return { ...f, events: all ? f.events.filter(e=>!evts.includes(e)) : [...new Set([...f.events,...evts])] };
  });

  return (
    <div>
      <div className="intg-section-header">
        <div>
          <h3 className="intg-section-title">Webhook Endpoints</h3>
          <p className="intg-section-sub">Send real-time HTTP POST events to your apps on order status changes</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus width={16} height={16} /> Add Endpoint</button>
      </div>
      {loading ? <div className="loading-state">Loading…</div>
       : webhooks.length === 0 ? (
        <div className="empty-state">
          <Network width={42} height={42} className="empty-state-icon" />
          <div className="empty-state-title">No webhook endpoints</div>
          <div className="empty-state-sub">Add an endpoint to receive real-time delivery events</div>
          <button className="btn-primary" style={{marginTop:16}} onClick={openCreate}><Plus width={14} height={14} /> Add First Endpoint</button>
        </div>
      ) : (
        <div className="intg-webhook-list">
          {webhooks.map(wh => (
            <div key={wh.id} className={`intg-webhook-card${!wh.is_active?' inactive':''}`}>
              <div className="intg-webhook-top">
                <div className="intg-webhook-info">
                  <div className="intg-webhook-name">{wh.name}</div>
                  <a href={wh.url} target="_blank" rel="noreferrer" className="intg-webhook-url">
                    {trunc(wh.url,65)} <ArrowUpRight width={11} height={11} />
                  </a>
                  {wh.description && <div className="intg-webhook-desc">{wh.description}</div>}
                </div>
                <div className="intg-webhook-meta">
                  {wh.failure_count > 0 && <span className="badge badge-red">{wh.failure_count} failures</span>}
                  <span className={`badge ${wh.is_active?'badge-green':'badge-gray'}`}>{wh.is_active?'Active':'Paused'}</span>
                </div>
              </div>
              <div className="intg-webhook-events">
                {(wh.events||[]).map(ev=><span key={ev} className="intg-event-chip">{ev}</span>)}
                {(!wh.events||!wh.events.length)&&<span className="td-secondary" style={{fontSize:12}}>No events subscribed</span>}
              </div>
              {wh.last_fired_at && <div className="intg-webhook-last">Last fired: {fmtTime(wh.last_fired_at)}</div>}
              {testResult[wh.id] && (
                <div className={`intg-test-result ${testResult[wh.id].status==='sent'?'success':'fail'}`}>
                  {testResult[wh.id].status==='sent'
                    ? `✓ Test sent — HTTP ${testResult[wh.id].httpStatus} (${testResult[wh.id].durationMs}ms)`
                    : `✗ Failed — ${testResult[wh.id].response||'No response'}`}
                </div>
              )}
              <div className="intg-webhook-actions">
                <button className="btn-ghost-sm" onClick={()=>testPing(wh.id)} disabled={testing===wh.id}>
                  <RefreshDouble width={13} height={13} /> {testing===wh.id?'Testing…':'Test Ping'}
                </button>
                <button className="btn-ghost-sm" onClick={()=>openEdit(wh)}>Edit</button>
                <button className="btn-ghost-sm" onClick={()=>toggle(wh.id)}>{wh.is_active?'Pause':'Activate'}</button>
                <button className="btn-danger-sm" onClick={()=>del(wh.id)}><Trash width={13} height={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal-box modal-lg">
            <div className="modal-header">
              <h3>{editId?'Edit Webhook':'Add Webhook Endpoint'}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Endpoint Name *</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Shopify Update" className="form-input" />
                </div>
                <div className="form-group">
                  <label>Endpoint URL *</label>
                  <input required type="url" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://yourapp.com/webhook" className="form-input" />
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Description (optional)</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What does this endpoint do?" className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>Subscribe to Events</label>
                <div className="intg-event-groups">
                  {Object.entries(EVENT_GROUPS).map(([group, evts]) => (
                    <div key={group} className="intg-event-group">
                      <div className="intg-event-group-header" onClick={()=>toggleGroup(evts)}>
                        <span className="intg-event-group-name">{group}</span>
                        <span className="intg-event-group-sel">{evts.filter(e=>form.events.includes(e)).length}/{evts.length}</span>
                      </div>
                      <div className="intg-event-checkboxes">
                        {evts.map(ev=>(
                          <label key={ev} className="intg-event-check">
                            <input type="checkbox" checked={form.events.includes(ev)} onChange={()=>toggleEvent(ev)} />
                            <span>{ev}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="form-hint"><Lock width={12} height={12} /> Requests signed with <code>X-Trasealla-Signature</code> HMAC-SHA256.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving…':editId?'Update':'Create Webhook'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryLogTab() {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [fStatus,  setFStatus]  = useState('');
  const [fEvent,   setFEvent]   = useState('');
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 50 });
    if (fStatus) p.set('status', fStatus);
    if (fEvent)  p.set('event',  fEvent);
    const res = await api.get(`/webhooks/deliveries?${p}`);
    if (res.success) { setRows(res.data||[]); setTotal(res.total||0); }
    else setRows([]);
    setLoading(false);
  }, [page, fStatus, fEvent]);

  useEffect(() => { load(); }, [load]);

  const retry = async id => { setRetrying(id); await api.post(`/webhooks/retry/${id}`); setRetrying(null); load(); };

  return (
    <div>
      <div className="intg-section-header">
        <div>
          <h3 className="intg-section-title">Webhook Delivery Log</h3>
          <p className="intg-section-sub">{total} deliveries total</p>
        </div>
        <div className="filter-row">
          <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}} className="form-select-sm">
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <input value={fEvent} onChange={e=>{setFEvent(e.target.value);setPage(1);}} placeholder="Filter event…" className="form-input-sm" />
        </div>
      </div>
      {loading ? <div className="loading-state">Loading…</div>
       : rows.length === 0 ? (
        <div className="empty-state">
          <DataTransferBoth width={40} height={40} className="empty-state-icon" />
          <div className="empty-state-title">No deliveries yet</div>
          <div className="empty-state-sub">Webhook events appear here once triggered</div>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead><tr>{['Event','Endpoint','Status','HTTP','Duration','Attempt','Time',''].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(r => {
                const sb = STATUS_BADGE[r.status]||STATUS_BADGE.pending;
                return (
                  <tr key={r.id}>
                    <td><span className="intg-event-chip">{r.event}</span></td>
                    <td>
                      <div className="td-primary">{r.endpoint_name||'—'}</div>
                      <div className="td-secondary">{trunc(r.url,42)}</div>
                    </td>
                    <td><span className="badge" style={{background:sb.bg,color:sb.color}}>{sb.label}</span></td>
                    <td className="td-secondary">{r.http_status||'—'}</td>
                    <td className="td-secondary">{r.duration_ms!=null?`${r.duration_ms}ms`:'—'}</td>
                    <td className="td-secondary">{r.attempt}</td>
                    <td className="td-secondary">{fmtTime(r.delivered_at||r.created_at)}</td>
                    <td>{r.status==='failed'&&<button className="btn-ghost-sm" disabled={retrying===r.id} onClick={()=>retry(r.id)}><RefreshDouble width={12} height={12}/>{retrying===r.id?'…':'Retry'}</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total>50&&(
            <div className="pagination-bar">
              <button className="btn-ghost-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Prev</button>
              <span className="td-secondary">Page {page} of {Math.ceil(total/50)}</span>
              <button className="btn-ghost-sm" disabled={rows.length<50} onClick={()=>setPage(p=>p+1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id:'api-keys', label:'API Keys',     icon: Key },
  { id:'webhooks', label:'Webhooks',     icon: Network },
  { id:'log',      label:'Delivery Log', icon: DataTransferBoth },
];

export default function Integrations() {
  const [tab, setTab] = useState('api-keys');
  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Integrations</h2>
          <p className="page-subheading">API keys, webhooks and third-party connectivity</p>
        </div>
      </div>
      <div className="intg-tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`intg-tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <t.icon width={15} height={15} /> {t.label}
          </button>
        ))}
      </div>
      <div className="intg-tab-body">
        {tab==='api-keys' && <APIKeysTab />}
        {tab==='webhooks' && <WebhooksTab />}
        {tab==='log'      && <DeliveryLogTab />}
      </div>
    </div>
  );
}
