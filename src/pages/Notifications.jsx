import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import './CRMPages.css';

/* ── visual maps ───────────────────────────────────────────── */
const CH = { sms: { icon: '📱', label: 'SMS', bg: '#dbeafe', color: '#1d4ed8' }, email: { icon: '📧', label: 'Email', bg: '#fce7f3', color: '#be185d' }, push: { icon: '🔔', label: 'Push', bg: '#f3e8ff', color: '#7c3aed' }, whatsapp: { icon: '💬', label: 'WhatsApp', bg: '#dcfce7', color: '#16a34a' } };
const SB = { sent: { bg: '#dcfce7', color: '#16a34a', label: 'Sent' }, failed: { bg: '#fee2e2', color: '#dc2626', label: 'Failed' }, pending: { bg: '#f1f5f9', color: '#64748b', label: 'Pending' }, delivered: { bg: '#dbeafe', color: '#1d4ed8', label: 'Delivered' } };

export default function Notifications() {
  /* ── state ───────────────────────────────────────────────── */
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const PER = 25;

  /* modals */
  const [showSend, setShowSend] = useState(false);
  const [showSmsTest, setShowSmsTest] = useState(false);
  const [showEmailTest, setShowEmailTest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /* forms */
  const [sendForm, setSendForm] = useState({ channels: ['sms'], phone: '', email: '', message: '', subject: '', order_id: '', user_id: '' });
  const [smsForm, setSmsForm] = useState({ phone: '', message: '', order_id: '' });
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '', order_id: '' });

  /* ── fetch all data ──────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [nRes, tRes, sRes, eRes, stRes] = await Promise.all([
      api.get('/notifications'),
      api.get('/notifications/templates'),
      api.get('/notifications/sms-logs'),
      api.get('/notifications/email-logs'),
      api.get('/notifications/stats'),
    ]);
    if (nRes.success) setNotifications(nRes.data || []);
    if (tRes.success) setTemplates(tRes.data || []);
    if (sRes.success) setSmsLogs(sRes.data || []);
    if (eRes.success) setEmailLogs(eRes.data || []);
    if (stRes.success) setStats(stRes.data || {});
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── handlers ────────────────────────────────────────────── */
  const handleSend = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setResult(null);
    const res = await api.post('/notifications/send', sendForm);
    if (res.success) {
      setResult(res);
      setSendForm({ channels: ['sms'], phone: '', email: '', message: '', subject: '', order_id: '', user_id: '' });
      fetchAll();
    } else { setError(res.message || 'Failed'); }
    setSaving(false);
  };
  const handleSmsTest = async (e) => {
    e.preventDefault(); setSaving(true); setResult(null);
    const res = await api.post('/notifications/sms-test', smsForm);
    setResult(res); if (res.success) fetchAll();
    setSaving(false);
  };
  const handleEmailTest = async (e) => {
    e.preventDefault(); setSaving(true); setResult(null);
    const res = await api.post('/notifications/email-test', emailForm);
    setResult(res); if (res.success) fetchAll();
    setSaving(false);
  };

  const toggleChannel = (ch) => {
    setSendForm(f => {
      const arr = f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch];
      return { ...f, channels: arr.length ? arr : ['sms'] };
    });
  };

  /* ── derived data ────────────────────────────────────────── */
  const listData = tab === 'sms' ? smsLogs : tab === 'email' ? emailLogs : notifications;
  const paged = listData.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(listData.length / PER);

  /* ── shared styles ───────────────────────────────────────── */
  const css = {
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' },
    field: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '.875rem', boxSizing: 'border-box' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: 'var(--bg-card)', borderRadius: 18, padding: '28px 32px', width: '100%', maxWidth: 520, border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' },
    btnPrimary: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' },
    btnBlue: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' },
    btnOutline: { padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '.875rem' },
    label: { display: 'block', fontSize: '.78rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', background: 'var(--bg-hover)', whiteSpace: 'nowrap' },
    td: { padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  };

  /* ── stat cards ──────────────────────────────────────────── */
  const statCards = [
    { label: 'Total Sent', value: stats.sent || 0, icon: '📤', color: '#16a34a', sub: `of ${stats.total || 0}` },
    { label: 'SMS', value: stats.sms_count || 0, icon: '📱', color: '#1d4ed8' },
    { label: 'Email', value: stats.email_count || 0, icon: '📧', color: '#be185d' },
    { label: 'Push', value: stats.push_count || 0, icon: '🔔', color: '#7c3aed' },
    { label: 'Failed', value: stats.failed || 0, icon: '❌', color: '#dc2626' },
    { label: 'Today', value: stats.today || 0, icon: '📅', color: '#f97316' },
  ];

  const tabs = [
    { key: 'all', label: 'All Notifications', count: notifications.length },
    { key: 'sms', label: 'SMS Logs', count: smsLogs.length },
    { key: 'email', label: 'Email Logs', count: emailLogs.length },
    { key: 'templates', label: 'Templates', count: templates.length },
  ];

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="page-container">
      {/* ── Header ────────────────────────────────────── */}
      <div className="page-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h2 className="page-heading">Notifications</h2>
          <p className="page-subheading" style={{ margin: 0 }}>
            {stats.total || 0} total &middot; {stats.sent || 0} sent &middot; {stats.failed || 0} failed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={css.btnOutline} onClick={() => { setResult(null); setShowSmsTest(true); }}>📱 SMS Test</button>
          <button style={css.btnOutline} onClick={() => { setResult(null); setShowEmailTest(true); }}>📧 Email Test</button>
          <button style={css.btnPrimary} onClick={() => { setResult(null); setError(''); setShowSend(true); }}>+ Send Notification</button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} style={css.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.5rem' }}>{c.icon}</span>
              <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{c.label}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700,
              borderBottom: tab === t.key ? '3px solid #f97316' : '3px solid transparent',
              background: 'transparent', color: tab === t.key ? '#f97316' : 'var(--text-muted)',
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}>
            {t.label} <span style={{ fontSize: '.72rem', opacity: .7 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading notifications...</div>
      ) : tab === 'templates' ? (
        /* ── Templates Grid ──────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {templates.map(tmpl => (
            <div key={tmpl.key} style={css.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 6 }}>{tmpl.label}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {(tmpl.channels || [tmpl.type]).map(ch => {
                      const c = CH[ch] || CH.sms;
                      return <span key={ch} style={{ padding: '2px 10px', borderRadius: 6, fontSize: '.7rem', fontWeight: 700, background: c.bg, color: c.color }}>{c.icon} {c.label}</span>;
                    })}
                  </div>
                </div>
                <button onClick={() => { setSendForm(f => ({ ...f, message: tmpl.message, channels: tmpl.channels || ['sms'] })); setShowSend(true); }}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #f97316', background: 'transparent', color: '#f97316', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Use
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{tmpl.message}</p>
            </div>
          ))}
        </div>
      ) : (
        /* ── Notification Table ──────────────────────── */
        <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
            <thead>
              <tr>
                <th style={css.th}>Channel</th>
                <th style={css.th}>Recipient</th>
                <th style={css.th}>Message</th>
                <th style={css.th}>Order</th>
                <th style={css.th}>Status</th>
                <th style={css.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                  No {tab === 'sms' ? 'SMS' : tab === 'email' ? 'email' : ''} notifications yet
                </td></tr>
              ) : paged.map(n => {
                const ch = CH[n.type] || CH.sms;
                const sb = SB[n.status] || SB.pending;
                return (
                  <tr key={n.id} style={{ transition: 'background .1s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={css.td}>
                      <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: '.72rem', fontWeight: 700, background: ch.bg, color: ch.color, whiteSpace: 'nowrap' }}>
                        {ch.icon} {ch.label}
                      </span>
                    </td>
                    <td style={css.td}>
                      <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{n.recipient_phone || n.recipient_email || '—'}</div>
                    </td>
                    <td style={{ ...css.td, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '.8rem' }}>
                      {n.message}
                    </td>
                    <td style={{ ...css.td, fontSize: '.82rem', fontWeight: 600 }}>{n.order_number || '—'}</td>
                    <td style={css.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: '.7rem', fontWeight: 700, background: sb.bg, color: sb.color }}>{sb.label}</span>
                    </td>
                    <td style={{ ...css.td, fontSize: '.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: 14, display: 'flex', justifyContent: 'center', gap: 6, borderTop: '1px solid var(--border)', background: 'var(--bg-hover)' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ ...css.btnOutline, padding: '6px 12px', fontSize: '.78rem', opacity: page === 1 ? .4 : 1 }}>← Prev</button>
              <span style={{ padding: '6px 14px', fontSize: '.82rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ ...css.btnOutline, padding: '6px 12px', fontSize: '.78rem', opacity: page === totalPages ? .4 : 1 }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
            MODALS
         ═══════════════════════════════════════════════════════ */}

      {/* ── Send Notification Modal ─────────────────────── */}
      {showSend && (
        <div style={css.overlay} onClick={() => setShowSend(false)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800 }}>📤 Send Notification</h3>
            <p style={{ margin: '0 0 20px', fontSize: '.8rem', color: 'var(--text-muted)' }}>Send via one or multiple channels</p>

            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '.85rem' }}>{error}</div>}
            {result?.success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '.85rem' }}>✅ Notification sent successfully!</div>}

            <form onSubmit={handleSend}>
              {/* Channels */}
              <div style={{ marginBottom: 18 }}>
                <label style={css.label}>Channels</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(CH).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => toggleChannel(key)}
                      style={{
                        padding: '8px 16px', borderRadius: 10, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
                        border: sendForm.channels.includes(key) ? `2px solid ${val.color}` : '2px solid var(--border)',
                        background: sendForm.channels.includes(key) ? val.bg : 'transparent',
                        color: sendForm.channels.includes(key) ? val.color : 'var(--text-muted)',
                      }}>
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {sendForm.channels.includes('sms') && (
                  <div>
                    <label style={css.label}>Phone (SMS)</label>
                    <input type="tel" placeholder="+971501234567" value={sendForm.phone}
                      onChange={e => setSendForm(f => ({ ...f, phone: e.target.value }))} style={css.field} />
                  </div>
                )}
                {sendForm.channels.includes('email') && (
                  <div>
                    <label style={css.label}>Email</label>
                    <input type="email" placeholder="recipient@email.com" value={sendForm.email}
                      onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))} style={css.field} />
                  </div>
                )}
                {sendForm.channels.includes('email') && (
                  <div>
                    <label style={css.label}>Subject</label>
                    <input value={sendForm.subject} placeholder="Notification subject"
                      onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} style={css.field} />
                  </div>
                )}
                <div>
                  <label style={css.label}>Order ID (optional)</label>
                  <input value={sendForm.order_id} placeholder="e.g. 42"
                    onChange={e => setSendForm(f => ({ ...f, order_id: e.target.value }))} style={css.field} />
                </div>
                {sendForm.channels.includes('push') && (
                  <div>
                    <label style={css.label}>User ID (push target)</label>
                    <input value={sendForm.user_id} placeholder="e.g. 5"
                      onChange={e => setSendForm(f => ({ ...f, user_id: e.target.value }))} style={css.field} />
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={css.label}>Message *</label>
                <textarea required value={sendForm.message} rows={4} placeholder="Type your notification message..."
                  onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
                  style={{ ...css.field, resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '.72rem', color: 'var(--text-muted)' }}>
                  <span>{sendForm.message.length} characters</span>
                  <span>Sending via: {sendForm.channels.map(c => CH[c]?.icon).join(' ')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSend(false)} style={css.btnOutline}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...css.btnPrimary, opacity: saving ? .6 : 1 }}>
                  {saving ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SMS Test Modal ──────────────────────────────── */}
      {showSmsTest && (
        <div style={css.overlay} onClick={() => { setShowSmsTest(false); setResult(null); }}>
          <div style={{ ...css.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800 }}>📱 SMS Test</h3>
            <p style={{ margin: '0 0 18px', fontSize: '.8rem', color: 'var(--text-muted)' }}>Send a test SMS via Twilio</p>
            {result && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '.85rem', background: result.success ? '#dcfce7' : '#fee2e2', color: result.success ? '#16a34a' : '#dc2626' }}>
                {result.success ? `✅ Sent! SID: ${result.sid}` : `❌ ${result.message}`}
              </div>
            )}
            <form onSubmit={handleSmsTest}>
              <div style={{ marginBottom: 14 }}>
                <label style={css.label}>Phone (E.164) *</label>
                <input type="tel" required placeholder="+971501234567" value={smsForm.phone}
                  onChange={e => setSmsForm(f => ({ ...f, phone: e.target.value }))} style={css.field} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={css.label}>Message *</label>
                <textarea required rows={3} value={smsForm.message}
                  onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))}
                  style={{ ...css.field, resize: 'vertical' }} />
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{smsForm.message.length} / 160</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={css.label}>Order ID (optional)</label>
                <input value={smsForm.order_id} onChange={e => setSmsForm(f => ({ ...f, order_id: e.target.value }))} style={css.field} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowSmsTest(false); setResult(null); }} style={css.btnOutline}>Close</button>
                <button type="submit" disabled={saving} style={{ ...css.btnBlue, opacity: saving ? .6 : 1 }}>
                  {saving ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Email Test Modal ────────────────────────────── */}
      {showEmailTest && (
        <div style={css.overlay} onClick={() => { setShowEmailTest(false); setResult(null); }}>
          <div style={{ ...css.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800 }}>📧 Email Test</h3>
            <p style={{ margin: '0 0 18px', fontSize: '.8rem', color: 'var(--text-muted)' }}>Send a test email via Office 365</p>
            {result && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '.85rem', background: result.success ? '#dcfce7' : '#fee2e2', color: result.success ? '#16a34a' : '#dc2626' }}>
                {result.success ? `✅ Email sent! ID: ${result.messageId}` : `❌ ${result.message}`}
              </div>
            )}
            <form onSubmit={handleEmailTest}>
              <div style={{ marginBottom: 14 }}>
                <label style={css.label}>To (email) *</label>
                <input type="email" required placeholder="test@example.com" value={emailForm.to}
                  onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} style={css.field} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={css.label}>Subject</label>
                <input value={emailForm.subject} placeholder="Test Email from Trasealla"
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} style={css.field} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={css.label}>Message *</label>
                <textarea required rows={3} value={emailForm.message}
                  onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                  style={{ ...css.field, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={css.label}>Order ID (optional)</label>
                <input value={emailForm.order_id} onChange={e => setEmailForm(f => ({ ...f, order_id: e.target.value }))} style={css.field} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowEmailTest(false); setResult(null); }} style={css.btnOutline}>Close</button>
                <button type="submit" disabled={saving} style={{ ...css.btnBlue, opacity: saving ? .6 : 1 }}>
                  {saving ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
