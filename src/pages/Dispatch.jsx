import { useState, useEffect } from 'react';
import {
  Package, DeliveryTruck, MapPin, Refresh, Check, Xmark, WarningTriangle
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

const STATUS_STYLE = {
  pending:   { background: '#fef3c7', color: '#d97706' },
  confirmed: { background: '#dbeafe', color: '#1d4ed8' },
  assigned:  { background: '#ede9fe', color: '#7c3aed' },
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
    try {
      setLoading(true);
      const res = await api.get('/dispatch');
      if (res.success) {
        setBoard(res.data || { unassigned: [], assigned: [], available_drivers: [] });
      }
    } catch (e) {
      console.error('Dispatch fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedDriver) return;
    setAssigning(selectedOrder);
    setError('');
    try {
      const res = await api.post('/dispatch/assign', { order_id: selectedOrder, driver_id: selectedDriver });
      if (res.success) {
        setSelectedOrder(null);
        setSelectedDriver('');
        fetchBoard();
      } else {
        setError(res.message || 'Assignment failed');
      }
    } catch {
      setError('Failed to assign. Please try again.');
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassign = async (orderId) => {
    if (!window.confirm('Unassign this driver?')) return;
    try {
      await api.post('/dispatch/unassign', { order_id: orderId });
      fetchBoard();
    } catch { /* ignore */ }
  };

  const OrderCard = ({ order, showUnassign }) => {
    const sc = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
    const isSelected = selectedOrder === order.id;
    return (
      <div className="dispatch-card">
        <div className="dispatch-card-header">
          <div>
            <div className="dispatch-order-id">#{order.id}</div>
            <div className="dispatch-recipient">{order.recipient_name}</div>
          </div>
          <span className="status-badge" style={sc}>{order.status}</span>
        </div>
        <div className="dispatch-meta">
          <span><MapPin width={13} height={13} /> {order.recipient_address}</span>
          {order.zone_name && <span><MapPin width={13} height={13} /> {order.zone_name}</span>}
          {order.driver_name && <span><DeliveryTruck width={13} height={13} /> {order.driver_name}</span>}
        </div>
        <div className="dispatch-actions">
          {!showUnassign && (
            <button
              className={`btn-sm ${isSelected ? 'btn-sm-primary' : 'btn-sm-outline'}`}
              onClick={() => setSelectedOrder(isSelected ? null : order.id)}
            >
              {isSelected ? <><Check width={14} height={14} /> Selected</> : 'Select'}
            </button>
          )}
          {showUnassign && (
            <button className="btn-sm btn-sm-danger" onClick={() => handleUnassign(order.id)}>
              <Xmark width={14} height={14} /> Unassign
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Dispatch Board</h2>
          <p className="page-subheading">Assign drivers to orders in real time</p>
        </div>
        <button className="btn-outline-action" onClick={fetchBoard}>
          <Refresh width={16} height={16} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <WarningTriangle width={16} height={16} /> {error}
        </div>
      )}

      {/* Assignment Panel */}
      {selectedOrder && (
        <div className="assign-panel">
          <div className="assign-panel-label">
            <Package width={16} height={16} />
            Order <strong>#{selectedOrder}</strong> selected
          </div>
          <select
            className="assign-select"
            value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}
          >
            <option value="">Select Driver...</option>
            {board.available_drivers?.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name} &mdash; {d.vehicle_type} ({d.vehicle_plate})
              </option>
            ))}
          </select>
          <button
            className="btn-primary-action"
            onClick={handleAssign}
            disabled={!selectedDriver || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign Driver'}
          </button>
          <button
            className="btn-outline-action"
            onClick={() => { setSelectedOrder(null); setSelectedDriver(''); }}
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-rows">
          {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : (
        <div className="dispatch-board">
          {/* Unassigned */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#f59e0b' }} />
              <h3>Unassigned</h3>
              <span className="col-count amber">{board.unassigned?.length || 0}</span>
            </div>
            {board.unassigned?.length === 0
              ? <div className="empty-col">No pending orders</div>
              : board.unassigned.map(o => <OrderCard key={o.id} order={o} showUnassign={false} />)
            }
          </div>

          {/* In Progress */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#3b82f6' }} />
              <h3>In Progress</h3>
              <span className="col-count blue">{board.assigned?.length || 0}</span>
            </div>
            {board.assigned?.length === 0
              ? <div className="empty-col">No active orders</div>
              : board.assigned.map(o => <OrderCard key={o.id} order={o} showUnassign={true} />)
            }
          </div>

          {/* Available Drivers */}
          <div className="dispatch-col">
            <div className="dispatch-col-header">
              <div className="col-dot" style={{ background: '#22c55e' }} />
              <h3>Available Drivers</h3>
              <span className="col-count green">{board.available_drivers?.length || 0}</span>
            </div>
            {board.available_drivers?.length === 0
              ? <div className="empty-col">No available drivers</div>
              : board.available_drivers.map(driver => (
                <div key={driver.id} className="driver-card">
                  <div className="driver-avatar">
                    {driver.full_name?.charAt(0)}
                  </div>
                  <div className="driver-info">
                    <div className="driver-name">{driver.full_name}</div>
                    <div className="driver-meta">{driver.vehicle_type} &bull; {driver.vehicle_plate}</div>
                  </div>
                  <span className="status-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>Online</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
