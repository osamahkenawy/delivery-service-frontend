/**
 * Shared Toast notification component + hook.
 *
 * Usage:
 *   import Toast, { useToast } from '../components/Toast';
 *
 *   const { toasts, showToast } = useToast();
 *   // ...
 *   showToast('Order saved!');                // success (default)
 *   showToast('Something went wrong', 'error');
 *   showToast('Heads up', 'warning');
 *   // ...
 *   return <> ... <Toast toasts={toasts} /> </>;
 */
import React, { useState, useCallback } from 'react';
import { CheckCircle, WarningTriangle } from 'iconoir-react';

/* ── Component ────────────────────────────────────────────────── */
export default function Toast({ toasts = [] }) {
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '13px 18px', borderRadius: 12, fontWeight: 600,
            fontSize: 14, minWidth: 260, maxWidth: 380,
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            background:
              t.type === 'success' ? '#16a34a'
              : t.type === 'error'  ? '#dc2626'
              : '#f97316',          /* warning / default */
            color: '#fff',
            animation: 'toastSlideIn 0.3s ease',
          }}
        >
          {t.type === 'success'
            ? <CheckCircle width={18} height={18} />
            : <WarningTriangle width={18} height={18} />}
          {t.msg}
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
}

/* ── Hook ─────────────────────────────────────────────────────── */
/**
 * useToast()
 * Returns { toasts, showToast }.
 *
 * showToast(msg, type = 'success')
 *   msg  — string message to display
 *   type — 'success' | 'error' | 'warning'
 */
export function useToast(duration = 3500) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, [duration]);

  return { toasts, showToast };
}
