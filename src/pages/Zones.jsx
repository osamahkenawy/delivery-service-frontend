import { useState, useEffect } from 'react';
import api from '../lib/api';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [emirateFilter, setEmirateFilter] = useState('');
  const [form, setForm] = useState({ name: '', city: '', emirate: 'Dubai', base_delivery_fee: '', extra_km_fee: '', max_weight_kg: '', estimated_minutes: '', is_active: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setLoading(true);
    const res = await api.get('/zones');
    if (res.success) setZones(res.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = selected ? await api.put(`/zones/${selected.id}`, form) : await api.post('/zones', form);
    if (res.success) { setShowForm(false); setSelected(null); resetForm(); fetchZones(); }
    else setError(res.message || 'Failed to save');
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone?')) return;
    await api.delete(`/zones/${id}`);
    fetchZones();
  };

  const resetForm = () => setForm({ name: '', city: '', emirate: 'Dubai', base_delivery_fee: '', extra_km_fee: '', max_weight_kg: '', estimated_minutes: '', is_active: true });
  const openEdit = (z) => { setSelected(z); setForm({ ...z }); setShowForm(true); };

  const filtered = zones.filter(z => !emirateFilter || z.emirate === emirateFilter);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Delivery Zones</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{zones.length} zones configured</p>
        </div>
        <button onClick={() => { resetForm(); setSelected(null); setShowForm(true); }}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Add Zone
        </button>
      </div>

      {/* Emirates filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setEmirateFilter('')}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: !emirateFilter ? '#f97316' : '#f1f5f9', color: !emirateFilter ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          All
        </button>
        {EMIRATES.map(em => (
          <button key={em} onClick={() => setEmirateFilter(em)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: emirateFilter === em ? '#f97316' : '#f1f5f9', color: emirateFilter === em ? '#fff' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {em} ({zones.filter(z => z.emirate === em).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(zone => (
            <div key={zone.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `3px solid ${zone.is_active ? '#f97316' : '#cbd5e1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{zone.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{zone.city}, {zone.emirate}</div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: zone.is_active ? '#dcfce7' : '#f1f5f9', color: zone.is_active ? '#16a34a' : '#64748b' }}>
                  {zone.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Base Fee', value: `AED ${zone.base_delivery_fee || 0}` },
                  { label: 'Extra/km', value: zone.extra_km_fee ? `AED ${zone.extra_km_fee}` : '—' },
                  { label: 'Max Weight', value: zone.max_weight_kg ? `${zone.max_weight_kg} kg` : '—' },
                  { label: 'Est. Time', value: zone.estimated_minutes ? `${zone.estimated_minutes} min` : '—' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(zone)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Edit</button>
                <button onClick={() => handleDelete(zone.id)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{selected ? 'Edit Zone' : 'Add Zone'}</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { field: 'name', label: 'Zone Name', required: true, full: true },
                  { field: 'city', label: 'City', required: true },
                  { field: 'base_delivery_fee', label: 'Base Fee (AED)', type: 'number', required: true },
                  { field: 'extra_km_fee', label: 'Extra Fee/km (AED)', type: 'number' },
                  { field: 'max_weight_kg', label: 'Max Weight (kg)', type: 'number' },
                  { field: 'estimated_minutes', label: 'Est. Minutes', type: 'number' },
                ].map(({ field, label, required, type, full }) => (
                  <div key={field} style={full ? { gridColumn: '1 / -1' } : {}}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}{required && ' *'}</label>
                    <input required={required} type={type || 'text'} value={form[field] || ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emirate *</label>
                  <select required value={form.emirate} onChange={e => setForm(f => ({ ...f, emirate: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <label htmlFor="is_active" style={{ fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Active</label>
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
