import { useState, useEffect } from 'react';
import api from '../lib/api';

const CHANNEL_ICONS = { sms: '📱', email: '📧', push: '🔔', whatsapp: '💬' };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ template: '', recipient_type: 'driver', recipient_id: '', channel: 'sms', message: '', order_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    Promise.all([
      api.get('/notifications').then(r => r.success && setNotifications(r.data || [])),
      api.get('/notifications/templates').then(r => r.success && setTemplates(r.data || [])),
    ]).then(() => setLoading(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await api.post('/notifications/send', form);
    if (res.success) {
      setShowSend(false);
      setForm({ template: '', recipient_type: 'driver', recipient_id: '', channel: 'sms', message: '', order_id: '' });
      api.get('/notifications').then(r => r.success && setNotifications(r.data || []));
    } else {
      setError(res.message || 'Failed to send');
    }
    setSaving(false);
  };

  const applyTemplate = (tmpl) => {
    setForm(f => ({ ...f, template: tmpl.key, message: tmpl.template || '' }));
  };

  const paged = notifications.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const total = Math.ceil(notifications.length / PER_PAGE);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Notifications</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{notifications.length} total notifications sent</p>
        </div>
        <button onClick={() => setShowSend(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Send Notification
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Notification log */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Channel', 'Recipient', 'Message', 'Status', 'Sent At'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No notifications yet</td></tr>
                  ) : paged.map(n => (
                    <tr key={n.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontSize: 18 }}>{CHANNEL_ICONS[n.channel] || '🔔'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>
                        <div style={{ fontWeight: 500 }}>{n.recipient_name || n.recipient_id}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{n.recipient_type}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: n.status === 'sent' ? '#dcfce7' : n.status === 'failed' ? '#fee2e2' : '#f1f5f9', color: n.status === 'sent' ? '#16a34a' : n.status === 'failed' ? '#dc2626' : '#64748b' }}>
                          {n.status || 'sent'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{new Date(n.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > 1 && (
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid #f1f5f9' }}>
                  {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e2e8f0', background: p === page ? '#f97316' : '#fff', color: p === page ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13 }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Notification Templates</h3>
            {templates.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No templates available</div>
            ) : templates.map(tmpl => (
              <div key={tmpl.key} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0' }}
                onClick={() => { applyTemplate(tmpl); setShowSend(true); }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{tmpl.label || tmpl.key}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{tmpl.template?.substring(0, 80)}...</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Send Notification</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSend}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Channel</label>
                  <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {Object.keys(CHANNEL_ICONS).map(c => <option key={c} value={c}>{CHANNEL_ICONS[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Recipient Type</label>
                  <select value={form.recipient_type} onChange={e => setForm(f => ({ ...f, recipient_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {['driver', 'client', 'user'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Recipient ID</label>
                  <input value={form.recipient_id} onChange={e => setForm(f => ({ ...f, recipient_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Order ID (optional)</label>
                  <input value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Message *</label>
                  <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSend(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
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
