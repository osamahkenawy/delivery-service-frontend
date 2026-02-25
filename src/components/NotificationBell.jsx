import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellNotification, Check, CheckCircle, WarningTriangle,
  Xmark, Package, DeliveryTruck, MapPin, Mail,
  Clock, User,
} from 'iconoir-react';
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

/* ── icon + color config per notification type ────────────── */
const TYPE_CONFIG = {
  info:       { Icon: Bell,            color: '#6366f1', bg: '#eef2ff' },
  success:    { Icon: CheckCircle,     color: '#16a34a', bg: '#ecfdf5' },
  warning:    { Icon: WarningTriangle, color: '#f59e0b', bg: '#fffbeb' },
  error:      { Icon: Xmark,           color: '#dc2626', bg: '#fef2f2' },
  order:      { Icon: Package,         color: '#3b82f6', bg: '#eff6ff' },
  order_update: { Icon: Package,       color: '#f97316', bg: '#fff7ed' },
  driver:     { Icon: DeliveryTruck,   color: '#8b5cf6', bg: '#f5f3ff' },
  assignment: { Icon: MapPin,          color: '#0d9488', bg: '#f0fdfa' },
  delivery:   { Icon: Mail,            color: '#ec4899', bg: '#fdf2f8' },
};

/* ── icon-name–to-Component fallback map (for backend icon field) */
const ICON_NAME_MAP = {
  clock: Clock, check: CheckCircle, user: User, package: Package,
  truck: DeliveryTruck, delivery: CheckCircle, error: Xmark,
  returned: DeliveryTruck, cancelled: Xmark, assignment: MapPin,
};

function getNotifConfig(n) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
  // If icon field is a text icon-name from backend, try to resolve
  if (n.icon && ICON_NAME_MAP[n.icon]) {
    return { ...cfg, Icon: ICON_NAME_MAP[n.icon] };
  }
  return cfg;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const dropdownRef = useRef(null);
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
    const interval = setInterval(fetchCount, 30000);
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
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setOpen(false);
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

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 1100 }}>
      {/* ── Trigger Button ───────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        title="Notifications"
        style={{
          position: 'relative', width: 42, height: 42, borderRadius: 12,
          border: '1px solid var(--border)', background: open ? 'var(--bg-hover)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}
      >
        <Bell width={20} height={20} strokeWidth={1.8} color="var(--text-secondary)" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
            borderRadius: 9, background: '#f97316', color: '#fff',
            fontSize: '.65rem', fontWeight: 800, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 5px',
            border: '2px solid var(--bg-card)',
            animation: 'bellPulse 2s infinite',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown (portal → avoids topbar stacking context) ── */}
      {open && createPortal(
        <div ref={dropdownRef} style={{
          position: 'fixed', top: 70, right: 20,
          width: 400, maxHeight: 'calc(100vh - 100px)', background: '#fff',
          border: '1px solid var(--border)', borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,.18)', zIndex: 99999,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'bellDropIn .2s ease-out',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BellNotification width={18} height={18} style={{ color: '#f97316' }} />
              <span style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--text-primary)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#f97316', color: '#fff', fontSize: '.65rem', fontWeight: 700,
                  padding: '1px 7px', borderRadius: 10, minWidth: 18, textAlign: 'center',
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                border: 'none', background: 'transparent', color: '#f97316',
                fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Check width={13} height={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
            {loading ? (
              <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                <div style={{
                  width: 28, height: 28, border: '3px solid var(--border)',
                  borderTopColor: '#f97316', borderRadius: '50%',
                  animation: 'notifSpin .8s linear infinite',
                  margin: '0 auto 10px',
                }} />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 50, textAlign: 'center' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--bg-hover), var(--border))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', color: 'var(--text-muted)',
                }}>
                  <Bell width={28} height={28} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  All caught up!
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                  No notifications yet
                </div>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = getNotifConfig(n);
                return (
                  <div key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      padding: '14px 20px', cursor: 'pointer',
                      transition: 'background .12s',
                      borderBottom: '1px solid var(--border)',
                      background: n.is_read ? 'transparent' : 'rgba(249,115,22,.03)',
                      borderLeft: n.is_read ? 'none' : '3px solid #f97316',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      position: 'relative',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = n.is_read ? 'var(--bg-hover)' : 'rgba(249,115,22,.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(249,115,22,.03)'}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: cfg.bg, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <cfg.Icon width={16} height={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{
                          fontWeight: n.is_read ? 600 : 700, fontSize: '.82rem',
                          color: 'var(--text-primary)', lineHeight: 1.3,
                        }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', background: '#f97316',
                            flexShrink: 0, animation: 'bellPulse 2s infinite',
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: '.78rem', color: 'var(--text-muted)', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {n.body}
                      </div>
                      <div style={{
                        fontSize: '.7rem', color: 'var(--text-muted)', marginTop: 5,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <Clock width={11} height={11} />
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            textAlign: 'center', background: '#fff',
          }}>
            <button onClick={() => { setOpen(false); navigate('/notifications'); }}
              style={{
                border: 'none', background: 'transparent', color: '#f97316',
                fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              View All Notifications
              <span style={{ fontSize: '.9rem' }}>&rarr;</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Inline keyframes ─────────────────────────────── */}
      <style>{`
        @keyframes bellPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes bellDropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes notifSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
