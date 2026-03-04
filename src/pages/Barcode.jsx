import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  Printer, ScanBarcode, Package, Search, XmarkCircle,
  CheckSquareSolid, Square, Plus, Trash, Link as LinkIcon,
  Xmark,
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

/* ── Pre-generated barcode card (not yet linked to an order) ──── */
function PreGenCard({ token, highlighted }) {
  const { t } = useTranslation();
  const svgRef    = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && token?.tracking_token) {
      renderBarcode(svgRef.current, token.tracking_token);
    }
  }, [token?.tracking_token]);

  useEffect(() => {
    if (!canvasRef.current || !token?.tracking_token) return;
    const trackUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/track/' + token.tracking_token;
    QRCode.toCanvas(canvasRef.current, trackUrl, {
      width: 90, margin: 1, color: { dark: '#1e293b', light: '#ffffff' },
    }).catch(() => {});
  }, [token?.tracking_token]);

  if (!token) return null;
  const isUsed    = token.is_used === 1 || token.is_used === true;
  const isExpired = token.days_remaining !== null && token.days_remaining !== undefined && token.days_remaining <= 0 && !isUsed;

  return (
    <div className={`bc-card${highlighted ? ' bc-card-highlighted' : ''}`}>
      <div className="bc-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div className="bc-order-number">{token.tracking_token}</div>
          <span className="bc-status-pill" style={{
            background: isUsed ? '#dcfce7' : isExpired ? '#fee2e2' : '#fef3c7',
            color: isUsed ? '#16a34a' : isExpired ? '#dc2626' : '#d97706'
          }}>
            {isUsed ? `✓ ${token.order_number || t('barcode.status_linked')}` : isExpired ? t('barcode.status_expired') : t('barcode.status_available')}
          </span>
        </div>
        <div className="bc-meta">
          {token.batch_name && <>{token.batch_name} · </>}
          {token.days_remaining != null && !isUsed && !isExpired ? t('barcode.d_remaining', { count: token.days_remaining }) : ''}
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
        <span className="bc-token">{token.tracking_token}</span>
        <span className="bc-type" style={{ fontSize: 10, opacity: 0.7 }}>{t('barcode.pre_print_badge')}</span>
      </div>
    </div>
  );
}

