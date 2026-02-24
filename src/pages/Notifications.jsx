import { useState, useEffect, useCallback } from 'react';
import {
  BellNotification, Bell, SendDiagonal, Mail, Phone, MessageText,
  Check, CheckCircle, Xmark, WarningTriangle, Calendar, Search,
  SendMail, RefreshDouble, Archive, Package, Clock,
} from 'iconoir-react';
import api from '../lib/api';
import './Notifications.css';

/* ── Channel config with icons ────────────────────────────────── */
const CH = {
  sms:      { Icon: Phone,       label: 'SMS',      bg: '#dbeafe', color: '#1d4ed8' },
  email:    { Icon: Mail,        label: 'Email',    bg: '#fce7f3', color: '#be185d' },
  push:     { Icon: Bell,        label: 'Push',     bg: '#f3e8ff', color: '#7c3aed' },
  whatsapp: { Icon: MessageText, label: 'WhatsApp', bg: '#dcfce7', color: '#16a34a' },
};

const SB = {
  sent:      { bg: '#ecfdf5', color: '#16a34a', label: 'Sent',      Icon: CheckCircle },
  failed:    { bg: '#fee2e2', color: '#dc2626', label: 'Failed',    Icon: Xmark },
  pending:   { bg: '#f1f5f9', color: '#64748b', label: 'Pending',   Icon: Clock },
  delivered: { bg: '#dbeafe', color: '#1d4ed8', label: 'Delivered', Icon: Check },
};

