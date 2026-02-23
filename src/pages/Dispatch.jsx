import { useState, useEffect } from 'react';
import api from '../lib/api';

const ORDER_STATUS_COLORS = {
  pending:     { bg: '#fef3c7', color: '#d97706' },
  confirmed:   { bg: '#dbeafe', color: '#1d4ed8' },
  assigned:    { bg: '#ede9fe', color: '#7c3aed' },
};

export default function Dispatch() {
  const [board, setBoard] = useState({ unassigned: [], assigned: [], available_drivers: [] });
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    const res = await api.get('/dispatch');
    if (res.success) setBoard(res.data || { unassigned: [], assigned: [], available_drivers: [] });
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedDriver) return;
    setAssigning(selectedOrder);
    setError('');
    const res = await api.post('/dispatch/assign', { order_id: selectedOrder, driver_id: selectedDriver });
    if (res.success) {
      setSelectedOrder(null);
      setSelectedDriver('');
      fetchBoard();
    } else {
      setError(res.message || 'Assignment failed');
    }
    setAssigning(null);
  };

  const handleUnassign = async (orderId) => {
    if (!confirm('Unassign this driver from the order?')) return;
    await api.post('/dispatch/unassign', { order_id: orderId });
    fetchBoard();
  };

  const OrderCard = ({ order, showUnassign }) => {
    const sc = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending;
    return (
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `3px solid ${sc.color}`, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>#{order.id}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{order.recipient_name}</div>
          </div>
          <span style={{ ...sc, padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            {order.status}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
          <div>📍 {order.recipient_address}</div>
          {order.zone_name && <div>🗺️ {order.zone_name}</div>}
          {order.driver_name && <div>🚚 {order.driver_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!showUnassign && (
            <button onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: selectedOrder === order.id ? '#f97316' : '#f1f5f9', color: selectedOrder === order.id ? '#fff' : '#1e293b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {selectedOrder === order.id ? '✓ Selected' : 'Select'}
            </button>
          )}
          {showUnassign && (
            <button onClick={() => handleUnassign(order.id)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>
              Unassign
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Dispatch Board</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Assign drivers to orders in real time</p>
        </div>
        <button onClick={fetchBoard} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
          ↻ Refresh
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {/* Assignment panel */}
      {selectedOrder && (
        <div style={{ background: '#fff7ed', border: '2px solid #f97316', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#f97316' }}>Order #{selectedOrder} selected</span>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
            <option value="">Select Driver...</option>
            {board.available_drivers?.map(d => (
              <option key={d.id} value={d.id}>{d.full_name} — {d.vehicle_type} ({d.vehicle_plate})</option>
            ))}
          </select>
          <button onClick={handleAssign} disabled={!selectedDriver || assigning}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
          <button onClick={() => { setSelectedOrder(null); setSelectedDriver(''); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading board...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Unassigned */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Unassigned</h3>
              <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {board.unassigned?.length || 0}
              </span>
            </div>
            {board.unassigned?.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24, background: '#f8fafc', borderRadius: 10 }}>No orders</div>
            ) : (
              board.unassigned.map(order => <OrderCard key={order.id} order={order} showUnassign={false} />)
            )}
          </div>

          {/* Assigned / In Progress */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>In Progress</h3>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {board.assigned?.length || 0}
              </span>
            </div>
            {board.assigned?.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24, background: '#f8fafc', borderRadius: 10 }}>No orders</div>
            ) : (
              board.assigned.map(order => <OrderCard key={order.id} order={order} showUnassign={true} />)
            )}
          </div>

          {/* Available Drivers */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Available Drivers</h3>
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {board.available_drivers?.length || 0}
              </span>
            </div>
            {board.available_drivers?.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24, background: '#f8fafc', borderRadius: 10 }}>No drivers</div>
            ) : (
              board.available_drivers.map(driver => (
                <div key={driver.id} style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {driver.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{driver.full_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{driver.vehicle_type} · {driver.vehicle_plate}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
