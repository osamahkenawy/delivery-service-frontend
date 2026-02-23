import { useState, useEffect } from 'react';
import api from '../lib/api';

const TYPE_COLORS = {
  ecommerce:  { bg: '#dbeafe', color: '#1d4ed8' },
  restaurant: { bg: '#dcfce7', color: '#16a34a' },
  corporate:  { bg: '#ede9fe', color: '#7c3aed' },
  individual: { bg: '#fef3c7', color: '#d97706' },
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ name: '', type: 'ecommerce', phone: '', email: '', address: '', contact_person: '', credit_limit: '', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    setLoading(true);
    const res = await api.get('/clients');
    if (res.success) setClients(res.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = selected
      ? await api.put(`/clients/${selected.id}`, form)
      : await api.post('/clients', form);
    if (res.success) {
      setShowForm(false); setSelected(null); resetForm(); fetchClients();
    } else {
      setError(res.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    await api.delete(`/clients/${id}`);
    fetchClients();
  };

  const resetForm = () => setForm({ name: '', type: 'ecommerce', phone: '', email: '', address: '', contact_person: '', credit_limit: '', notes: '' });

  const openEdit = (c) => { setSelected(c); setForm({ ...c }); setShowForm(true); };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
    const matchT = !typeFilter || c.type === typeFilter;
    return matchQ && matchT;
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Clients</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{clients.length} registered clients</p>
        </div>
        <button onClick={() => { resetForm(); setSelected(null); setShowForm(true); }}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Add Client
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
          <option value="">All Types</option>
          {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_COLORS).map(([type, sc]) => (
          <div key={type} style={{ background: sc.bg, color: sc.color, padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            {clients.filter(c => c.type === type).length} {type}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Client', 'Type', 'Phone', 'Email', 'Contact Person', 'Orders', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No clients found</td></tr>
              ) : filtered.map(client => {
                const sc = TYPE_COLORS[client.type] || TYPE_COLORS.individual;
                return (
                  <tr key={client.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{client.name}</div>
                      {client.address && <div style={{ fontSize: 12, color: '#94a3b8' }}>{client.address}</div>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ ...sc, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{client.type}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569' }}>{client.phone || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569' }}>{client.email || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569' }}>{client.contact_person || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600 }}>{client.total_orders || 0}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(client)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Edit</button>
                        <button onClick={() => handleDelete(client.id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{selected ? 'Edit Client' : 'Add Client'}</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { field: 'name', label: 'Client Name', required: true, full: true },
                  { field: 'phone', label: 'Phone' },
                  { field: 'email', label: 'Email', type: 'email' },
                  { field: 'contact_person', label: 'Contact Person' },
                  { field: 'credit_limit', label: 'Credit Limit (AED)', type: 'number' },
                ].map(({ field, label, required, type, full }) => (
                  <div key={field} style={full ? { gridColumn: '1 / -1' } : {}}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}{required && ' *'}</label>
                    <input required={required} type={type || 'text'} value={form[field] || ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Address</label>
                  <input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Notes</label>
                  <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setSelected(null); }}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Saving...' : selected ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
