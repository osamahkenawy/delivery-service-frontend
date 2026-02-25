import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import api from '../lib/api';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

/* ── Generate a CODE128 barcode into an <svg> element ────────── */
function renderBarcode(svgEl, value) {
  if (!svgEl || !value) return;
  try {
    JsBarcode(svgEl, value, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      margin: 8,
      background: '#ffffff',
      lineColor: '#1e293b',
    });
  } catch (_) {}
}

/* ── Single barcode card (print-friendly) ────────────────────── */
function BarcodeCard({ order }) {
  const svgRef    = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && order?.tracking_token) {
      renderBarcode(svgRef.current, order.tracking_token);
    }
  }, [order?.tracking_token]);

  useEffect(() => {
    if (!canvasRef.current || !order?.tracking_token) return;
    const trackUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/track/' + order.tracking_token;
    QRCode.toCanvas(canvasRef.current, trackUrl, {
      width: 90, margin: 1, color: { dark: '#1e293b', light: '#ffffff' },
    }).catch(() => {});
  }, [order?.tracking_token]);

  if (!order) return null;

  return (
    <div className="bc-card">
      <div className="bc-card-header">
        <div className="bc-order-number">{order.order_number}</div>
        <div className="bc-meta">
          {order.recipient_name} · {order.recipient_emirate || order.zone_name}
        </div>
      </div>
      <div className="bc-body">
        <div className="bc-barcode-wrap">
          <svg ref={svgRef} />
        </div>
        <div className="bc-qr-wrap">
          <canvas ref={canvasRef} />
          <div className="bc-qr-label">{t("barcode.scan_to_track")}</div>
        </div>
      </div>
      <div className="bc-footer">
        <span className="bc-token">{order.tracking_token}</span>
        <span className="bc-type">{order.order_type?.replace('_', ' ')?.toUpperCase()}</span>
      </div>
    </div>
  );
}

const TRACK_BASE = typeof window !== 'undefined'
  ? window.location.origin + '/track/'
  : '/track/';

export default function Barcode() {
  const { t } = useTranslation();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [selected, setSelected] = useState(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.get('/orders?limit=100').then(res => {
      if (res.success) setOrders(res.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_token?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !status || o.status === status;
    return matchSearch && matchStatus && o.tracking_token;
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  const printSelected = () => {
    const toPrint = selected.size > 0
      ? filtered.filter(o => selected.has(o.id))
      : filtered;
    if (!toPrint.length) return;
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  const toBePrinted = selected.size > 0
    ? filtered.filter(o => selected.has(o.id))
    : [];

  const STATUSES = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'];

  return (
    <>
      {/* ── Screen view ────────────────────────────── */}
      <div className="page-container bc-screen">
        <div className="page-header-row">
          <div>
            <h2 className="page-heading">{t("barcode.title")}</h2>
            <p className="page-subheading">
              {filtered.length} orders · {selected.size > 0 ? `${selected.size} selected` : 'select to print'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-outline-action" onClick={toggleAll}>
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.875rem' }}
              onClick={printSelected}>
              🖨 Print {selected.size > 0 ? `${selected.size}` : 'All'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            className="filter-input"
            placeholder="Search order # or recipient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <select className="od-select" value={status} onChange={e => setStatus(e.target.value)}
            style={{ width: 'auto', minWidth: 150 }}>
            <option value="">{t("barcode.all_statuses")}</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="od-loading">{t("barcode.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="od-empty-tab">
            <span style={{ fontSize: '2rem' }}>📦</span>
            <p>{t("barcode.no_orders")}</p>
          </div>
        ) : (
          <div className="bc-grid">
            {filtered.map(order => (
              <div key={order.id}
                className={`bc-card-wrap ${selected.has(order.id) ? 'bc-selected' : ''}`}
                onClick={() => toggleSelect(order.id)}
              >
                <div className="bc-select-box">
                  {selected.has(order.id) ? '☑' : '☐'}
                </div>
                <BarcodeCard order={order} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Print-only view ─────────────────────────── */}
      <div className="bc-print-only">
        {toBePrinted.map(order => (
          <div key={order.id} className="bc-print-page">
            <BarcodeCard order={order} />
          </div>
        ))}
      </div>
    </>
  );
}
