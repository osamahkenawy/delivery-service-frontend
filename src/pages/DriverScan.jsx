import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import api from '../lib/api';
import './CRMPages.css';

/* ── Status transition rules ─────────────────────────────────────── */
const VALID_NEXT = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['picked_up', 'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit', 'failed', 'returned'],
  in_transit: ['delivered', 'failed', 'returned'],
  delivered:  [],
  failed:     ['returned', 'confirmed'],
  returned:   [],
  cancelled:  [],
};

const STATUS_META = {
  pending:    { emoji: '🕐', color: '#f59e0b', label: 'Pending'     },
  confirmed:  { emoji: '✅', color: '#10b981', label: 'Confirmed'   },
  assigned:   { emoji: '👤', color: '#6366f1', label: 'Assigned'    },
  picked_up:  { emoji: '📦', color: '#3b82f6', label: 'Picked Up'   },
  in_transit: { emoji: '🚗', color: '#f97316', label: 'In Transit'  },
  delivered:  { emoji: '🎉', color: '#16a34a', label: 'Delivered'   },
  failed:     { emoji: '❌', color: '#dc2626', label: 'Failed'      },
  returned:   { emoji: '↩️', color: '#8b5cf6', label: 'Returned'   },
  cancelled:  { emoji: '🚫', color: '#94a3b8', label: 'Cancelled'   },
};

const STATUS_FLOW_LABELS = {
  confirmed:  { label: '✅ Confirm', scan_type: 'warehouse_in',  bg: '#10b981' },
  picked_up:  { label: '📦 Mark Picked Up', scan_type: 'pickup_scan',  bg: '#3b82f6' },
  in_transit: { label: '🚗 Out for Delivery', scan_type: 'driver_scan', bg: '#f97316' },
  delivered:  { label: '🎉 Mark Delivered', scan_type: 'delivery_scan', bg: '#16a34a' },
  failed:     { label: '❌ Delivery Failed', scan_type: 'driver_scan',  bg: '#dc2626' },
  returned:   { label: '↩️ Return to Hub', scan_type: 'warehouse_in',  bg: '#8b5cf6' },
  cancelled:  { label: '🚫 Cancel', scan_type: 'driver_scan',           bg: '#94a3b8' },
};

function getGPS() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

