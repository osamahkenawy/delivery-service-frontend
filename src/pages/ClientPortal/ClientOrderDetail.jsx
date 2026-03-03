/* ══════════════════════════════════════════════════════════════
 * ClientOrderDetail.jsx — Single Order View with Timeline
 * Route: /merchant/orders/:id
 * ══════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Xmark, Copy, CheckCircle } from 'iconoir-react';
import api from '../../lib/api';
import { shareViaWhatsApp, buildOrderMessage } from '../../lib/whatsapp';
import './ClientPages.css';

/* ── WhatsApp SVG Icon ── */
const WhatsAppIcon = ({ width = 16, height = 16, color = 'currentColor' }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill={color}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#3b82f6', assigned: '#8b5cf6', picked_up: '#6366f1',
  in_transit: '#0ea5e9', delivered: '#10b981', failed: '#ef4444', returned: '#f97316', cancelled: '#94a3b8',
};

export default function ClientOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/client-portal/orders/${id}`);
        if (res.success) setOrder(res.data);
      } catch (err) {
        console.error('Failed to fetch order:', err);
      }
      setLoading(false);
    })();
  }, [id]);

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return;
    const res = await api.delete(`/client-portal/orders/${id}`);
    if (res.success) navigate('/merchant/orders');
    else alert(res.message);
  };

  const downloadLabel = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/client-portal/orders/${id}/label`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.status === 401) { window.location.href = '/merchant/login'; return; }
      if (!res.ok) { alert('Failed to generate label'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `label-${order?.order_number}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { alert('Label error'); }
  };

  const copyTracking = () => {
    navigator.clipboard.writeText(order?.tracking_token || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>;
  if (!order) return <div className="cp-page"><p>Order not found</p></div>;

  const o = order;

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/merchant/orders" className="cp-back-btn"><ArrowLeft width={18} height={18} /></Link>
          <div>
            <h1 className="cp-page-title" style={{ margin: 0 }}>{o.order_number}</h1>
            <span className="cp-cell-sub">Created {new Date(o.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cp-btn cp-btn-outline" onClick={downloadLabel}><Download width={16} height={16} /> Label</button>
          <button className="wa-share-btn" onClick={() => {
            const trackingUrl = window.location.origin;
            const msg = buildOrderMessage(o, null, trackingUrl);
            shareViaWhatsApp(o.recipient_phone, msg);
          }} title="Share via WhatsApp">
            <WhatsAppIcon width={15} height={15} color="#fff" /> Share
          </button>
          {['pending', 'confirmed'].includes(o.status) && (
            <button className="cp-btn cp-btn-danger" onClick={cancelOrder}><Xmark width={16} height={16} /> Cancel</button>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: 24 }}>
        <span className="cp-status-badge cp-status-badge-lg" style={{ background: STATUS_COLORS[o.status] + '18', color: STATUS_COLORS[o.status], borderColor: STATUS_COLORS[o.status] + '40' }}>
          {o.status?.replace(/_/g, ' ').toUpperCase()}
        </span>
        {o.tracking_token && (
          <button className="cp-copy-btn" onClick={copyTracking} style={{ marginLeft: 16 }}>
            {copied ? <CheckCircle width={14} height={14} /> : <Copy width={14} height={14} />}
            {copied ? 'Copied!' : o.tracking_token}
          </button>
        )}
        {o.awb_number && <span className="cp-awb-tag">AWB: {o.awb_number}</span>}
      </div>

      <div className="cp-detail-grid">
        {/* Left: Info Cards */}
        <div className="cp-detail-left">
          <div className="cp-detail-card">
            <h3 className="cp-detail-card-title">Sender</h3>
            <p className="cp-detail-val">{o.sender_name || '—'}</p>
            <p className="cp-detail-sub" style={{ display:'flex', alignItems:'center', gap:6 }}>
              {o.sender_phone}
              {o.sender_phone && (
                <button className="wa-share-inline" onClick={() => {
                  const msg = buildOrderMessage(o, null, window.location.origin);
                  shareViaWhatsApp(o.sender_phone, msg);
                }} title="Share via WhatsApp">
                  <WhatsAppIcon width={11} height={11} color="#fff" />
                </button>
              )}
            </p>
            <p className="cp-detail-sub">{o.sender_address}</p>
          </div>

          <div className="cp-detail-card">
            <h3 className="cp-detail-card-title">Recipient</h3>
            <p className="cp-detail-val">{o.recipient_name}</p>
            <p className="cp-detail-sub" style={{ display:'flex', alignItems:'center', gap:6 }}>
              {o.recipient_phone}
              {o.recipient_phone && (
                <button className="wa-share-inline" onClick={() => {
                  const msg = buildOrderMessage(o, null, window.location.origin);
                  shareViaWhatsApp(o.recipient_phone, msg);
                }} title="Share via WhatsApp">
                  <WhatsAppIcon width={11} height={11} color="#fff" />
                </button>
              )}
            </p>
            <p className="cp-detail-sub">{o.recipient_address}</p>
            <p className="cp-detail-sub">{o.recipient_area} — {o.recipient_emirate}</p>
          </div>

          <div className="cp-detail-card">
            <h3 className="cp-detail-card-title">Shipment Details</h3>
            <div className="cp-detail-row"><span>Type:</span><span>{o.order_type}</span></div>
            <div className="cp-detail-row"><span>Category:</span><span>{o.category}</span></div>
            <div className="cp-detail-row"><span>Weight:</span><span>{o.weight_kg ? `${o.weight_kg} kg` : '—'}</span></div>
            {o.description && <div className="cp-detail-row"><span>Description:</span><span>{o.description}</span></div>}
            {o.special_instructions && <div className="cp-detail-row"><span>Instructions:</span><span>{o.special_instructions}</span></div>}
          </div>

          <div className="cp-detail-card">
            <h3 className="cp-detail-card-title">Payment</h3>
            <div className="cp-detail-row"><span>Method:</span><span className="cp-badge">{o.payment_method?.toUpperCase()}</span></div>
            <div className="cp-detail-row"><span>Delivery Fee:</span><span>AED {o.delivery_fee}</span></div>
            {o.discount > 0 && <div className="cp-detail-row"><span>Discount:</span><span>-AED {o.discount}</span></div>}
            <div className="cp-detail-row"><span>Total:</span><strong>AED {o.total_amount}</strong></div>
            {o.payment_method === 'cod' && <div className="cp-detail-row"><span>COD Amount:</span><strong>AED {o.cod_amount}</strong></div>}
          </div>

          {o.driver_name && (
            <div className="cp-detail-card">
              <h3 className="cp-detail-card-title">Driver</h3>
              <p className="cp-detail-val">{o.driver_name}</p>
              <p className="cp-detail-sub" style={{ display:'flex', alignItems:'center', gap:6 }}>
                {o.driver_phone}
                {o.driver_phone && (
                  <button className="wa-share-inline" onClick={() => {
                    const msg = buildOrderMessage(o, null, window.location.origin);
                    shareViaWhatsApp(o.driver_phone, msg);
                  }} title="Share via WhatsApp">
                    <WhatsAppIcon width={11} height={11} color="#fff" />
                  </button>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="cp-detail-right">
          <div className="cp-detail-card">
            <h3 className="cp-detail-card-title">Status Timeline</h3>
            <div className="cp-timeline">
              {(o.timeline || []).map((tl, i) => (
                <div key={i} className={`cp-timeline-item ${i === (o.timeline || []).length - 1 ? 'cp-tl-active' : ''}`}>
                  <div className="cp-tl-dot" style={{ background: STATUS_COLORS[tl.status] || '#94a3b8' }} />
                  <div className="cp-tl-content">
                    <span className="cp-tl-status">{tl.status?.replace(/_/g, ' ')}</span>
                    {tl.notes && <span className="cp-tl-notes">{tl.notes}</span>}
                    <span className="cp-tl-time">{new Date(tl.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!o.timeline || o.timeline.length === 0) && (
                <p className="cp-detail-sub">No status updates yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
