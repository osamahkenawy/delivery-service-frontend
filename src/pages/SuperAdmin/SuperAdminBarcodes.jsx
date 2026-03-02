import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QrCode, Building, Package, CheckCircle, Xmark,
  Refresh, Plus, Trash, Eye, NavArrowLeft
} from 'iconoir-react';
import JsBarcode from 'jsbarcode';
import './SuperAdmin.css';

const API = import.meta.env.VITE_API_URL || '/api';
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('superAdminToken')}`,
  'Content-Type': 'application/json',
});

const SuperAdminBarcodes = () => {
  const { t } = useTranslation();

  // Overview state
  const [overview, setOverview] = useState({ tenants: [], totals: { total: 0, available: 0, used: 0, expired: 0 } });
  const [loading, setLoading] = useState(true);

  // Tenant detail state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantTokens, setTenantTokens] = useState([]);
  const [tenantName, setTenantName] = useState('');
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tokenFilter, setTokenFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100 });

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTenantId, setGenTenantId] = useState(null);
  const [genTenantName, setGenTenantName] = useState('');
  const [genCount, setGenCount] = useState(20);
  const [genBatchName, setGenBatchName] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/barcodes/overview`, { headers: headers() });
      const data = await res.json();
      if (data.success) setOverview(data.data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    }
    setLoading(false);
  };

  const fetchTenantTokens = async (tenantId, filter = 'all', page = 1) => {
    setTenantLoading(true);
    try {
      let url = `${API}/super-admin/barcodes/tenant/${tenantId}?page=${page}&limit=100`;
      if (filter === 'available') url += '&used=false';
      else if (filter === 'used') url += '&used=true';
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setTenantTokens(data.data);
        setTenantName(data.tenant_name);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch tenant tokens:', err);
    }
    setTenantLoading(false);
  };

  const openTenantDetail = (tenantId, name) => {
    setSelectedTenant(tenantId);
    setTenantName(name);
    setTokenFilter('all');
    fetchTenantTokens(tenantId, 'all', 1);
  };

  const backToOverview = () => {
    setSelectedTenant(null);
    setTenantTokens([]);
    fetchOverview();
  };

  const openGenerateModal = (tenantId, name) => {
    setGenTenantId(tenantId);
    setGenTenantName(name);
    setGenCount(20);
    setGenBatchName('');
    setShowGenModal(true);
  };

  const handleGenerate = async () => {
    if (!genTenantId || genCount < 1) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/super-admin/barcodes/tenant/${genTenantId}/generate`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ count: genCount, batch_name: genBatchName }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGenModal(false);
        if (selectedTenant === genTenantId) {
          fetchTenantTokens(genTenantId, tokenFilter, 1);
        }
        fetchOverview();
      } else {
        alert(data.error || 'Generation failed');
      }
    } catch (err) {
      alert('Failed to generate tokens');
    }
    setGenerating(false);
  };

  const handleDelete = async (tokenId) => {
    if (!confirm('Delete this unused token?')) return;
    try {
      const res = await fetch(`${API}/super-admin/barcodes/${tokenId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (data.success) {
        setTenantTokens(prev => prev.filter(t => t.id !== tokenId));
        fetchOverview();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      alert('Failed to delete token');
    }
  };

  const handleFilterChange = (f) => {
    setTokenFilter(f);
    if (selectedTenant) fetchTenantTokens(selectedTenant, f, 1);
  };

  const getStatusBadge = (token) => {
    if (token.is_used) return <span className="sa-badge-success">Linked</span>;
    if (token.expires_at && new Date(token.expires_at) <= new Date()) return <span className="sa-badge-danger">Expired</span>;
    return <span className="sa-badge-info">Available</span>;
  };

  // ─── RENDER ───

  if (loading) {
    return (
      <div className="sa-page">
        <div className="sa-page-header">
          <h1><QrCode size={28} /> Barcode Management</h1>
        </div>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="loading-spinner large" />
          <p>Loading barcode data...</p>
        </div>
      </div>
    );
  }

  // ─── TENANT DETAIL VIEW ───
  if (selectedTenant) {
    return (
      <div className="sa-page">
        <div className="sa-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="sa-btn sa-btn-ghost" onClick={backToOverview} style={{ padding: '6px 12px' }}>
              <NavArrowLeft size={20} /> Back
            </button>
            <h1><QrCode size={28} /> {tenantName} — Pre-Generated Tokens</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sa-btn sa-btn-primary" onClick={() => openGenerateModal(selectedTenant, tenantName)}>
              <Plus size={18} /> Generate Tokens
            </button>
            <button className="sa-btn sa-btn-ghost" onClick={() => fetchTenantTokens(selectedTenant, tokenFilter, 1)}>
              <Refresh size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="sa-tabs" style={{ marginBottom: 16 }}>
          {['all', 'available', 'used'].map(f => (
            <button key={f} className={`sa-tab ${tokenFilter === f ? 'active' : ''}`} onClick={() => handleFilterChange(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Total count */}
        <p style={{ color: '#64748b', marginBottom: 12 }}>
          Showing {tenantTokens.length} of {pagination.total} tokens
        </p>

        {tenantLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="loading-spinner" /></div>
        ) : tenantTokens.length === 0 ? (
          <div className="sa-empty-state">
            <QrCode size={48} />
            <h3>No tokens found</h3>
            <p>Generate pre-printed barcode tokens for this tenant.</p>
            <button className="sa-btn sa-btn-primary" onClick={() => openGenerateModal(selectedTenant, tenantName)}>
              <Plus size={18} /> Generate Tokens
            </button>
          </div>
        ) : (
          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantTokens.map(tok => (
                  <tr key={tok.id}>
                    <td>
                      <code style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {tok.tracking_token}
                      </code>
                    </td>
                    <td>{tok.batch_name || '—'}</td>
                    <td>{getStatusBadge(tok)}</td>
                    <td>
                      {tok.order_number ? (
                        <span style={{ fontWeight: 500 }}>{tok.order_number}</span>
                      ) : '—'}
                    </td>
                    <td>{new Date(tok.created_at).toLocaleDateString()}</td>
                    <td>
                      {tok.expires_at ? (
                        <span style={{
                          color: tok.days_remaining <= 0 ? '#ef4444' : tok.days_remaining <= 7 ? '#f59e0b' : '#64748b'
                        }}>
                          {tok.days_remaining > 0 ? `${tok.days_remaining} days` : 'Expired'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {!tok.is_used && (!tok.expires_at || new Date(tok.expires_at) > new Date()) && (
                        <button
                          className="sa-btn sa-btn-danger"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => handleDelete(tok.id)}
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Generate Modal */}
        {showGenModal && renderGenModal()}
      </div>
    );
  }

  // ─── OVERVIEW (DEFAULT) ───
  const { totals } = overview;

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <h1><QrCode size={28} /> Barcode Management</h1>
        <button className="sa-btn sa-btn-ghost" onClick={fetchOverview}>
          <Refresh size={18} /> Refresh
        </button>
      </div>

      {/* Global Stats */}
      <div className="sa-stats-grid" style={{ marginBottom: 24 }}>
        <div className="sa-stat-card">
          <Package size={24} />
          <div>
            <span className="sa-stat-value">{totals.total}</span>
            <span className="sa-stat-label">Total Tokens</span>
          </div>
        </div>
        <div className="sa-stat-card">
          <CheckCircle size={24} style={{ color: '#22c55e' }} />
          <div>
            <span className="sa-stat-value">{totals.available}</span>
            <span className="sa-stat-label">Available</span>
          </div>
        </div>
        <div className="sa-stat-card">
          <QrCode size={24} style={{ color: '#3b82f6' }} />
          <div>
            <span className="sa-stat-value">{totals.used}</span>
            <span className="sa-stat-label">Used / Linked</span>
          </div>
        </div>
        <div className="sa-stat-card">
          <Xmark size={24} style={{ color: '#ef4444' }} />
          <div>
            <span className="sa-stat-value">{totals.expired}</span>
            <span className="sa-stat-label">Expired</span>
          </div>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="sa-card">
        <div className="sa-card-header">
          <h2><Building size={20} /> Tokens by Tenant</h2>
        </div>
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Total</th>
                <th>Available</th>
                <th>Used</th>
                <th>Expired</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No tenants with pre-generated tokens yet.
                  </td>
                </tr>
              ) : (
                overview.tenants.map(row => (
                  <tr key={row.tenant_id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.tenant_name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{row.slug}</div>
                    </td>
                    <td>{Number(row.total_tokens) || 0}</td>
                    <td style={{ color: '#22c55e', fontWeight: 600 }}>{Number(row.available) || 0}</td>
                    <td style={{ color: '#3b82f6' }}>{Number(row.used) || 0}</td>
                    <td style={{ color: '#ef4444' }}>{Number(row.expired) || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="sa-btn sa-btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => openTenantDetail(row.tenant_id, row.tenant_name)}
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          className="sa-btn sa-btn-primary"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => openGenerateModal(row.tenant_id, row.tenant_name)}
                        >
                          <Plus size={14} /> Generate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenModal && renderGenModal()}
    </div>
  );

  function renderGenModal() {
    return (
      <div className="sa-modal-overlay" onClick={() => setShowGenModal(false)}>
        <div className="sa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
          <div className="sa-modal-header">
            <h3><Plus size={20} /> Generate Tokens — {genTenantName}</h3>
            <button className="sa-modal-close" onClick={() => setShowGenModal(false)}>
              <Xmark size={20} />
            </button>
          </div>
          <div className="sa-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Quantity (1–200)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={genCount}
                onChange={e => setGenCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Batch Name (optional)</label>
              <input
                type="text"
                placeholder="e.g. March-2025"
                value={genBatchName}
                onChange={e => setGenBatchName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>
          <div className="sa-modal-footer">
            <button className="sa-btn sa-btn-ghost" onClick={() => setShowGenModal(false)} disabled={generating}>Cancel</button>
            <button className="sa-btn sa-btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : `Generate ${genCount} Tokens`}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default SuperAdminBarcodes;
