import { useState, useEffect } from 'react';
import api from '../lib/api';

const STATUS_COLORS = {
  available:   { bg: '#dcfce7', color: '#16a34a' },
  busy:        { bg: '#fce7f3', color: '#be185d' },
  offline:     { bg: '#f1f5f9', color: '#64748b' },
  on_break:    { bg: '#fef3c7', color: '#d97706' },
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', national_id: '',
    vehicle_type: 'motorcycle', vehicle_plate: '', vehicle_model: '',
    license_number: '', password: '', status: 'available',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const res = await api.get('/drivers');
    if (res.success) setDrivers(res.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = selected
      ? await api.put(`/drivers/${selected.id}`, form)
      : await api.post('/drivers', form);
    if (res.success) {
      setShowForm(false);
      setSelected(null);
      resetForm();
      fetchDrivers();
    } else {
      setError(res.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    await api.patch(`/drivers/${id}/status`, { status });
    fetchDrivers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this driver?')) return;
    await api.delete(`/drivers/${id}`);
    fetchDrivers();
  };

  const resetForm = () => setForm({
    full_name: '', phone: '', email: '', national_id: '',
    vehicle_type: 'motorcycle', vehicle_plate: '', vehicle_model: '',
    license_number: '', password: '', status: 'available',
  });

  const openEdit = (d) => {
    setSelected(d);
    setForm({ ...d, password: '' });
    setShowForm(true);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Drivers</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{drivers.length} registered drivers</p>
        </div>
        <button onClick={() => { resetForm(); setSelected(null); setShowForm(true); }}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Add Driver
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {Object.entries(STATUS_COLORS).map(([status, sc]) => (
          <div key={status} style={{ background: sc.bg, color: sc.color, padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            {drivers.filter(d => d.status === status).length} {status.replace('_', ' ')}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {drivers.map(driver => {
            const sc = STATUS_COLORS[driver.status] || STATUS_COLORS.offline;
            return (
              <div key={driver.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>
                      {driver.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{driver.full_name}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{driver.phone}</div>
                    </div>
                  </div>
                  <select
                    value={driver.status}
                    onChange={e => handleStatus(driver.id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: 'none', background: sc.bg, color: sc.color, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {Object.keys(STATUS_COLORS).map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  <div>🚗 {driver.vehicle_type} — {driver.vehicle_plate || 'N/A'}</div>
                  {driver.vehicle_model && <div>📋 {driver.vehicle_model}</div>}
                  {driver.rating && <div>⭐ {parseFloat(driver.rating).toFixed(1)} rating</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Total', value: driver.total_orders || 0 },
                    { label: 'Today', value: driver.orders_today || 0 },
                    { label: 'Success', value: driver.total_orders > 0 ? `${Math.round((driver.delivered_orders / driver.total_orders) * 100)}%` : '—' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(driver)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(driver.id)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>
              {selected ? 'Edit Driver' : 'Add Driver'}
            </h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { field: 'full_name', label: 'Full Name', required: true },
                  { field: 'phone', label: 'Phone', required: true },
                  { field: 'email', label: 'Email', type: 'email' },
                  { field: 'national_id', label: 'National ID' },
                  { field: 'vehicle_plate', label: 'Vehicle Plate' },
                  { field: 'vehicle_model', label: 'Vehicle Model' },
                  { field: 'license_number', label: 'License Number' },
                  ...(selected ? [] : [{ field: 'password', label: 'Password', type: 'password', required: true }]),
                ].map(({ field, label, required, type }) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}{required && ' *'}</label>
                    <input required={required} type={type || 'text'} value={form[field] || ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Vehicle Type</label>
                  <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {['motorcycle', 'car', 'van', 'truck', 'bicycle'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setSelected(null); }}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Saving...' : (selected ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
