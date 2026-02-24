import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'iconoir-react';
import api from '../lib/api';
import { getSocket } from '../lib/socketClient';

/* ── helpers ──────────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_ICON = {
  info: '🔔', success: '✅', warning: '⚠️', error: '❌',
  order: '📦', driver: '🚚', assignment: '🗺️', delivery: '📬',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  /* ── fetch unread count ──────────────────────────────────── */
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/user-notifications/unread-count');
      if (res.success) setUnreadCount(res.count || 0);
    } catch { /* silent */ }
  }, []);

  /* ── fetch notifications list ────────────────────────────── */
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/user-notifications?limit=20');
      if (res.success) setNotifications(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  /* ── initial load + polling ──────────────────────────────── */
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // every 30s
    return () => clearInterval(interval);
  }, [fetchCount]);

  /* ── socket.io real-time ─────────────────────────────────── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
    if (!user?.id) return;

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('join-user', user.id);
    } else {
      socket.once('connect', () => socket.emit('join-user', user.id));
    }

    const handler = (notification) => {
      setUnreadCount(c => c + 1);
      setNotifications(prev => [notification, ...prev].slice(0, 20));
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, []);

  /* ── click outside to close ──────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── when opened, fetch list ─────────────────────────────── */
  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  /* ── mark single as read ─────────────────────────────────── */
  const markRead = async (id) => {
    await api.post(`/user-notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  /* ── mark all as read ────────────────────────────────────── */
  const markAllRead = async () => {
    await api.post('/user-notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  /* ── click notification ──────────────────────────────────── */
  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
    else if (n.order_id) navigate(`/orders?highlight=${n.order_id}`);
  };

  /* ── styles ──────────────────────────────────────────────── */
  const s = {
    wrapper: { position: 'relative' },
    btn: {
      position: 'relative', width: 42, height: 42, borderRadius: 12,
      border: '1px solid var(--border)', background: open ? 'var(--bg-hover)' : 'transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s',
    },
    badge: {
      position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
      borderRadius: 9, background: '#dc2626', color: '#fff',
      fontSize: '.65rem', fontWeight: 800, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 5px',
      border: '2px solid var(--bg-card)',
    },
    dropdown: {
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 380, maxHeight: 480, background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,.18)', zIndex: 999,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    header: {
      padding: '14px 18px', borderBottom: '1px solid var(--border)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    list: { flex: 1, overflowY: 'auto', maxHeight: 360 },
    item: (read) => ({
      padding: '12px 18px', cursor: 'pointer', transition: 'background .1s',
      borderBottom: '1px solid var(--border)',
      background: read ? 'transparent' : 'rgba(249,115,22,.04)',
    }),
    footer: {
      padding: '10px 18px', borderTop: '1px solid var(--border)',
      textAlign: 'center',
    },
  };

  return (
    <div ref={ref} style={s.wrapper}>
      <button style={s.btn} onClick={() => setOpen(!open)} title="Notifications">
        <Bell width={20} height={20} strokeWidth={1.8} color="var(--text-secondary)" />
        {unreadCount > 0 && (
          <span style={s.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={s.dropdown}>
          {/* Header */}
          <div style={s.header}>
            <span style={{ fontWeight: 800, fontSize: '.95rem' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{
                  border: 'none', background: 'transparent', color: '#f97316',
                  fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
                }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={s.list}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 50, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔔</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={s.item(n.is_read)}
                  onClick={() => handleClick(n)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(249,115,22,.04)'}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                      {n.icon || TYPE_ICON[n.type] || '🔔'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: n.is_read ? 600 : 800, fontSize: '.82rem', color: 'var(--text-primary)' }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 4, opacity: .7 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <button onClick={() => { setOpen(false); navigate('/notifications'); }}
              style={{
                border: 'none', background: 'transparent', color: '#f97316',
                fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
              }}>
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
