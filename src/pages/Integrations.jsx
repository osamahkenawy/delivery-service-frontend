import { useState, useEffect, useCallback } from 'react';
import {
  Key, Network, DataTransferBoth, Plus, Trash, RefreshDouble,
  Copy, Check, ArrowUpRight, Lock, CheckCircle, Clock, Book
} from 'iconoir-react';
import api from '../lib/api';
import './Integrations.css';
import { useTranslation } from 'react-i18next';

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
  sent:    { bg: '#dcfce7', color: '#16a34a', labelKey: 'integrations.status_sent' },
  failed:  { bg: '#fee2e2', color: '#dc2626', labelKey: 'integrations.status_failed' },
  pending: { bg: '#fef3c7', color: '#d97706', labelKey: 'integrations.status_pending' },
};

function APIKeysTab() {
  const { t } = useTranslation();
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
          <h3 className="intg-section-title">{t("integrations.api_keys")}</h3>
          <p className="intg-section-sub">{t('integrations.api_keys_sub')}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus width={16} height={16} /> {t('integrations.generate_key_btn')}
        </button>
      </div>
      {newKey && (
        <div className="intg-key-banner">
          <div className="intg-key-banner-title"><CheckCircle width={17} height={17} /> {t('integrations.key_created_notice')}</div>
          <div className="intg-key-banner-row">
            <code className="intg-key-code">{newKey}</code>
            <button className={`intg-copy-btn${copied?' copied':''}`} onClick={() => copy(newKey)}>
              {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />} {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          <button className="intg-dismiss" onClick={() => setNewKey(null)}>{t('integrations.dismiss')}</button>
        </div>
      )}
      {loading ? <div className="loading-state">{t('common.loading')}</div>
       : keys.length === 0 ? (
        <div className="empty-state">
          <Key width={40} height={40} className="empty-state-icon" />
          <div className="empty-state-title">{t("integrations.no_keys")}</div>
          <div className="empty-state-sub">{t("integrations.api_keys_desc")}</div>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead><tr>{[t('integrations.col.name'),t('integrations.col.key_preview'),t('integrations.col.permissions'),t('integrations.col.status'),t('integrations.col.expires'),t('integrations.col.created'),t('integrations.col.actions')].map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td><div className="td-primary">{k.name}</div></td>
                  <td><code className="intg-key-preview">{k.key_preview || (k.api_key ? k.api_key.slice(0,22)+'…' : '••••')}</code></td>
                  <td><span className="badge badge-blue">{k.permissions||'read'}</span></td>
                  <td><span className={`badge ${k.is_active?'badge-green':'badge-gray'}`}>{k.is_active?t('integrations.active'):t('integrations.revoked')}</span></td>
                  <td className="td-secondary">{k.expires_at ? fmtDate(k.expires_at) : t('integrations.expires_never')}</td>
                  <td className="td-secondary">{fmtDate(k.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-ghost-sm" onClick={() => api.patch(`/integrations/${k.id}/toggle`).then(load)}>
                        {k.is_active ? t('integrations.revoke') : t('integrations.enable')}
                      </button>
                      <button className="btn-danger-sm" onClick={async()=>{if(!confirm(t('integrations.delete_key_confirm')))return; await api.delete(`/integrations/${k.id}`); load();}}>
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
            <div className="modal-header"><h3>{t("integrations.generate_key")}</h3><button className="modal-close" onClick={()=>setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>{t('integrations.form.key_name')}</label><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={t('integrations.form.key_name_placeholder')} className="form-input" /></div>
              <div className="form-group"><label>{t('integrations.form.permissions')}</label>
                <select value={form.permissions} onChange={e=>setForm(f=>({...f,permissions:e.target.value}))} className="form-select">
                  <option value="read">{t("integrations.read_only")}</option><option value="write">{t("integrations.read_write")}</option><option value="full">{t("integrations.full_access")}</option>
                </select>
              </div>
              <div className="form-group"><label>{t('integrations.form.expires_at')}</label><input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} className="form-input" /></div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={()=>setShowCreate(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?t('integrations.generating'):t('integrations.generate_key_btn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhooksTab() {
  const { t } = useTranslation();
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
  const del       = async id => { if(!confirm(t('integrations.delete_webhook_confirm')))return; await api.delete(`/webhooks/${id}`); load(); };

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
          <h3 className="intg-section-title">{t('integrations.webhooks_title')}</h3>
          <p className="intg-section-sub">{t('integrations.webhooks_sub')}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus width={16} height={16} /> {t('integrations.add_endpoint')}</button>
      </div>
      {loading ? <div className="loading-state">{t('common.loading')}</div>
       : webhooks.length === 0 ? (
        <div className="empty-state">
          <Network width={42} height={42} className="empty-state-icon" />
          <div className="empty-state-title">{t("integrations.no_webhooks")}</div>
          <div className="empty-state-sub">{t('integrations.no_webhooks_hint')}</div>
          <button className="btn-primary" style={{marginTop:16}} onClick={openCreate}><Plus width={14} height={14} /> {t('integrations.add_first_endpoint')}</button>
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
                  {wh.failure_count > 0 && <span className="badge badge-red">{t('integrations.failures_count', {count: wh.failure_count})}</span>}
                  <span className={`badge ${wh.is_active?'badge-green':'badge-gray'}`}>{wh.is_active?t('integrations.active'):t('integrations.paused')}</span>
                </div>
              </div>
              <div className="intg-webhook-events">
                {(wh.events||[]).map(ev=><span key={ev} className="intg-event-chip">{ev}</span>)}
                {(!wh.events||!wh.events.length)&&<span className="td-secondary" style={{fontSize:12}}>{t("integrations.no_events")}</span>}
              </div>
              {wh.last_fired_at && <div className="intg-webhook-last">{t('integrations.last_fired')}{fmtTime(wh.last_fired_at)}</div>}
              {testResult[wh.id] && (
                <div className={`intg-test-result ${testResult[wh.id].status==='sent'?'success':'fail'}`}>
                  {testResult[wh.id].status==='sent'
                    ? t('integrations.test_sent_success', {status: testResult[wh.id].httpStatus, ms: testResult[wh.id].durationMs})
                    : t('integrations.test_failed_result', {response: testResult[wh.id].response || t('integrations.no_response')})}
                </div>
              )}
              <div className="intg-webhook-actions">
                <button className="btn-ghost-sm" onClick={()=>testPing(wh.id)} disabled={testing===wh.id}>
                  <RefreshDouble width={13} height={13} /> {testing===wh.id?t('integrations.testing'):t('integrations.test_ping')}
                </button>
                <button className="btn-ghost-sm" onClick={()=>openEdit(wh)}>{t('common.edit')}</button>
                <button className="btn-ghost-sm" onClick={()=>toggle(wh.id)}>{wh.is_active?t('integrations.pause'):t('integrations.activate')}</button>
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
              <h3>{editId?t('integrations.modal.edit_webhook'):t('integrations.modal.add_webhook')}</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>{t('integrations.form.endpoint_name')}</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={t('integrations.endpoint_name_placeholder')} className="form-input" />
                </div>
                <div className="form-group">
                  <label>{t('integrations.form.endpoint_url')}</label>
                  <input required type="url" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder={t('integrations.endpoint_url_placeholder')} className="form-input" />
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>{t('integrations.form.description')}</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder={t('integrations.description_placeholder')} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>{t("integrations.subscribe_events")}</label>
                <div className="intg-event-groups">
                  {Object.entries(EVENT_GROUPS).map(([group, evts]) => (
                    <div key={group} className="intg-event-group">
                      <div className="intg-event-group-header" onClick={()=>toggleGroup(evts)}>
                        <span className="intg-event-group-name">{t(`integrations.${group.toLowerCase().replace(/\s/g, '_')}`)}</span>
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
                <div className="form-hint"><Lock width={12} height={12} /> {t('integrations.hmac_hint')}</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={()=>setShowModal(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?t('integrations.saving'):editId?t('integrations.update_webhook'):t('integrations.create_webhook')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryLogTab() {
  const { t } = useTranslation();
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
          <h3 className="intg-section-title">{t('integrations.delivery_log_title')}</h3>
          <p className="intg-section-sub">{t('integrations.deliveries_total', {count: total})}</p>
        </div>
        <div className="filter-row">
          <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setPage(1);}} className="form-select-sm">
            <option value="">{t('integrations.all_status')}</option>
            <option value="sent">{t("integrations.sent")}</option>
            <option value="failed">{t('integrations.failed')}</option>
          </select>
          <input value={fEvent} onChange={e=>{setFEvent(e.target.value);setPage(1);}} placeholder={t('integrations.filter_events')} className="form-input-sm" />
        </div>
      </div>
      {loading ? <div className="loading-state">{t('common.loading')}</div>
       : rows.length === 0 ? (
        <div className="empty-state">
          <DataTransferBoth width={40} height={40} className="empty-state-icon" />
          <div className="empty-state-title">{t('integrations.no_deliveries')}</div>
          <div className="empty-state-sub">{t('integrations.no_deliveries_hint')}</div>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead><tr>{[t('integrations.col.event'),t('integrations.col.endpoint'),t('integrations.col.status'),t('integrations.col.http'),t('integrations.col.duration'),t('integrations.col.attempt'),t('integrations.col.time'),''].map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
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
                    <td><span className="badge" style={{background:sb.bg,color:sb.color}}>{t(sb.labelKey)}</span></td>
                    <td className="td-secondary">{r.http_status||'—'}</td>
                    <td className="td-secondary">{r.duration_ms!=null?`${r.duration_ms}ms`:'—'}</td>
                    <td className="td-secondary">{r.attempt}</td>
                    <td className="td-secondary">{fmtTime(r.delivered_at||r.created_at)}</td>
                    <td>{r.status==='failed'&&<button className="btn-ghost-sm" disabled={retrying===r.id} onClick={()=>retry(r.id)}><RefreshDouble width={12} height={12}/>{retrying===r.id?'…':t('common.retry')}</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total>50&&(
            <div className="pagination-bar">
              <button className="btn-ghost-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t('integrations.prev')}</button>
              <span className="td-secondary">{t('integrations.page_info', {page, total: Math.ceil(total/50)})}</span>
              <button className="btn-ghost-sm" disabled={rows.length<50} onClick={()=>setPage(p=>p+1)}>{t("common.next")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function APIDocsTab() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('YOUR_API_KEY');
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    api.get('/integrations').then(res => {
      if (res.success && res.data?.length) {
        setKeys(res.data);
        const active = res.data.find(k => k.is_active);
        if (active?.api_key) setSelectedKey(active.api_key.slice(0, 22) + '…');
      }
    });
  }, []);

  const baseUrl = window.location.origin.replace(/:\d+$/, ':4001') + '/api/v1';

  const copySnippet = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const ENDPOINTS = [
    {
      method: 'GET', path: '/orders', title: t('integrations.docs.list_orders', 'List Orders'),
      desc: t('integrations.docs.list_orders_desc', 'Fetch orders with pagination and optional filters.'),
      perms: 'orders:read',
      params: 'page, limit, status, from, to, tracking_token',
      curl: `curl -s "${baseUrl}/orders?limit=10&status=pending" \\\n  -H "X-API-Key: ${selectedKey}"`,
    },
    {
      method: 'GET', path: '/orders/:id', title: t('integrations.docs.get_order', 'Get Order'),
      desc: t('integrations.docs.get_order_desc', 'Fetch a single order by ID or tracking token. Includes status history.'),
      perms: 'orders:read',
      curl: `curl -s "${baseUrl}/orders/123" \\\n  -H "X-API-Key: ${selectedKey}"`,
    },
    {
      method: 'POST', path: '/orders', title: t('integrations.docs.create_order', 'Create Order'),
      desc: t('integrations.docs.create_order_desc', 'Create a new delivery order. Required fields: recipient_name, recipient_phone, recipient_address.'),
      perms: 'orders:write',
      curl: `curl -s "${baseUrl}/orders" \\\n  -X POST \\\n  -H "X-API-Key: ${selectedKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "recipient_name": "Ahmed Ali",\n    "recipient_phone": "0501234567",\n    "recipient_address": "Downtown Dubai, Tower 1",\n    "payment_method": "cod",\n    "cod_amount": 150,\n    "delivery_fee": 25\n  }'`,
    },
    {
      method: 'PATCH', path: '/orders/:id/cancel', title: t('integrations.docs.cancel_order', 'Cancel Order'),
      desc: t('integrations.docs.cancel_order_desc', 'Cancel a pending/confirmed order. Cannot cancel orders already in transit or delivered.'),
      perms: 'orders:write',
      curl: `curl -s "${baseUrl}/orders/123/cancel" \\\n  -X PATCH \\\n  -H "X-API-Key: ${selectedKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"reason": "Customer requested cancellation"}'`,
    },
    {
      method: 'GET', path: '/tracking/:token', title: t('integrations.docs.track_order', 'Track Order'),
      desc: t('integrations.docs.track_order_desc', 'Track an order by its tracking token. Returns current status and full status history.'),
      perms: 'tracking:read',
      curl: `curl -s "${baseUrl}/tracking/TR0B64E7E75FBF" \\\n  -H "X-API-Key: ${selectedKey}"`,
    },
    {
      method: 'GET', path: '/clients', title: t('integrations.docs.list_clients', 'List Clients'),
      desc: t('integrations.docs.list_clients_desc', 'List all merchant clients. Useful for getting client_id to associate with orders.'),
      perms: 'clients:read',
      curl: `curl -s "${baseUrl}/clients" \\\n  -H "X-API-Key: ${selectedKey}"`,
    },
  ];

  const METHOD_COLORS = { GET: '#16a34a', POST: '#2563eb', PATCH: '#d97706', DELETE: '#dc2626' };

  return (
    <div className="intg-docs">
      <div className="intg-section-header">
        <div>
          <h3 className="intg-section-title">{t('integrations.docs.title', 'API Documentation')}</h3>
          <p className="intg-section-sub">{t('integrations.docs.subtitle', 'Integrate with the Trasealla API using your API keys.')}</p>
        </div>
      </div>

      {/* Auth Info */}
      <div className="data-card" style={{marginBottom: 20, padding: 20}}>
        <h4 style={{margin: '0 0 12px', fontWeight: 600}}>{t('integrations.docs.authentication', 'Authentication')}</h4>
        <p style={{margin: '0 0 12px', color: '#64748b', fontSize: 14}}>
          {t('integrations.docs.auth_desc', 'Include your API key in every request using one of these headers:')}
        </p>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16}}>
          <code className="intg-docs-code-inline">X-API-Key: td_XXXXXXXXXXXX</code>
          <span style={{color: '#94a3b8', alignSelf: 'center'}}>{t('common.or', 'or')}</span>
          <code className="intg-docs-code-inline">Authorization: Bearer td_XXXXXXXXXXXX</code>
        </div>
        <div style={{display: 'flex', gap: 16, flexWrap: 'wrap'}}>
          <div className="intg-docs-perm-card">
            <strong>read</strong>
            <span>orders:read, tracking:read</span>
          </div>
          <div className="intg-docs-perm-card">
            <strong>write</strong>
            <span>orders:read, orders:write, tracking:read</span>
          </div>
          <div className="intg-docs-perm-card">
            <strong>full</strong>
            <span>All permissions including clients &amp; webhooks</span>
          </div>
        </div>
      </div>

      {/* Base URL */}
      <div className="data-card" style={{marginBottom: 20, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div>
          <span style={{fontSize: 13, color: '#64748b'}}>{t('integrations.docs.base_url', 'Base URL')}</span>
          <code style={{display: 'block', fontSize: 15, fontWeight: 600, marginTop: 4}}>{baseUrl}</code>
        </div>
        <button className="btn-ghost-sm" onClick={() => copySnippet(baseUrl, 'base')}>
          {copiedIdx === 'base' ? <Check width={14}/> : <Copy width={14}/>}
        </button>
      </div>

      {/* Rate Limits */}
      <div className="data-card" style={{marginBottom: 20, padding: '14px 20px'}}>
        <span style={{fontSize: 13, color: '#64748b'}}>{t('integrations.docs.rate_limits', 'Rate Limits')}</span>
        <p style={{margin: '6px 0 0', fontSize: 14}}>500 {t('integrations.docs.requests_per', 'requests per')} 15 {t('integrations.docs.minutes', 'minutes')}</p>
      </div>

      {/* Endpoints */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
        {ENDPOINTS.map((ep, idx) => (
          <div key={idx} className="data-card" style={{padding: 0, overflow: 'hidden'}}>
            <div style={{padding: '16px 20px', borderBottom: '1px solid #f1f5f9'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8}}>
                <span className="intg-docs-method" style={{background: METHOD_COLORS[ep.method] + '18', color: METHOD_COLORS[ep.method]}}>{ep.method}</span>
                <code style={{fontSize: 14, fontWeight: 600}}>{ep.path}</code>
                <span className="badge badge-blue" style={{fontSize: 11, marginLeft: 'auto'}}>{ep.perms}</span>
              </div>
              <h4 style={{margin: '0 0 4px', fontWeight: 600, fontSize: 15}}>{ep.title}</h4>
              <p style={{margin: 0, color: '#64748b', fontSize: 13}}>{ep.desc}</p>
              {ep.params && <p style={{margin: '8px 0 0', fontSize: 12, color: '#94a3b8'}}>Params: {ep.params}</p>}
            </div>
            <div style={{position: 'relative', background: '#1e293b', padding: '14px 20px', borderRadius: '0 0 12px 12px'}}>
              <button className="intg-copy-btn" style={{position: 'absolute', top: 10, right: 14, background: 'rgba(255,255,255,0.1)', color: '#fff'}}
                onClick={() => copySnippet(ep.curl, idx)}>
                {copiedIdx === idx ? <Check width={13}/> : <Copy width={13}/>}
              </button>
              <pre style={{margin: 0, color: '#e2e8f0', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', paddingRight: 40}}>{ep.curl}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id:'api-keys', labelKey:'integrations.api_keys',         icon: Key },
  { id:'webhooks', labelKey:'integrations.tab_webhooks',     icon: Network },
  { id:'log',      labelKey:'integrations.tab_delivery_log', icon: DataTransferBoth },
  { id:'docs',     labelKey:'integrations.tab_api_docs',     icon: Book },
];

export default function Integrations() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('api-keys');
  return (
    <div className="page-container">
      <div className="module-hero">
        <div className="module-hero-left">
          <h2 className="module-hero-title">{t("integrations.title")}</h2>
          <p className="module-hero-sub">{t("integrations.subtitle")}</p>
        </div>
      </div>
      <div className="intg-tab-bar">
        {TABS.map(item => (
          <button key={item.id} className={`intg-tab-btn${tab===item.id?' active':''}`} onClick={()=>setTab(item.id)}>
            <item.icon width={15} height={15} /> {t(item.labelKey)}
          </button>
        ))}
      </div>
      <div className="intg-tab-body">
        {tab==='api-keys' && <APIKeysTab />}
        {tab==='webhooks' && <WebhooksTab />}
        {tab==='log'      && <DeliveryLogTab />}
        {tab==='docs'     && <APIDocsTab />}
      </div>
    </div>
  );
}
