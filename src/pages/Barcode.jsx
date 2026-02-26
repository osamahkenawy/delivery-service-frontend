import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  Printer, ScanBarcode, Package, Search, XmarkCircle,
  CheckSquareSolid, Square,
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

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

const STATUS_COLORS = {
  delivered:  { bg: '#dcfce7', color: '#16a34a' },
  in_transit: { bg: '#e0f2fe', color: '#0369a1' },
  failed:     { bg: '#fee2e2', color: '#dc2626' },
  cancelled:  { bg: '#f1f5f9', color: '#64748b' },
  pending:    { bg: '#fef3c7', color: '#d97706' },
  confirmed:  { bg: '#ede9fe', color: '#7c3aed' },
  assigned:   { bg: '#e0f2fe', color: '#0284c7' },
  picked_up:  { bg: '#fce7f3', color: '#be185d' },
};

const STATUSES = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'];

/* ── Single barcode card (print-friendly) ────────────────────── */
function BarcodeCard({ order, highlighted }) {
  const { t } = useTranslation();
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
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;

  return (
    <div className={`bc-card${highlighted ? ' bc-card-highlighted' : ''}`}>
      <div className="bc-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div className="bc-order-number">{order.order_number}</div>
          <span className="bc-status-pill" style={{ background: sc.bg, color: sc.color }}>
            {order.status?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="bc-meta">
          {order.recipient_name}
          {(order.recipient_emirate || order.zone_name) && (
            <> · {order.recipient_emirate || order.zone_name}</>
          )}
        </div>
      </div>
      <div className="bc-body">
        <div className="bc-barcode-wrap">
          <svg ref={svgRef} />
        </div>
        <div className="bc-qr-wrap">
          <canvas ref={canvasRef} />
          <div className="bc-qr-label">{t('barcode.scan_to_track')}</div>
        </div>
      </div>
      <div className="bc-footer">
        <span className="bc-token">{order.tracking_token}</span>
        {order.order_type && (
          <span className="bc-type">{order.order_type?.replace(/_/g, ' ')?.toUpperCase()}</span>
        )}
      </div>
    </div>
  );
}

export default function Barcode() {
  const { t } = useTranslation();
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState('');
  const [selected,    setSelected]    = useState(new Set());
  const [printing,    setPrinting]    = useState(false);
  const [scanQuery,   setScanQuery]   = useState('');
  const [scanResult,  setScanResult]  = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    api.get('/orders?limit=500').then(res => {
      if (res.success) setOrders(res.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(q) ||
      o.recipient_name?.toLowerCase().includes(q) ||
      o.tracking_token?.toLowerCase().includes(q);
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

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  const printSelected = () => {
    const toPrint = selected.size > 0 ? filtered.filter(o => selected.has(o.id)) : filtered;
    if (!toPrint.length) return;
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  /* Scan-to-find: match tracking_token or order_number exactly */
  const handleScan = useCallback((value) => {
    const q = value.trim().toLowerCase();
    if (!q) { setScanResult(null); setHighlightId(null); return; }
    const found = orders.find(o =>
      o.tracking_token?.toLowerCase() === q ||
      o.order_number?.toLowerCase() === q
    );
    if (found) {
      setScanResult({ status: 'found', number: found.order_number });
      setHighlightId(found.id);
      setSearch('');
      setStatus('');
      setTimeout(() => {
        cardRefs.current[found.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } else {
      setScanResult({ status: 'not_found' });
      setHighlightId(null);
    }
  }, [orders]);

  const toBePrinted = selected.size > 0 ? filtered.filter(o => selected.has(o.id)) : filtered;

  return (
    <>
      {/* ── Screen view ────────────────────────────── */}
      <div className="page-container bc-screen">

        {/* Header */}
        <div className="page-header-row">
          <div>
            <h2 className="page-heading">{t('barcode.title')}</h2>
            <p className="page-subheading">
              {selected.size > 0
                ? t('barcode.subtitle', { total: filtered.length, selected: selected.size })
                : t('barcode.subtitle_none', { total: filtered.length })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-outline-action" onClick={toggleAll}>
              {allSelected
                ? <><CheckSquareSolid width={15} height={15} /> {t('barcode.deselect_all')}</>
                : <><Square width={15} height={15} /> {t('barcode.select_all')}</>}
            </button>
            <button
              className="btn-primary-action"
              onClick={printSelected}
              disabled={printing || (!loading && filtered.length === 0)}
              style={{ background: '#f97316', borderColor: '#f97316' }}
            >
              <Printer width={15} height={15} />
              {selected.size > 0
                ? t('barcode.print_selected', { count: selected.size })
                : t('barcode.print_all', { count: filtered.length })}
            </button>
          </div>
        </div>

        {/* Scan-to-find bar */}
        <div className="bc-scan-bar">
          <div className="bc-scan-input-wrap">
            <ScanBarcode width={16} height={16} className="bc-scan-icon" />
            <input
              className="bc-scan-input"
              placeholder={t('barcode.scan_placeholder')}
              value={scanQuery}
              onChange={e => { setScanQuery(e.target.value); handleScan(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') handleScan(scanQuery); }}
              autoComplete="off"
            />
            {scanQuery && (
              <button className="search-clear" onClick={() => {
                setScanQuery(''); setScanResult(null); setHighlightId(null);
              }}>
                <XmarkCircle width={15} height={15} />
              </button>
            )}
          </div>
          <span className={`bc-scan-feedback${scanResult?.status === 'found' ? ' found' : scanResult?.status === 'not_found' ? ' not-found' : ''}`}>
            {scanResult?.status === 'found'
              ? t('barcode.scan_found', { number: scanResult.number })
              : scanResult?.status === 'not_found'
                ? t('barcode.scan_not_found')
                : t('barcode.scan_hint')}
          </span>
        </div>

        {/* Filter row */}
        <div className="bc-filter-row">
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <Search width={15} height={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={t('barcode.search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <XmarkCircle width={15} height={15} />
              </button>
            )}
          </div>
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{t('barcode.all_statuses')}</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          {(search || status) && (
            <button className="btn-outline-action" onClick={() => { setSearch(''); setStatus(''); }}>
              <XmarkCircle width={14} height={14} /> {t('common.clear')}
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bc-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bc-card skeleton-pulse" style={{ height: 200, borderRadius: 10 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ord-empty">
            <div className="ord-empty-icon"><Package width={48} height={48} /></div>
            <h3>{search || status ? t('barcode.no_results') : t('barcode.no_orders')}</h3>
          </div>
        ) : (
          <div className="bc-grid">
            {filtered.map(order => (
              <div
                key={order.id}
                ref={el => { cardRefs.current[order.id] = el; }}
                className={`bc-card-wrap${selected.has(order.id) ? ' bc-selected' : ''}${highlightId === order.id ? ' bc-highlighted-wrap' : ''}`}
                onClick={() => toggleSelect(order.id)}
              >
                <div className={`bc-select-box${selected.has(order.id) ? ' checked' : ''}`}>
                  {selected.has(order.id)
                    ? <CheckSquareSolid width={18} height={18} />
                    : <Square width={18} height={18} />}
                </div>
                <BarcodeCard order={order} highlighted={highlightId === order.id} />
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
