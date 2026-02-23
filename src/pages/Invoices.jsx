import { useState, useEffect } from 'react';
import api from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const STATUS_COLORS = {
  draft:    { bg: '#f1f5f9', color: '#64748b' },
  sent:     { bg: '#dbeafe', color: '#1d4ed8' },
  paid:     { bg: '#dcfce7', color: '#16a34a' },
  overdue:  { bg: '#fee2e2', color: '#dc2626' },
  cancelled:{ bg: '#fef3c7', color: '#d97706' },
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [genForm, setGenForm] = useState({ client_id: '', period_start: '', period_end: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    Promise.all([
      api.get('/invoices').then(r => r.success && setInvoices(r.data || [])),
      api.get('/clients').then(r => r.success && setClients(r.data || [])),
    ]).then(() => setLoading(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await api.post('/invoices/generate', genForm);
    if (res.success) {
      setShowGenerate(false);
      setGenForm({ client_id: '', period_start: '', period_end: '', notes: '' });
      api.get('/invoices').then(r => r.success && setInvoices(r.data || []));
    } else {
      setError(res.message || 'Failed to generate invoice');
    }
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    await api.patch(`/invoices/${id}/status`, { status });
    api.get('/invoices').then(r => r.success && setInvoices(r.data || []));
  };

  const downloadPDF = async (inv) => {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`${API_BASE}/invoices/${inv.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Failed to generate PDF'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number || 'invoice-' + inv.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = statusFilter ? invoices.filter(i => i.status === statusFilter) : invoices;
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const total = Math.ceil(filtered.length / PER_PAGE);

  const totalAmount = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Invoices</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{invoices.length} invoices</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Generate Invoice
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Invoiced', value: `AED ${totalAmount.toFixed(2)}`, color: '#f97316' },
          { label: 'Collected', value: `AED ${paidAmount.toFixed(2)}`, color: '#16a34a' },
          { label: 'Outstanding', value: `AED ${(totalAmount - paidAmount).toFixed(2)}`, color: '#dc2626' },
          ...Object.entries(STATUS_COLORS).map(([s, sc]) => ({
            label: s.charAt(0).toUpperCase() + s.slice(1),
            value: invoices.filter(i => i.status === s).length,
            color: sc.color,
          })),
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('')}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: !statusFilter ? '#f97316' : '#f1f5f9', color: !statusFilter ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          All
        </button>
        {Object.keys(STATUS_COLORS).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: statusFilter === s ? '#f97316' : '#f1f5f9', color: statusFilter === s ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Invoice #', 'Client', 'Period', 'Orders', 'Amount', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No invoices found</td></tr>
              ) : paged.map(inv => {
                const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.draft;
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 15 }}>#{inv.invoice_number || inv.id}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14 }}>{inv.client_name || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>
                      {inv.period_start ? `${inv.period_start} → ${inv.period_end}` : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600 }}>{inv.orders_count || 0}</td>
                    <td style={{ padding: '14px 20px', fontSize: 15, fontWeight: 700 }}>AED {parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <select value={inv.status} onChange={e => handleStatus(inv.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <button onClick={() => downloadPDF(inv)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#f97316', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                        ↓ PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > 1 && (
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid #f1f5f9' }}>
              {Array.from({ length: total }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', background: p === page ? '#f97316' : '#fff', color: p === page ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400 }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Generate Invoice</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleGenerate}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Client *</label>
                  <select required value={genForm.client_id} onChange={e => setGenForm(f => ({ ...f, client_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Period Start *</label>
                    <input required type="date" value={genForm.period_start} onChange={e => setGenForm(f => ({ ...f, period_start: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Period End *</label>
                    <input required type="date" value={genForm.period_end} onChange={e => setGenForm(f => ({ ...f, period_end: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Notes</label>
                  <textarea value={genForm.notes} onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowGenerate(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
