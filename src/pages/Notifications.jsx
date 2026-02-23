import { useState, useEffect } from 'react';
import api from '../lib/api';
import './CRMPages.css';

const CHANNEL_ICONS = { sms: '📱', email: '📧', push: '🔔', whatsapp: '💬' };
const STATUS_BADGE = {
  sent:    { bg: '#dcfce7', color: '#16a34a' },
  failed:  { bg: '#fee2e2', color: '#dc2626' },
  pending: { bg: '#f1f5f9', color: '#64748b' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [smsLogs,       setSmsLogs]       = useState([]);
  const [templates,     setTemplates]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('log');
  const [showSend,      setShowSend]      = useState(false);
  const [showSmsTest,   setShowSmsTest]   = useState(false);
  const [form,          setForm]          = useState({ template: '', recipient_type: 'driver', recipient_id: '', channel: 'sms', message: '', order_id: '' });
  const [smsTestForm,   setSmsTestForm]   = useState({ phone: '', message: '', order_id: '' });
  const [saving,        setSaving]        = useState(false);
  const [smsResult,     setSmsResult]     = useState(null);
  const [error,         setError]         = useState('');
  const [page,          setPage]          = useState(1);
  const PER_PAGE = 20;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [nRes, tRes, sRes] = await Promise.all([
      api.get('/notifications'),
      api.get('/notifications/templates'),
      api.get('/notifications/sms-logs'),
    ]);
    if (nRes.success) setNotifications(nRes.data || []);
    if (tRes.success) setTemplates(tRes.data || []);
    if (sRes.success) setSmsLogs(sRes.data || []);
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const res = await api.post('/notifications/send', form);
    if (res.success) {
      setShowSend(false);
      setForm({ template: '', recipient_type: 'driver', recipient_id: '', channel: 'sms', message: '', order_id: '' });
      fetchAll();
    } else { setError(res.message || 'Failed to send'); }
    setSaving(false);
  };

  const handleSmsTest = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSmsResult(null);
    const res = await api.post('/notifications/sms-test', smsTestForm);
    setSmsResult(res);
    if (res.success) { fetchAll(); }
    setSaving(false);
  };

  const applyTemplate = (tmpl) => {
    setForm(f => ({ ...f, template: tmpl.key, message: tmpl.message || '' }));
  };

  const paged = notifications.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(notifications.length / PER_PAGE);

  const fieldStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '.875rem', boxSizing: 'border-box' };
  const modalStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const boxStyle   = { background: 'var(--bg-card)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480, border: '1px solid var(--border)' };

  return (
    <div className="page-container">
      <div className="page-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-heading">Notifications</h2>
          <p className="page-subheading">{notifications.length} total &middot; {smsLogs.length} SMS sent</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline-action" onClick={() => { setSmsResult(null); setShowSmsTest(true); }}>
            📱 SMS Test
          </button>
          <button style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' }}
            onClick={() => setShowSend(true)}>+ Send Notification</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Sent', value: notifications.filter(n => n.status === 'sent').length, icon: '📤', color: '#16a34a' },
          { label: 'SMS Sent',   value: smsLogs.filter(n => n.status === 'sent').length,        icon: '📱', color: '#1d4ed8' },
          { label: 'Failed',     value: notifications.filter(n => n.status === 'failed').length, icon: '❌', color: '#dc2626' },
          { label: 'Today', value: notifications.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length, icon: '📅', color: '#f97316' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="od-tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'log',       label: 'All Notifications (' + notifications.length + ')' },
          { key: 'sms',       label: 'SMS Log (' + smsLogs.length + ')' },
          { key: 'templates', label: 'Templates (' + templates.length + ')' },
        ].map(t => (
          <button key={t.key} className={'od-tab' + (activeTab === t.key ? ' active' : '')}
            onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="od-loading">Loading notifications...</div>
      ) : (
        <>
          {activeTab === 'log' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Ch.', 'Recipient', 'Message', 'Order', 'Status', 'Sent At'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No notifications yet</td></tr>
                  ) : paged.map(n => {
                    const badge = STATUS_BADGE[n.status] || STATUS_BADGE.pending;
                    return (
                      <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontSize: '1.2rem' }}>{CHANNEL_ICONS[n.type] || '🔔'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 500 }}>{n.recipient_phone || n.recipient_email || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{n.message}</td>
                        <td style={{ padding: '10px 14px', fontSize: '.8rem' }}>{n.order_number || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{n.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(n.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', gap: 6, borderTop: '1px solid var(--border)' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: p === page ? '#f97316' : 'var(--bg-card)', color: p === page ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '.8rem' }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sms' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)' }}>
                    {['Phone', 'Message', 'Order', 'Status', 'Sent At'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {smsLogs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No SMS sent yet. Use the SMS Test button.</td></tr>
                  ) : smsLogs.map(n => {
                    const badge = STATUS_BADGE[n.status] || STATUS_BADGE.pending;
                    return (
                      <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{n.recipient_phone}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{n.message}</td>
                        <td style={{ padding: '10px 14px', fontSize: '.8rem' }}>{n.order_number || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, background: badge.bg, color: badge.color }}>{n.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(n.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 14 }}>
              {templates.map(tmpl => (
                <div key={tmpl.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 4 }}>{tmpl.label}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8' }}>{CHANNEL_ICONS[tmpl.type]} {tmpl.type}</span>
                    </div>
                    <button onClick={() => { applyTemplate(tmpl); setShowSend(true); }}
                      style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #f97316', background: 'transparent', color: '#f97316', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      Use
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tmpl.message}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showSmsTest && (
        <div style={modalStyle}>
          <div style={{ ...boxStyle, maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>📱 SMS Test</h3>
            <p style={{ margin: '0 0 20px', fontSize: '.8rem', color: 'var(--text-muted)' }}>Requires TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM in .env</p>
            {smsResult && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem',
                background: smsResult.success ? '#dcfce7' : '#fee2e2',
                color: smsResult.success ? '#16a34a' : '#dc2626' }}>
                {smsResult.success ? ('Sent! SID: ' + smsResult.sid) : ('Error: ' + smsResult.message)}
              </div>
            )}
            <form onSubmit={handleSmsTest}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Phone (E.164) *</label>
                <input type="tel" required placeholder="+971501234567" value={smsTestForm.phone}
                  onChange={e => setSmsTestForm(p => ({ ...p, phone: e.target.value }))} style={fieldStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Message *</label>
                <textarea required rows={3} value={smsTestForm.message}
                  onChange={e => setSmsTestForm(p => ({ ...p, message: e.target.value }))}
                  style={{ ...fieldStyle, resize: 'vertical' }} />
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{smsTestForm.message.length} / 160</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Order ID (optional)</label>
                <input type="text" value={smsTestForm.order_id}
                  onChange={e => setSmsTestForm(p => ({ ...p, order_id: e.target.value }))} style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowSmsTest(false); setSmsResult(null); }} className="btn-outline-action">Close</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' }}>
                  {saving ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSend && (
        <div style={modalStyle}>
          <div style={boxStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>Send Notification</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '.85rem' }}>{error}</div>}
            <form onSubmit={handleSend}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Channel</label>
                  <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={fieldStyle}>
                    {Object.keys(CHANNEL_ICONS).map(c => <option key={c} value={c}>{CHANNEL_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Recipient Type</label>
                  <select value={form.recipient_type} onChange={e => setForm(f => ({ ...f, recipient_type: e.target.value }))} style={fieldStyle}>
                    {['driver', 'client', 'user'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Phone / Email</label>
                  <input value={form.recipient_id} onChange={e => setForm(f => ({ ...f, recipient_id: e.target.value }))} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Order ID (optional)</label>
                  <input value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} style={fieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, marginBottom: 6 }}>Message *</label>
                  <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
                    style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSend(false)} className="btn-outline-action">Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