export default function Notifications() {
  /* ── state ─────────────────────────────────────────────────── */
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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

  /* ── fetch all data ────────────────────────────────────────── */
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

  /* ── handlers ──────────────────────────────────────────────── */
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

  /* ── derived data ──────────────────────────────────────────── */
  const rawList = tab === 'sms' ? smsLogs : tab === 'email' ? emailLogs : notifications;
  const filtered = search
    ? rawList.filter(n =>
        (n.message || '').toLowerCase().includes(search.toLowerCase()) ||
        (n.recipient_phone || '').includes(search) ||
        (n.recipient_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (n.order_number || '').toLowerCase().includes(search.toLowerCase())
      )
    : rawList;
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  /* ── stat cards config ─────────────────────────────────────── */
  const statCards = [
    { label: 'Total Sent',  value: stats.sent || 0,         Icon: SendDiagonal,  variant: 'sent',   sub: `of ${stats.total || 0}` },
    { label: 'SMS',          value: stats.sms_count || 0,    Icon: Phone,         variant: 'sms' },
    { label: 'Email',        value: stats.email_count || 0,  Icon: Mail,          variant: 'email' },
    { label: 'Push',         value: stats.push_count || 0,   Icon: Bell,          variant: 'push' },
    { label: 'Failed',       value: stats.failed || 0,       Icon: WarningTriangle, variant: 'failed' },
    { label: 'Today',        value: stats.today || 0,        Icon: Calendar,      variant: 'today' },
  ];

  const tabs = [
    { key: 'all',       label: 'All',       Icon: BellNotification, count: notifications.length },
    { key: 'sms',       label: 'SMS',       Icon: Phone,            count: smsLogs.length },
    { key: 'email',     label: 'Email',     Icon: Mail,             count: emailLogs.length },
    { key: 'templates', label: 'Templates', Icon: Package,          count: templates.length },
  ];

  /* ── render ────────────────────────────────────────────────── */
  return (
    <div className="page-container notif-page">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="notif-header">
        <div className="notif-header-left">
          <h1>
            <BellNotification width={24} height={24} />
            Notifications
          </h1>
          <p>{stats.total || 0} total &middot; {stats.sent || 0} sent &middot; {stats.failed || 0} failed</p>
        </div>
        <div className="notif-header-actions">
          <button className="notif-btn outline" onClick={() => { setResult(null); setShowSmsTest(true); }}>
            <Phone width={14} height={14} /> SMS Test
          </button>
          <button className="notif-btn outline" onClick={() => { setResult(null); setShowEmailTest(true); }}>
            <Mail width={14} height={14} /> Email Test
          </button>
          <button className="notif-btn primary" onClick={() => { setResult(null); setError(''); setShowSend(true); }}>
            <SendDiagonal width={14} height={14} /> Send Notification
          </button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────── */}
      <div className="notif-stats">
        {statCards.map(c => (
          <div key={c.label} className="notif-stat-card">
            <div className={`notif-stat-icon ${c.variant}`}>
              <c.Icon width={22} height={22} />
            </div>
            <div className="notif-stat-info">
              <h3>{c.value}</h3>
              <p>{c.label}</p>
            </div>
            {c.sub && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', position: 'absolute', bottom: 8, right: 14 }}>{c.sub}</span>}
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="notif-tab-bar">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`notif-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => { setTab(t.key); setPage(1); setSearch(''); }}
          >
            <t.Icon width={15} height={15} />
            {t.label}
            {t.count > 0 && <span className="notif-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {loading ? (
        <div className="notif-loading">
          <div className="notif-spinner" />
          <span>Loading notifications...</span>
        </div>
      ) : tab === 'templates' ? (
        /* ── Templates Grid ──────────────────────────────── */
        <div className="notif-template-grid">
          {templates.map(tmpl => (
            <div key={tmpl.key} className="notif-template-card">
              <div className="notif-template-header">
                <div>
                  <div className="notif-template-title">{tmpl.label}</div>
                  <div className="notif-template-channels">
                    {(tmpl.channels || [tmpl.type]).map(ch => {
                      const c = CH[ch] || CH.sms;
                      return (
                        <span key={ch} className="notif-channel-badge" style={{ background: c.bg, color: c.color }}>
                          <c.Icon width={12} height={12} /> {c.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  className="notif-template-use-btn"
                  onClick={() => { setSendForm(f => ({ ...f, message: tmpl.message, channels: tmpl.channels || ['sms'] })); setShowSend(true); }}
                >
                  Use
                </button>
              </div>
              <p className="notif-template-body">{tmpl.message}</p>
            </div>
          ))}
        </div>
      ) : (
        /* ── Notification Table ──────────────────────────── */
        <>
          {/* Filter / Search bar */}
          <div className="notif-filters">
            <div className="notif-search">
              <Search width={14} height={14} className="notif-search-icon" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="notif-list">
            <div className="notif-list-header">
              <h3>
                {tab === 'sms' ? 'SMS Logs' : tab === 'email' ? 'Email Logs' : 'All Notifications'}
                {search && ` — "${search}"`}
              </h3>
              <div className="notif-list-actions">
                <button className="notif-btn ghost" onClick={() => fetchAll()}>
                  <RefreshDouble width={14} height={14} /> Refresh
                </button>
              </div>
            </div>

            <table className="notif-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="notif-empty">
                        <div className="notif-empty-icon">
                          <Bell width={36} height={36} />
                        </div>
                        <h3>No notifications yet</h3>
                        <p>
                          {tab === 'sms' ? 'No SMS logs found.' : tab === 'email' ? 'No email logs found.' : 'Notifications will appear here when sent.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map(n => {
                  const ch = CH[n.type] || CH.sms;
                  const sb = SB[n.status] || SB.pending;
                  return (
                    <tr key={n.id}>
                      <td>
                        <span className="notif-channel-badge" style={{ background: ch.bg, color: ch.color }}>
                          <ch.Icon width={12} height={12} /> {ch.label}
                        </span>
                      </td>
                      <td className="notif-recipient-cell">
                        {n.recipient_phone || n.recipient_email || '—'}
                      </td>
                      <td className="notif-msg-cell">{n.message}</td>
                      <td className="notif-order-cell">{n.order_number || '—'}</td>
                      <td>
                        <span className="notif-status-badge" style={{ background: sb.bg, color: sb.color }}>
                          <sb.Icon width={11} height={11} /> {sb.label}
                        </span>
                      </td>
                      <td className="notif-date-cell">
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
              <div className="notif-pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                {totalPages > 7 && <span className="notif-page-info">...</span>}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
            MODALS
         ═══════════════════════════════════════════════════════ */}

      {/* ── Send Notification Modal ─────────────────────────── */}
      {showSend && (
        <div className="notif-overlay" onClick={() => setShowSend(false)}>
          <div className="notif-modal" onClick={e => e.stopPropagation()}>
            <h3 className="notif-modal-title">
              <SendDiagonal width={20} height={20} /> Send Notification
            </h3>
            <p className="notif-modal-subtitle">Send via one or multiple channels</p>

            {error && (
              <div className="notif-alert error">
                <WarningTriangle width={16} height={16} /> {error}
              </div>
            )}
            {result?.success && (
              <div className="notif-alert success">
                <CheckCircle width={16} height={16} /> Notification sent successfully!
              </div>
            )}

            <form onSubmit={handleSend}>
              {/* Channels */}
              <div className="notif-form-group">
                <label className="notif-form-label">Channels</label>
                <div className="notif-channel-toggles">
                  {Object.entries(CH).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => toggleChannel(key)}
                      className="notif-channel-toggle"
                      style={{
                        border: sendForm.channels.includes(key) ? `2px solid ${val.color}` : '2px solid var(--border, #e9ecef)',
                        background: sendForm.channels.includes(key) ? val.bg : 'transparent',
                        color: sendForm.channels.includes(key) ? val.color : 'var(--text-muted)',
                      }}>
                      <val.Icon width={14} height={14} /> {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="notif-form-grid">
                {sendForm.channels.includes('sms') && (
                  <div>
                    <label className="notif-form-label">Phone (SMS)</label>
                    <input type="tel" placeholder="+971501234567" value={sendForm.phone}
                      onChange={e => setSendForm(f => ({ ...f, phone: e.target.value }))} className="notif-form-input" />
                  </div>
                )}
                {sendForm.channels.includes('email') && (
                  <div>
                    <label className="notif-form-label">Email</label>
                    <input type="email" placeholder="recipient@email.com" value={sendForm.email}
                      onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))} className="notif-form-input" />
                  </div>
                )}
                {sendForm.channels.includes('email') && (
                  <div>
                    <label className="notif-form-label">Subject</label>
                    <input value={sendForm.subject} placeholder="Notification subject"
                      onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} className="notif-form-input" />
                  </div>
                )}
                <div>
                  <label className="notif-form-label">Order ID (optional)</label>
                  <input value={sendForm.order_id} placeholder="e.g. 42"
                    onChange={e => setSendForm(f => ({ ...f, order_id: e.target.value }))} className="notif-form-input" />
                </div>
                {sendForm.channels.includes('push') && (
                  <div>
                    <label className="notif-form-label">User ID (push target)</label>
                    <input value={sendForm.user_id} placeholder="e.g. 5"
                      onChange={e => setSendForm(f => ({ ...f, user_id: e.target.value }))} className="notif-form-input" />
                  </div>
                )}
              </div>

              <div className="notif-form-group" style={{ marginTop: 14 }}>
                <label className="notif-form-label">Message *</label>
                <textarea required value={sendForm.message} rows={4} placeholder="Type your notification message..."
                  onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
                  className="notif-form-textarea" />
                <div className="notif-char-count">
                  <span>{sendForm.message.length} characters</span>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    Sending via: {sendForm.channels.map(c => { const C = CH[c]; return C ? <C.Icon key={c} width={12} height={12} style={{ color: C.color }} /> : null; })}
                  </span>
                </div>
              </div>

              <div className="notif-form-footer">
                <button type="button" onClick={() => setShowSend(false)} className="notif-btn outline">Cancel</button>
                <button type="submit" disabled={saving} className="notif-btn primary" style={{ opacity: saving ? .6 : 1 }}>
                  {saving ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SMS Test Modal ──────────────────────────────────── */}
      {showSmsTest && (
        <div className="notif-overlay" onClick={() => { setShowSmsTest(false); setResult(null); }}>
          <div className="notif-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h3 className="notif-modal-title">
              <Phone width={20} height={20} /> SMS Test
            </h3>
            <p className="notif-modal-subtitle">Send a test SMS via Twilio</p>
            {result && (
              <div className={`notif-alert ${result.success ? 'success' : 'error'}`}>
                {result.success
                  ? <><CheckCircle width={16} height={16} /> Sent! SID: {result.sid}</>
                  : <><WarningTriangle width={16} height={16} /> {result.message}</>
                }
              </div>
            )}
            <form onSubmit={handleSmsTest}>
              <div className="notif-form-group">
                <label className="notif-form-label">Phone (E.164) *</label>
                <input type="tel" required placeholder="+971501234567" value={smsForm.phone}
                  onChange={e => setSmsForm(f => ({ ...f, phone: e.target.value }))} className="notif-form-input" />
              </div>
              <div className="notif-form-group">
                <label className="notif-form-label">Message *</label>
                <textarea required rows={3} value={smsForm.message}
                  onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))} className="notif-form-textarea" />
                <div className="notif-char-count">
                  <span>{smsForm.message.length} / 160</span>
                </div>
              </div>
              <div className="notif-form-group">
                <label className="notif-form-label">Order ID (optional)</label>
                <input value={smsForm.order_id} onChange={e => setSmsForm(f => ({ ...f, order_id: e.target.value }))} className="notif-form-input" />
              </div>
              <div className="notif-form-footer">
                <button type="button" onClick={() => { setShowSmsTest(false); setResult(null); }} className="notif-btn outline">Close</button>
                <button type="submit" disabled={saving} className="notif-btn primary" style={{ opacity: saving ? .6 : 1 }}>
                  {saving ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Email Test Modal ────────────────────────────────── */}
      {showEmailTest && (
        <div className="notif-overlay" onClick={() => { setShowEmailTest(false); setResult(null); }}>
          <div className="notif-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <h3 className="notif-modal-title">
              <SendMail width={20} height={20} /> Email Test
            </h3>
            <p className="notif-modal-subtitle">Send a test email via Office 365</p>
            {result && (
              <div className={`notif-alert ${result.success ? 'success' : 'error'}`}>
                {result.success
                  ? <><CheckCircle width={16} height={16} /> Email sent! ID: {result.messageId}</>
                  : <><WarningTriangle width={16} height={16} /> {result.message}</>
                }
              </div>
            )}
            <form onSubmit={handleEmailTest}>
              <div className="notif-form-group">
                <label className="notif-form-label">To (email) *</label>
                <input type="email" required placeholder="test@example.com" value={emailForm.to}
                  onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))} className="notif-form-input" />
              </div>
              <div className="notif-form-group">
                <label className="notif-form-label">Subject</label>
                <input value={emailForm.subject} placeholder="Test Email from Trasealla"
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} className="notif-form-input" />
              </div>
              <div className="notif-form-group">
                <label className="notif-form-label">Message *</label>
                <textarea required rows={3} value={emailForm.message}
                  onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} className="notif-form-textarea" />
              </div>
              <div className="notif-form-group">
                <label className="notif-form-label">Order ID (optional)</label>
                <input value={emailForm.order_id} onChange={e => setEmailForm(f => ({ ...f, order_id: e.target.value }))} className="notif-form-input" />
              </div>
              <div className="notif-form-footer">
                <button type="button" onClick={() => { setShowEmailTest(false); setResult(null); }} className="notif-btn outline">Close</button>
                <button type="submit" disabled={saving} className="notif-btn primary" style={{ opacity: saving ? .6 : 1 }}>
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
