/* ══════════════════════════════════════════════════════════════
 * ClientBarcodes.jsx — Pre-Generate Barcodes
 * ══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from 'react';
import { Barcode, Plus, Download, Copy, Check } from 'iconoir-react';
import './ClientPages.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ClientBarcodes() {
  const [barcodes, setBarcodes]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [count, setCount]             = useState(10);
  const [copiedId, setCopiedId]       = useState(null);

  const token = localStorage.getItem('crm_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/client-portal/pre-generated`, { headers, credentials: 'include' });
      if (res.status === 401) { window.location.href = '/merchant/login'; return; }
      const data = await res.json();
      if (data.success) setBarcodes(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBarcodes(); }, [fetchBarcodes]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/client-portal/pre-generate`, {
        method: 'POST', headers, credentials: 'include',
        body: JSON.stringify({ count }),
      });
      if (res.status === 401) { window.location.href = '/merchant/login'; return; }
      const data = await res.json();
      if (data.success) fetchBarcodes();
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const available = barcodes.filter(b => !b.is_used);
  const used      = barcodes.filter(b => b.is_used);

  if (loading) return <div className="cp-loading"><span className="cp-spinner" /><p>Loading barcodes...</p></div>;

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <h1 className="cp-page-title">Pre-Generated Barcodes</h1>
      </div>

      {/* Generator Card */}
      <div className="cp-card" style={{ maxWidth: 500 }}>
        <h3 className="cp-card-title"><Barcode width={18} height={18} /> Generate Barcodes</h3>
        <p className="cp-detail-sub" style={{ marginBottom: 16 }}>
          Pre-generate tracking tokens that you can print and attach to parcels before creating orders.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="number" min="1" max="100" value={count} onChange={e => setCount(+e.target.value)}
            className="cp-form-input" style={{ width: 100 }} />
          <button className="cp-btn cp-btn-primary" onClick={generate} disabled={generating}>
            {generating ? <span className="cp-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><Plus width={16} height={16} /> Generate</>}
          </button>
        </div>
      </div>

      {/* Available list */}
      <div className="cp-card" style={{ marginTop: 24 }}>
        <h3 className="cp-card-title">
          Available Tokens
          <span className="cp-badge cp-badge-success" style={{ marginLeft: 8 }}>{available.length}</span>
        </h3>
        {available.length === 0 ? (
          <p className="cp-detail-sub">No available tokens. Generate some above.</p>
        ) : (
          <div className="cp-barcode-grid">
            {available.map(b => (
              <div key={b.id} className="cp-barcode-item">
                <code className="cp-barcode-token">{b.tracking_token}</code>
                <button className="cp-btn-icon" title="Copy" onClick={() => copyToClipboard(b.tracking_token, b.id)}>
                  {copiedId === b.id ? <Check width={14} height={14} style={{ color: '#22c55e' }} /> : <Copy width={14} height={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Used list */}
      {used.length > 0 && (
        <div className="cp-card" style={{ marginTop: 24 }}>
          <h3 className="cp-card-title">
            Used Tokens
            <span className="cp-badge cp-badge-muted" style={{ marginLeft: 8 }}>{used.length}</span>
          </h3>
          <div className="cp-barcode-grid">
            {used.map(b => (
              <div key={b.id} className="cp-barcode-item cp-barcode-used">
                <code className="cp-barcode-token">{b.tracking_token}</code>
                {b.order_number && <small style={{ color: '#94a3b8', fontSize: 11 }}>→ {b.order_number}</small>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