/* ─────────────────── Order Card ──────────────────────────────────── */
function OrderCard({ order, onStatusUpdate, onScan, loading }) {
  const [statusNote, setStatusNote] = useState('');
  const [codAmt, setCodAmt]         = useState(order.cod_amount || '');
  const [updating, setUpdating]     = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const nextStatuses = VALID_NEXT[order.status] || [];
  const meta = STATUS_META[order.status] || {};

  const doStatusUpdate = async (newStatus) => {
    setUpdating(true);
    const gps = await getGPS();
    const payload = { statusNote, gps };
    // Send COD collected amount when delivering a COD order
    if (newStatus === 'delivered' && order.payment_method === 'cod' && codAmt) {
      payload.cod_collected_amount = parseFloat(codAmt);
    }
    const result = await onStatusUpdate(order.tracking_token, newStatus, statusNote, gps, payload.cod_collected_amount);
    if (result?.success) {
      setScanResult({ ok: true, msg: `✅ Marked as ${STATUS_META[newStatus]?.label || newStatus}` });
    } else {
      setScanResult({ ok: false, msg: result?.message || 'Update failed' });
    }
    setUpdating(false);
  };

  const doScan = async (scanType) => {
    setUpdating(true);
    const gps = await getGPS();
    const result = await onScan(order.tracking_token, scanType, gps);
    if (result?.success) {
      setScanResult({ ok: true, msg: result.message || '📷 Scan logged' });
    } else {
      setScanResult({ ok: false, msg: result?.message || 'Scan failed' });
    }
    setUpdating(false);
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Order Header */}
      <div style={{ background: meta.color || '#64748b', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem' }}>{order.order_number}</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '.85rem', marginTop: 2 }}>
            {meta.emoji} {meta.label}
            {order.payment_method === 'cod' && <span style={{ marginLeft: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 8px', borderRadius: 10, fontSize: '.75rem', fontWeight: 700 }}>💵 COD AED {order.cod_amount}</span>}
          </div>
        </div>
        <div style={{ fontSize: '2.5rem' }}>{meta.emoji}</div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {/* Recipient */}
        <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Recipient</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{order.recipient_name}</div>
          {order.recipient_phone && (
            <a href={`tel:${order.recipient_phone}`} style={{ color: '#f97316', fontWeight: 600, fontSize: '.9rem', textDecoration: 'none', display: 'block', marginTop: 4 }}>
              📞 {order.recipient_phone}
            </a>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 6, lineHeight: 1.4 }}>
            📍 {order.recipient_address}{order.recipient_area ? `, ${order.recipient_area}` : ''}{order.recipient_emirate ? ` — ${order.recipient_emirate}` : ''}
          </div>
        </div>

        {/* Open in Maps */}
        {(order.recipient_lat && order.recipient_lng) ? (
          <a href={`https://maps.google.com/?q=${order.recipient_lat},${order.recipient_lng}`} target="_blank" rel="noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '.85rem', textDecoration: 'none', marginBottom: 14 }}>
            🗺️ Open in Google Maps
          </a>
        ) : order.recipient_address ? (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(order.recipient_address + ' ' + (order.recipient_emirate || 'Dubai'))}`} target="_blank" rel="noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '.85rem', textDecoration: 'none', marginBottom: 14 }}>
            🗺️ Search Address in Maps
          </a>
        ) : null}

        {/* COD Collection */}
        {order.payment_method === 'cod' && order.status === 'in_transit' && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>💵 COD Amount to Collect</div>
            <input type="number" step="0.01" value={codAmt} onChange={e => setCodAmt(e.target.value)}
              placeholder="Enter collected amount"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #fcd34d', fontSize: '1.1rem', fontWeight: 700, color: '#92400e', background: '#fffbeb', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '.75rem', color: '#92400e', marginTop: 4 }}>Confirm amount before marking delivered</div>
          </div>
        )}

        {/* Note */}
        <div style={{ marginBottom: 14 }}>
          <textarea rows={2} placeholder="Optional note (e.g. left at reception, no answer)..." value={statusNote}
            onChange={e => setStatusNote(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '.875rem', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Quick Scan Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {['warehouse_in', 'warehouse_out'].map(st => (
            <button key={st} onClick={() => doScan(st)} disabled={updating}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {st === 'warehouse_in' ? '🏭 Hub In' : '🏭 Hub Out'}
            </button>
          ))}
        </div>

        {/* Status Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nextStatuses.filter(s => STATUS_FLOW_LABELS[s]).map(s => {
            const flow = STATUS_FLOW_LABELS[s];
            return (
              <button key={s} onClick={() => doStatusUpdate(s)} disabled={updating || loading}
                style={{ padding: '14px', borderRadius: 12, border: 'none', background: flow.bg, color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: (updating || loading) ? 0.7 : 1 }}>
                {updating ? '⏳ Processing...' : flow.label}
              </button>
            );
          })}
          {nextStatuses.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '.9rem' }}>
              No further actions — order is {meta.label}
            </div>
          )}
        </div>

        {/* Scan Result Toast */}
        {scanResult && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: '.875rem', fontWeight: 600,
            background: scanResult.ok ? '#dcfce7' : '#fee2e2',
            color: scanResult.ok ? '#16a34a' : '#dc2626' }}>
            {scanResult.msg}
          </div>
        )}

        {/* Status Timeline */}
        {order.status_logs?.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              🕐 History ({order.status_logs.length} events)
            </summary>
            <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
              {order.status_logs.slice(-6).reverse().map((log, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: '.82rem' }}>
                    {STATUS_META[log.status]?.emoji} {STATUS_META[log.status]?.label || log.status}
                  </div>
                  {log.note && <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{log.note}</div>}
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Main Driver Scan Page ───────────────────────── */
export default function DriverScan() {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);

  const [scanning,   setScanning]   = useState(false);
  const [cameraErr,  setCameraErr]  = useState('');
  const [manualToken, setManualToken] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [order,      setOrder]      = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [lastToken,  setLastToken]  = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // rear camera default

  /* ─── Camera ─────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (err) {
      setCameraErr(`Camera error: ${err.message}. Try the manual entry below.`);
    }
  }, [facingMode]);

  /* ─── QR decode loop ─────────────────────────────────────────── */
  useEffect(() => {
    if (!scanning) return;
    const decode = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(decode);
        return;
      }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr  = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (qr?.data) {
        const token = extractToken(qr.data);
        if (token && token !== lastToken) {
          setLastToken(token);
          stopCamera();
          loadOrder(token);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(decode);
    };
    rafRef.current = requestAnimationFrame(decode);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scanning, lastToken]);

  /* ─── Extract token from QR data ────────────────────────────── */
  const extractToken = (data) => {
    // Could be full URL: https://domain/track/TRK-XXXX
    // Or just a token: TRK-XXXX or ORD-XXXX
    try {
      const url = new URL(data);
      const parts = url.pathname.replace(/\/$/, '').split('/');
      const idx = parts.findIndex(p => p === 'track');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    } catch { /* not a URL — use raw */ }
    return data.trim();
  };

  /* ─── Load order by token ────────────────────────────────────── */
  const loadOrder = async (token) => {
    setLoadingOrder(true);
    setFetchError('');
    setOrder(null);
    const res = await api.get(`/tracking/${token}/order`);
    if (res.success) {
      setOrder(res.data);
      // Auto-log the scan
      await api.post(`/tracking/${token}/scan`, { scan_type: 'driver_scan' }).catch(() => {});
    } else {
      setFetchError(res.message || 'Order not found');
    }
    setLoadingOrder(false);
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await loadOrder(manualToken.trim());
  };

  const handleStatusUpdate = async (token, status, note, gps, cod_collected_amount) => {
    const payload = {
      status, note: note || undefined, lat: gps?.lat, lng: gps?.lng,
    };
    if (cod_collected_amount != null) payload.cod_collected_amount = cod_collected_amount;
    return await api.patch(`/tracking/${token}/status`, payload);
  };

  const handleScan = async (token, scanType, gps) => {
    return await api.post(`/tracking/${token}/scan`, {
      scan_type: scanType, lat: gps?.lat, lng: gps?.lng,
    });
  };

  const reset = () => {
    setOrder(null);
    setFetchError('');
    setLastToken('');
    setManualToken('');
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="page-container" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="page-heading">📷 Driver Scan</h2>
          <p className="page-subheading">Scan shipment QR code or enter tracking number</p>
        </div>
        {order && (
          <button onClick={reset} className="btn-outline-action">Scan Another</button>
        )}
      </div>

      {/* ── Scanner View ──────────────────────────────────────────── */}
      {!order && (
        <>
          {/* Camera Box */}
          <div style={{ position: 'relative', background: '#0f172a', borderRadius: 16, overflow: 'hidden', marginBottom: 16, aspectRatio: '4/3' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Viewfinder overlay */}
            {scanning && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '60%', aspectRatio: '1', border: '3px solid #f97316', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}>
                  <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                    Point at QR or barcode
                  </div>
                </div>
              </div>
            )}

            {/* Idle state */}
            {!scanning && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#94a3b8' }}>
                <div style={{ fontSize: '4rem' }}>📷</div>
                <div style={{ fontSize: '.9rem' }}>Camera off</div>
              </div>
            )}

            {/* Camera controls */}
            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
              {!scanning ? (
                <button onClick={startCamera}
                  style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#f97316', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
                  📷 Start Scanner
                </button>
              ) : (
                <>
                  <button onClick={() => { setFacingMode(f => f === 'environment' ? 'user' : 'environment'); stopCamera(); setTimeout(startCamera, 300); }}
                    style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: '.85rem' }}>
                    🔄 Flip
                  </button>
                  <button onClick={stopCamera}
                    style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'rgba(255,0,0,0.3)', color: '#fff', cursor: 'pointer', fontSize: '.85rem' }}>
                    ⏹ Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {cameraErr && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: '.85rem', marginBottom: 14 }}>
              ⚠️ {cameraErr}
            </div>
          )}

          {/* Manual Entry */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Or enter manually
            </div>
            <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: 10 }}>
              <input type="text" value={manualToken} onChange={e => setManualToken(e.target.value)}
                placeholder="Tracking token or order number..."
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '.9rem' }} />
              <button type="submit" disabled={loadingOrder}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {loadingOrder ? '...' : '→'}
              </button>
            </form>
          </div>

          {fetchError && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 18px', borderRadius: 12, textAlign: 'center', fontWeight: 600 }}>
              ❌ {fetchError}
            </div>
          )}

          {loadingOrder && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
              <div>Looking up shipment...</div>
            </div>
          )}
        </>
      )}

      {/* ── Order Detail View ────────────────────────────────────── */}
      {order && (
        <OrderCard
          order={order}
          onStatusUpdate={handleStatusUpdate}
          onScan={handleScan}
          loading={loadingOrder}
        />
      )}
    </div>
  );
}
