import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import api from '../lib/api';

const STATUS_COLORS = {
  pending:    { bg: '#fef3c7', color: '#d97706' },
  confirmed:  { bg: '#dbeafe', color: '#2563eb' },
  assigned:   { bg: '#e0f2fe', color: '#0369a1' },
  picked_up:  { bg: '#f3e8ff', color: '#7c3aed' },
  in_transit: { bg: '#fce7f3', color: '#be185d' },
  delivered:  { bg: '#dcfce7', color: '#16a34a' },
  failed:     { bg: '#fee2e2', color: '#dc2626' },
  returned:   { bg: '#fff7ed', color: '#ea580c' },
  cancelled:  { bg: '#f1f5f9', color: '#64748b' },
};

const ORDER_TYPES = ['standard', 'express', 'same_day', 'scheduled', 'cod', 'return'];

export default function Orders() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({ status: '', search: '', date_from: '', date_to: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({
    client_id: '', zone_id: '', order_type: 'standard', payment_method: 'cash',
    recipient_name: '', recipient_phone: '', recipient_address: '', recipient_emirate: 'Dubai',
    cod_amount: '', weight_kg: '', notes: '',
  });
  const [zones, setZones] = useState([]);
  const [clients, setClients] = useState([]);
  const [savingStatus, setSavingStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchZones();
    fetchClients();
  }, [pagination.page, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const res = await api.get(`/orders?${params}`);
      if (res.success) {
        setOrders(res.data || []);
        setPagination(p => ({ ...p, total: res.pagination?.total || 0 }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchZones = async () => {
    const res = await api.get('/zones');
    if (res.success) setZones(res.data || []);
  };

  const fetchClients = async () => {
    const res = await api.get('/clients?limit=100');
    if (res.success) setClients(res.data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSavingStatus('Saving...');
    try {
      const res = selectedOrder
        ? await api.put(`/orders/${selectedOrder.id}`, form)
        : await api.post('/orders', form);
      if (res.success) {
        setSavingStatus('Saved!');
        setShowForm(false);
        setSelectedOrder(null);
        resetForm();
        fetchOrders();
      } else {
        setError(res.message || 'Failed to save order');
        setSavingStatus('');
      }
    } catch (e) {
      setError('Network error');
      setSavingStatus('');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    await api.patch(`/orders/${orderId}/status`, { status: newStatus });
    fetchOrders();
  };

  const resetForm = () => {
    setForm({
      client_id: '', zone_id: '', order_type: 'standard', payment_method: 'cash',
      recipient_name: '', recipient_phone: '', recipient_address: '', recipient_emirate: 'Dubai',
      cod_amount: '', weight_kg: '', notes: '',
    });
  };

  const openEdit = (order) => {
    setSelectedOrder(order);
    setForm({
      client_id: order.client_id || '',
      zone_id: order.zone_id || '',
      order_type: order.order_type || 'standard',
      payment_method: order.payment_method || 'cash',
      recipient_name: order.recipient_name || '',
      recipient_phone: order.recipient_phone || '',
      recipient_address: order.recipient_address || '',
      recipient_emirate: order.recipient_emirate || 'Dubai',
      cod_amount: order.cod_amount || '',
      weight_kg: order.weight_kg || '',
      notes: order.notes || '',
    });
    setShowForm(true);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Orders</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Manage all delivery orders</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { resetForm(); setSelectedOrder(null); setShowForm(true); }}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
        >
          + New Order
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search order #, recipient..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 200, fontSize: 14 }}
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
        >
          <option value="">All Status</option>
          {Object.keys(STATUS_COLORS).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
        />
        <button
          onClick={() => setFilters({ status: '', search: '', date_from: '', date_to: '' })}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14 }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No orders found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                {['Order #', 'Tracking', 'Recipient', 'Zone', 'Type', 'Status', 'Fee', 'Driver', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{order.order_number}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{order.tracking_token}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{order.recipient_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{order.recipient_phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>{order.zone_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>{order.order_type}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={order.status}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: 'none', background: sc.bg, color: sc.color, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {Object.keys(STATUS_COLORS).map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>
                      {order.delivery_fee ? `AED ${parseFloat(order.delivery_fee).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{order.driver_name || 'Unassigned'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => openEdit(order)}
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
                background: pagination.page === p ? '#f97316' : '#fff',
                color: pagination.page === p ? '#fff' : '#374151',
                cursor: 'pointer', fontWeight: pagination.page === p ? 600 : 400
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>
              {selectedOrder ? 'Edit Order' : 'New Order'}
            </h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Client</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Zone *</label>
                  <select required value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    <option value="">Select zone...</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Recipient Name *</label>
                  <input required type="text" value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Recipient Phone *</label>
                  <input required type="text" value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Recipient Address *</label>
                  <input required type="text" value={form.recipient_address} onChange={e => setForm(f => ({ ...f, recipient_address: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Emirate</label>
                  <select value={form.recipient_emirate} onChange={e => setForm(f => ({ ...f, recipient_emirate: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'].map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Order Type</label>
                  <select value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {ORDER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    <option value="cash">Cash</option>
                    <option value="cod">COD</option>
                    <option value="card">Card</option>
                    <option value="wallet">Wallet</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>COD Amount (AED)</label>
                  <input type="number" value={form.cod_amount} onChange={e => setForm(f => ({ ...f, cod_amount: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Weight (kg)</label>
                  <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setSelectedOrder(null); }} 
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {savingStatus || (selectedOrder ? 'Update Order' : 'Create Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