export default function Barcode() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'preprint'
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [status,      setStatus]      = useState('');
  const [selected,    setSelected]    = useState(new Set());
  const [printing,    setPrinting]    = useState(false);
  const [scanQuery,   setScanQuery]   = useState('');
  const [scanResult,  setScanResult]  = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [printMode,   setPrintMode]   = useState('barcode'); // MODULE B: 'barcode' | 'label'
  const cardRefs = useRef({});

  // ── Pre-Print tab state ──
  const [preTokens,       setPreTokens]       = useState([]);
  const [preLoading,      setPreLoading]      = useState(false);
  const [preSelected,     setPreSelected]     = useState(new Set());
  const [showGenModal,    setShowGenModal]    = useState(false);
  const [genCount,        setGenCount]        = useState(10);
  const [genBatchName,    setGenBatchName]    = useState('');
  const [generating,      setGenerating]      = useState(false);
  const [preStats,        setPreStats]        = useState({ total: 0, available: 0, used: 0, expired: 0 });
  const [preFilter,       setPreFilter]       = useState('available'); // 'all' | 'available' | 'used'
  const [preViewMode,     setPreViewMode]     = useState('grid');  // 'grid' | 'table'
  const preCardRefs = useRef({});

  // ── Link-to-Order modal state ──
  const [showLinkModal,   setShowLinkModal]   = useState(false);
  const [linkTokenId,     setLinkTokenId]     = useState(null);
  const [linkTokenCode,   setLinkTokenCode]   = useState('');
  const [linkSearch,      setLinkSearch]      = useState('');
  const [linkOrders,      setLinkOrders]      = useState([]);
  const [linkSearching,   setLinkSearching]   = useState(false);
  const [linking,         setLinking]         = useState(false);
  const linkSearchTimer   = useRef(null);

  useEffect(() => {
    api.get('/orders?limit=500').then(res => {
      if (res.success) setOrders(res.data || []);
      setLoading(false);
    });
  }, []);

  // Fetch pre-generated tokens when tab is active
  useEffect(() => {
    if (activeTab !== 'preprint') return;
    setPreLoading(true);
    const usedParam = preFilter === 'available' ? '&used=false' : preFilter === 'used' ? '&used=true' : '';
    Promise.all([
      api.get(`/orders/pre-generated?limit=500${usedParam}`),
      api.get('/orders/pre-generated/stats'),
    ]).then(([tokensRes, statsRes]) => {
      if (tokensRes.success) setPreTokens(tokensRes.data || []);
      if (statsRes.success) setPreStats(statsRes.data || {});
      setPreLoading(false);
    }).catch(() => setPreLoading(false));
  }, [activeTab, preFilter]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/orders/pre-generate', {
        count: genCount,
        batch_name: genBatchName || null,
      });
      if (res.success) {
        setShowGenModal(false);
        setGenCount(10);
        setGenBatchName('');
        // Refresh list
        const [tokensRes, statsRes] = await Promise.all([
          api.get(`/orders/pre-generated?limit=500${preFilter === 'available' ? '&used=false' : preFilter === 'used' ? '&used=true' : ''}`),
          api.get('/orders/pre-generated/stats'),
        ]);
        if (tokensRes.success) setPreTokens(tokensRes.data || []);
        if (statsRes.success) setPreStats(statsRes.data || {});
      }
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const handleDeleteToken = async (id) => {
    if (!confirm(t('barcode.confirm_delete_token'))) return;
    const res = await api.delete(`/orders/pre-generated/${id}`);
    if (res.success) {
      setPreTokens(prev => prev.filter(t => t.id !== id));
      setPreStats(prev => ({ ...prev, available: Math.max(0, (prev.available || 0) - 1), total: Math.max(0, (prev.total || 0) - 1) }));
    }
  };

  // ── Refresh pre-print data helper ──
  const refreshPrePrint = async () => {
    const usedParam = preFilter === 'available' ? '&used=false' : preFilter === 'used' ? '&used=true' : '';
    const [tokensRes, statsRes] = await Promise.all([
      api.get(`/orders/pre-generated?limit=500${usedParam}`),
      api.get('/orders/pre-generated/stats'),
    ]);
    if (tokensRes.success) setPreTokens(tokensRes.data || []);
    if (statsRes.success) setPreStats(statsRes.data || {});
  };

  // ── Link-to-order modal helpers ──
  const openLinkModal = (tokenId, tokenCode) => {
    setLinkTokenId(tokenId);
    setLinkTokenCode(tokenCode);
    setLinkSearch('');
    setLinkOrders([]);
    setShowLinkModal(true);
    // Load recent orders immediately
    api.get('/orders/linkable').then(res => {
      if (res.success) setLinkOrders(res.data || []);
    });
  };

  const searchLinkOrders = (q) => {
    setLinkSearch(q);
    clearTimeout(linkSearchTimer.current);
    linkSearchTimer.current = setTimeout(async () => {
      setLinkSearching(true);
      const res = await api.get(`/orders/linkable?q=${encodeURIComponent(q)}`);
      if (res.success) setLinkOrders(res.data || []);
      setLinkSearching(false);
    }, 300);
  };

  const handleLinkToOrder = async (orderId) => {
    setLinking(true);
    try {
      const res = await api.post(`/orders/pre-generated/${linkTokenId}/link`, { order_id: orderId });
      if (res.success) {
        setShowLinkModal(false);
        await refreshPrePrint();
      } else {
        alert(res.message || t('barcode.link_failed'));
      }
    } catch (err) { alert(t('barcode.link_failed')); }
    setLinking(false);
  };

  const handleUnlink = async (tokenId) => {
    if (!confirm(t('barcode.confirm_unlink'))) return;
    const res = await api.post(`/orders/pre-generated/${tokenId}/unlink`);
    if (res.success) {
      await refreshPrePrint();
    } else {
      alert(res.message || t('barcode.unlink_failed'));
    }
  };

  const printPreSelected = () => {
    const toPrint = preSelected.size > 0 ? preTokens.filter(t => preSelected.has(t.id)) : preTokens.filter(t => !t.is_used);
    if (!toPrint.length) return;
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  };

  /* ── MODULE B: Full shipping label PDF generation ─────────── */
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const getAuthToken = () => localStorage.getItem('crm_token');

  const printShippingLabels = () => {
    const toPrint = selected.size > 0 ? filtered.filter(o => selected.has(o.id)) : filtered;
    if (!toPrint.length) return;
    setPrinting(true);
    const token = getAuthToken();

    if (toPrint.length === 1) {
      // Single label
      fetch(`${API_BASE_URL}/orders/${toPrint[0].id}/label`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => {
          if (r.status === 401) { localStorage.removeItem('crm_token'); window.location.href = '/login'; throw new Error('Session expired'); }
          if (!r.ok) throw new Error('Label generation failed');
          return r.blob();
        })
        .then(blob => {
          const pdfUrl = URL.createObjectURL(blob);
          window.open(pdfUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
        })
        .catch(e => { console.error(e); alert(e.message || 'Failed to generate shipping label'); })
        .finally(() => setPrinting(false));
    } else {
      // Batch labels
      fetch(`${API_BASE_URL}/orders/labels`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: toPrint.map(o => o.id) }),
      })
        .then(r => {
          if (r.status === 401) { localStorage.removeItem('crm_token'); window.location.href = '/login'; throw new Error('Session expired'); }
          if (!r.ok) throw new Error('Batch label generation failed');
          return r.blob();
        })
        .then(blob => {
          const pdfUrl = URL.createObjectURL(blob);
          window.open(pdfUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
        })
        .catch(e => { console.error(e); alert(e.message || 'Failed to generate shipping labels'); })
        .finally(() => setPrinting(false));
    }
  };

  const handlePrint = () => {
    if (printMode === 'label') {
      printShippingLabels();
    } else {
      printSelected();
    }
  };

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
  const prePrintList = preSelected.size > 0 ? preTokens.filter(t => preSelected.has(t.id)) : preTokens.filter(t => !t.is_used);
  const preAllSelected = preTokens.length > 0 && preSelected.size === preTokens.length;

  return (
    <>
      {/* ── Screen view ────────────────────────────── */}
      <div className="page-container bc-screen">

        {/* Header */}
        <div className="module-hero">
          <div className="module-hero-left">
            <h2 className="module-hero-title">{t('barcode.title')}</h2>
            <p className="module-hero-sub">
              {activeTab === 'orders'
                ? (selected.size > 0
                    ? t('barcode.subtitle', { total: filtered.length, selected: selected.size })
                    : t('barcode.subtitle_none', { total: filtered.length }))
                : t('barcode.preprint_subtitle', { available: preStats.available || 0, used: preStats.used || 0 })}
            </p>
          </div>
          <div className="module-hero-actions">
            {activeTab === 'orders' ? (
              <>
                {/* MODULE B: Print mode toggle */}
                <div style={{
                  display: 'flex', borderRadius: 8, overflow: 'hidden',
                  border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600,
                }}>
                  <button
                    onClick={() => setPrintMode('barcode')}
                    style={{
                      padding: '7px 14px', border: 'none', cursor: 'pointer',
                      background: printMode === 'barcode' ? '#f97316' : '#fff',
                      color: printMode === 'barcode' ? '#fff' : '#64748b',
                    }}
                  >
                    <ScanBarcode width={13} height={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Barcode Only
                  </button>
                  <button
                    onClick={() => setPrintMode('label')}
                    style={{
                      padding: '7px 14px', border: 'none', cursor: 'pointer',
                      borderLeft: '1px solid #e2e8f0',
                      background: printMode === 'label' ? '#ea580c' : '#fff',
                      color: printMode === 'label' ? '#fff' : '#64748b',
                    }}
                  >
                    <Printer width={13} height={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Shipping Label
                  </button>
                </div>
                <button className="module-btn module-btn-outline" onClick={toggleAll}>
                  {allSelected
                    ? <><CheckSquareSolid width={15} height={15} /> {t('barcode.deselect_all')}</>
                    : <><Square width={15} height={15} /> {t('barcode.select_all')}</>}
                </button>
                <button
                  className="module-btn module-btn-primary"
                  onClick={handlePrint}
                  disabled={printing || (!loading && filtered.length === 0)}
                  style={{ background: printMode === 'label' ? '#ea580c' : '#f97316', borderColor: printMode === 'label' ? '#ea580c' : '#f97316' }}
                >
                  <Printer width={15} height={15} />
                  {printMode === 'label'
                    ? (selected.size > 0 ? `Print Labels (${selected.size})` : `Print All Labels (${filtered.length})`)
                    : (selected.size > 0
                        ? t('barcode.print_selected', { count: selected.size })
                        : t('barcode.print_all', { count: filtered.length }))}
                </button>
              </>
            ) : (
              <>
                <button className="module-btn module-btn-outline" onClick={() => setShowGenModal(true)}>
                  <Plus width={15} height={15} /> {t('barcode.generate_barcodes')}
                </button>
                <button
                  className="module-btn module-btn-primary"
                  onClick={printPreSelected}
                  disabled={printing || preTokens.length === 0}
                  style={{ background: '#f97316', borderColor: '#f97316' }}
                >
                  <Printer width={15} height={15} />
                  {preSelected.size > 0 ? t('barcode.print_selected', { count: preSelected.size }) : t('barcode.print_all_available', { count: preTokens.filter(t => !t.is_used).length })}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: activeTab === 'orders' ? '2px solid #f97316' : '2px solid transparent',
              color: activeTab === 'orders' ? '#f97316' : '#64748b',
              marginBottom: -2,
            }}
          >
            <Package width={14} height={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t('barcode.tab_orders')}
          </button>
          <button
            onClick={() => setActiveTab('preprint')}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: activeTab === 'preprint' ? '2px solid #f97316' : '2px solid transparent',
              color: activeTab === 'preprint' ? '#f97316' : '#64748b',
              marginBottom: -2,
            }}
          >
            <ScanBarcode width={14} height={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t('barcode.tab_preprint')}
            {preStats.available > 0 && (
              <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, padding: '2px 7px', borderRadius: 10, marginLeft: 8 }}>
                {preStats.available}
              </span>
            )}
          </button>
        </div>

        {/* ── ORDERS TAB ─────────────────────────────── */}
        {activeTab === 'orders' && (
          <>
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
                <button className="module-btn module-btn-outline" onClick={() => { setSearch(''); setStatus(''); }}>
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
          </>
        )}

        {/* ── PRE-PRINT TAB ──────────────────────────── */}
        {activeTab === 'preprint' && (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { label: t('barcode.stats_total'), value: preStats.total || 0, bg: '#f1f5f9', color: '#475569' },
                { label: t('barcode.stats_available'), value: preStats.available || 0, bg: '#fef3c7', color: '#d97706' },
                { label: t('barcode.stats_used'), value: preStats.used || 0, bg: '#dcfce7', color: '#16a34a' },
                { label: t('barcode.stats_expired'), value: preStats.expired || 0, bg: '#fee2e2', color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '10px 18px', borderRadius: 10, background: s.bg,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="bc-filter-row">
              <select className="filter-select" value={preFilter} onChange={e => setPreFilter(e.target.value)}>
                <option value="all">{t('barcode.filter_all')}</option>
                <option value="available">{t('barcode.filter_available')}</option>
                <option value="used">{t('barcode.filter_used')}</option>
              </select>
              {/* View mode toggle */}
              <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid #e2e8f0', fontSize:12, fontWeight:600 }}>
                <button onClick={() => setPreViewMode('grid')}
                  style={{ padding:'6px 12px', border:'none', cursor:'pointer',
                    background: preViewMode === 'grid' ? '#f97316' : '#fff',
                    color: preViewMode === 'grid' ? '#fff' : '#64748b' }}>
                  {t('barcode.view_grid')}
                </button>
                <button onClick={() => setPreViewMode('table')}
                  style={{ padding:'6px 12px', border:'none', cursor:'pointer', borderLeft:'1px solid #e2e8f0',
                    background: preViewMode === 'table' ? '#f97316' : '#fff',
                    color: preViewMode === 'table' ? '#fff' : '#64748b' }}>
                  {t('barcode.view_table')}
                </button>
              </div>
              <button
                className="module-btn module-btn-outline"
                onClick={() => {
                  if (preAllSelected) setPreSelected(new Set());
                  else setPreSelected(new Set(preTokens.map(t => t.id)));
                }}
              >
                {preAllSelected
                  ? <><CheckSquareSolid width={15} height={15} /> {t('barcode.deselect_all')}</>
                  : <><Square width={15} height={15} /> {t('barcode.select_all')}</>}
              </button>
            </div>

            {/* Content */}
            {preLoading ? (
              <div className="bc-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bc-card skeleton-pulse" style={{ height: 200, borderRadius: 10 }} />
                ))}
              </div>
            ) : preTokens.length === 0 ? (
              <div className="ord-empty">
                <div className="ord-empty-icon"><ScanBarcode width={48} height={48} /></div>
                <h3>{t('barcode.no_pregenerated')}</h3>
                <p style={{ color: '#64748b', marginTop: 8 }}>{t('barcode.no_pregenerated_hint')}</p>
                <button
                  className="module-btn module-btn-primary"
                  onClick={() => setShowGenModal(true)}
                  style={{ marginTop: 16, background: '#f97316', borderColor: '#f97316' }}
                >
                  <Plus width={15} height={15} /> {t('barcode.generate_barcodes')}
                </button>
              </div>
            ) : preViewMode === 'table' ? (
              /* ── TABLE VIEW ── */
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_token')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_batch')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_status')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_linked_order')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_created')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_expires')}</th>
                      <th style={{ padding:'12px 16px', textAlign:'center', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t('barcode.th_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preTokens.map(tok => {
                      const isUsed = tok.is_used === 1 || tok.is_used === true;
                      const isExpired = tok.days_remaining !== null && tok.days_remaining !== undefined && tok.days_remaining <= 0 && !isUsed;
                      return (
                        <tr key={tok.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'10px 16px' }}>
                            <code style={{ fontFamily:'monospace', fontWeight:600, fontSize:13, color:'#1e293b' }}>
                              {tok.tracking_token}
                            </code>
                          </td>
                          <td style={{ padding:'10px 16px', color:'#64748b' }}>{tok.batch_name || '—'}</td>
                          <td style={{ padding:'10px 16px' }}>
                            <span style={{
                              display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                              background: isUsed ? '#dcfce7' : isExpired ? '#fee2e2' : '#fef3c7',
                              color: isUsed ? '#16a34a' : isExpired ? '#dc2626' : '#d97706',
                            }}>
                              {isUsed ? t('barcode.status_linked') : isExpired ? t('barcode.status_expired') : t('barcode.status_available')}
                            </span>
                          </td>
                          <td style={{ padding:'10px 16px', fontWeight:500, color:'#1e293b' }}>
                            {tok.order_number || '—'}
                          </td>
                          <td style={{ padding:'10px 16px', color:'#64748b', fontSize:12 }}>
                            {tok.created_at ? new Date(tok.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding:'10px 16px' }}>
                            {tok.expires_at ? (
                              <span style={{ color: tok.days_remaining <= 0 ? '#ef4444' : tok.days_remaining <= 7 ? '#f59e0b' : '#64748b', fontSize:12 }}>
                                {tok.days_remaining > 0 ? t('barcode.days_remaining', { count: tok.days_remaining }) : t('barcode.status_expired')}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding:'10px 16px', textAlign:'center' }}>
                            <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                              {!isUsed && !isExpired && (
                                <button onClick={() => openLinkModal(tok.id, tok.tracking_token)}
                                  style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #3b82f6', background:'#eff6ff',
                                    color:'#2563eb', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                  <LinkIcon width={12} height={12} /> {t('barcode.link')}
                                </button>
                              )}
                              {isUsed && (
                                <button onClick={() => handleUnlink(tok.id)}
                                  style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #f97316', background:'#fff7ed',
                                    color:'#ea580c', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                  <Xmark width={12} height={12} /> {t('barcode.unlink')}
                                </button>
                              )}
                              {!isUsed && (
                                <button onClick={() => handleDeleteToken(tok.id)}
                                  style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #ef4444', background:'#fef2f2',
                                    color:'#dc2626', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                  <Trash width={12} height={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── GRID VIEW (existing) ── */
              <div className="bc-grid">
                {preTokens.map(token => {
                  const isUsed = token.is_used === 1 || token.is_used === true;
                  const isExpired = token.days_remaining !== null && token.days_remaining !== undefined && token.days_remaining <= 0 && !isUsed;
                  return (
                  <div
                    key={token.id}
                    ref={el => { preCardRefs.current[token.id] = el; }}
                    className={`bc-card-wrap${preSelected.has(token.id) ? ' bc-selected' : ''}`}
                    onClick={() => {
                      setPreSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(token.id)) next.delete(token.id);
                        else next.add(token.id);
                        return next;
                      });
                    }}
                  >
                    <div className={`bc-select-box${preSelected.has(token.id) ? ' checked' : ''}`}>
                      {preSelected.has(token.id)
                        ? <CheckSquareSolid width={18} height={18} />
                        : <Square width={18} height={18} />}
                    </div>
                    <PreGenCard token={token} />
                    {/* Action buttons for tokens */}
                    <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:4, zIndex:2 }}>
                      {!isUsed && !isExpired && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openLinkModal(token.id, token.tracking_token); }}
                          style={{ background:'#eff6ff', border:'1px solid #3b82f6', borderRadius:6,
                            padding:'4px 8px', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:600 }}
                          title={t('barcode.link_to_order')}>
                          <LinkIcon width={12} height={12} /> {t('barcode.link')}
                        </button>
                      )}
                      {isUsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnlink(token.id); }}
                          style={{ background:'#fff7ed', border:'1px solid #f97316', borderRadius:6,
                            padding:'4px 8px', cursor:'pointer', color:'#ea580c', display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:600 }}
                          title={t('barcode.unlink_from_order')}>
                          <Xmark width={12} height={12} /> {t('barcode.unlink')}
                        </button>
                      )}
                      {!isUsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteToken(token.id); }}
                          style={{ background:'#fee2e2', border:'none', borderRadius:6,
                            padding:'4px 6px', cursor:'pointer', color:'#dc2626' }}
                          title={t('barcode.delete_token')}>
                          <Trash width={14} height={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Generate Modal ────────────────────────────── */}
      {showGenModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowGenModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, width: 400, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t('barcode.generate_modal_title')}</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              {t('barcode.generate_modal_desc')}
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
              {t('barcode.quantity_label')}
            </label>
            <input
              type="number"
              min={1} max={200}
              value={genCount}
              onChange={e => setGenCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{
                width: '100%', padding: '10px 13px', borderRadius: 9,
                border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', marginBottom: 16,
              }}
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
              {t('barcode.batch_name_label')}
            </label>
            <input
              type="text"
              placeholder={t('barcode.batch_placeholder')}
              value={genBatchName}
              onChange={e => setGenBatchName(e.target.value)}
              style={{
                width: '100%', padding: '10px 13px', borderRadius: 9,
                border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', marginBottom: 24,
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="module-btn module-btn-outline"
                onClick={() => setShowGenModal(false)}
                disabled={generating}
              >
                {t('common.cancel')}
              </button>
              <button
                className="module-btn module-btn-primary"
                onClick={handleGenerate}
                disabled={generating}
                style={{ background: '#f97316', borderColor: '#f97316' }}
              >
                {generating ? t('barcode.generating') : t('barcode.generate_count', { count: genCount })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link-to-Order Modal ───────────────────────── */}
      {showLinkModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowLinkModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 0, width: 520, maxWidth: '94vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <h3 style={{ margin:0, fontSize:18, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  <LinkIcon width={20} height={20} color="#3b82f6" /> {t('barcode.link_modal_title')}
                </h3>
                <button onClick={() => setShowLinkModal(false)}
                  style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Xmark width={16} height={16} />
                </button>
              </div>
              <div style={{ background:'#f0f9ff', padding:'10px 14px', borderRadius:8, border:'1px solid #bae6fd', marginBottom:12 }}>
                <span style={{ fontSize:12, color:'#0369a1', fontWeight:600 }}>{t('barcode.link_modal_token')} </span>
                <code style={{ fontFamily:'monospace', fontWeight:700, color:'#0c4a6e' }}>{linkTokenCode}</code>
              </div>
              {/* Search */}
              <div style={{ position:'relative' }}>
                <Search width={15} height={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                <input
                  type="text"
                  placeholder={t('barcode.link_search_placeholder')}
                  value={linkSearch}
                  onChange={e => searchLinkOrders(e.target.value)}
                  autoFocus
                  style={{
                    width:'100%', padding:'10px 14px 10px 36px', borderRadius:9,
                    border:'1px solid #e2e8f0', fontSize:14, boxSizing:'border-box',
                  }}
                />
                {linkSearching && (
                  <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
                    <div className="loading-spinner" style={{ width:16, height:16, borderWidth:2 }} />
                  </div>
                )}
              </div>
            </div>

            {/* Order List */}
            <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
              {linkOrders.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'#94a3b8' }}>
                  <Package width={36} height={36} />
                  <p style={{ marginTop:8, fontSize:14 }}>{linkSearch ? t('barcode.link_no_match') : t('barcode.link_no_orders')}</p>
                </div>
              ) : (
                linkOrders.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.pending;
                  return (
                    <div key={o.id}
                      onClick={() => !linking && handleLinkToOrder(o.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:14, padding:'12px 24px',
                        cursor: linking ? 'not-allowed' : 'pointer', transition:'background 0.15s',
                        borderBottom:'1px solid #f8fafc',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{o.order_number}</span>
                          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:sc.bg, color:sc.color }}>
                            {o.status?.replace(/_/g,' ')}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:'#64748b', display:'flex', gap:12 }}>
                          <span>{o.recipient_name || '—'}</span>
                          <span style={{ fontFamily:'monospace', fontSize:11 }}>{o.tracking_token}</span>
                        </div>
                      </div>
                      <div style={{
                        padding:'6px 14px', borderRadius:8, background:'#3b82f6', color:'#fff',
                        fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap',
                        opacity: linking ? 0.6 : 1,
                      }}>
                        {linking ? '...' : t('barcode.link')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'12px 24px', borderTop:'1px solid #e2e8f0', background:'#f8fafc',
              borderRadius:'0 0 16px 16px', fontSize:12, color:'#94a3b8', textAlign:'center' }}>
              {t('barcode.link_footer', { token: linkTokenCode })}
            </div>
          </div>
        </div>
      )}

      {/* ── Print-only view ─────────────────────────── */}
      <div className="bc-print-only">
        {activeTab === 'orders'
          ? toBePrinted.map(order => (
              <div key={order.id} className="bc-print-page">
                <BarcodeCard order={order} />
              </div>
            ))
          : prePrintList.map(token => (
              <div key={token.id} className="bc-print-page">
                <PreGenCard token={token} />
              </div>
            ))
        }
      </div>
    </>
  );
}
