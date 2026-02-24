import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, Search, Check, Xmark, Eye, Clock, Download,
  DeliveryTruck, User, Package, DollarCircle, Calendar,
  Wallet, RefreshDouble, WarningCircle
} from 'iconoir-react';
import { api } from '../lib/api';
import './CODReconciliation.css';

function formatCurrency(amount) {
  return `AED ${parseFloat(amount || 0).toFixed(2)}`;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CODReconciliation() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettleModal, setShowSettleModal] = useState(null);
  const [settling, setSettling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ payment_method: 'cod', limit: 500 });
      if (driverFilter) params.set('driver_id', driverFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const [ordersRes, driversRes] = await Promise.all([
        api.get(`/orders?${params}`),
        api.get('/drivers')
      ]);
      setOrders(ordersRes?.data || []);
      setDrivers(driversRes?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [driverFilter, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculate stats
  const stats = useMemo(() => {
    const s = {
      total_cod: 0, collected: 0, pending: 0, settled: 0,
      total_orders: orders.length, delivered_cod: 0
    };
    orders.forEach(o => {
      const amt = parseFloat(o.cod_amount || 0);
      s.total_cod += amt;
      if (o.status === 'delivered') {
        s.collected += amt;
        s.delivered_cod++;
      } else if (['pending','confirmed','assigned','picked_up','in_transit'].includes(o.status)) {
        s.pending += amt;
      }
    });
    s.settled = s.collected * 0; // settlements tracked separately
    return s;
  }, [orders]);

  // Driver COD aggregation
  const driverCOD = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!o.driver_id) return;
      if (!map[o.driver_id]) {
        map[o.driver_id] = {
          driver_id: o.driver_id,
          driver_name: o.driver_name || 'Unknown',
          driver_phone: o.driver_phone || '',
          total_collected: 0,
          total_pending: 0,
          order_count: 0,
          delivered_count: 0,
        };
      }
      const d = map[o.driver_id];
      const amt = parseFloat(o.cod_amount || 0);
      d.order_count++;
      if (o.status === 'delivered') {
        d.total_collected += amt;
        d.delivered_count++;
      } else if (['assigned','picked_up','in_transit'].includes(o.status)) {
        d.total_pending += amt;
      }
    });
    return Object.values(map).sort((a, b) => b.total_collected - a.total_collected);
  }, [orders]);

  // Filtered orders for table view
  const filtered = useMemo(() => {
    let list = orders;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o =>
        o.order_number?.toLowerCase().includes(s) ||
        o.recipient_name?.toLowerCase().includes(s) ||
        o.driver_name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [orders, search]);

  const handleSettle = async (driverId) => {
    setSettling(true);
    try {
      await api.post('/cod/settle', { driver_id: driverId });
      setShowSettleModal(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setSettling(false); }
  };

  const exportCSV = () => {
    const headers = ['Order #','Recipient','Driver','COD Amount','Status','Date'];
    const rows = filtered.map(o => [
      o.order_number, o.recipient_name, o.driver_name || 'Unassigned',
      parseFloat(o.cod_amount || 0).toFixed(2), o.status,
      o.created_at ? new Date(o.created_at).toLocaleDateString() : ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cod_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: 'TOTAL COD', value: formatCurrency(stats.total_cod), color: 'primary', bg: '#fff7ed', iconColor: '#f97316', icon: CreditCard },
    { label: 'COLLECTED', value: formatCurrency(stats.collected), color: 'success', bg: '#dcfce7', iconColor: '#16a34a', icon: Check },
    { label: 'PENDING', value: formatCurrency(stats.pending), color: 'warning', bg: '#fef3c7', iconColor: '#d97706', icon: Clock },
    { label: 'COD ORDERS', value: stats.total_orders, color: 'info', bg: '#eff6ff', iconColor: '#2563eb', icon: Package },
  ];

  return (
    <div className="cod-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="module-hero-left">
          <div className="module-hero-icon"><CreditCard size={26} /></div>
          <div>
            <h1 className="module-hero-title">COD Reconciliation</h1>
            <p className="module-hero-sub">Track cash collections, driver settlements, and COD payments</p>
          </div>
        </div>
        <div className="module-hero-actions">
          <button className="module-btn module-btn-outline" onClick={exportCSV}>
            <Download size={16} /> Export Report
          </button>
          <button className="module-btn module-btn-outline" onClick={loadData}>
            <RefreshDouble size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cod-stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className={`cod-stat-card ${s.color}`}>
            <div className="cod-stat-card-row">
              <div className="cod-stat-icon" style={{ background: s.bg }}>
                <s.icon size={22} color={s.iconColor} />
              </div>
              <div className="cod-stat-body">
                <span className="cod-stat-val">{s.value}</span>
                <span className="cod-stat-lbl">{s.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="cod-tabs">
        {[
          { key: 'overview', label: 'Driver Overview' },
          { key: 'orders', label: 'COD Orders' },
        ].map(t => (
          <button key={t.key} className={`cod-tab ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="cod-filters">
        <div className="cod-search-wrap">
          <Search size={16} className="cod-search-icon" />
          <input className="cod-search-input" placeholder="Search orders or drivers..."
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="cod-filter-select" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
          <option value="">All Drivers</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <input type="date" className="cod-date-input" value={dateFrom}
               onChange={e => setDateFrom(e.target.value)} placeholder="From" />
        <input type="date" className="cod-date-input" value={dateTo}
               onChange={e => setDateTo(e.target.value)} placeholder="To" />
      </div>

      {loading ? <div className="cod-spinner" /> : (
        <>
          {/* Tab: Driver Overview */}
          {activeTab === 'overview' && (
            driverCOD.length === 0 ? (
              <div className="cod-empty">
                <div className="cod-empty-icon"><DeliveryTruck size={28} /></div>
                <h3>No COD Data</h3>
                <p>No drivers with COD collections found</p>
              </div>
            ) : (
              <div className="cod-driver-grid">
                {driverCOD.map(d => {
                  const balance = d.total_collected;
                  const topClass = balance > 0 ? 'owe' : d.total_pending > 0 ? 'partial' : 'clear';
                  return (
                    <div key={d.driver_id} className="cod-driver-card">
                      <div className={`cod-driver-card-top ${topClass}`} />
                      <div className="cod-driver-card-body">
                        <div className="cod-driver-header">
                          <div className="cod-driver-avatar">
                            {d.driver_name?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <div className="cod-driver-name">{d.driver_name}</div>
                            <div className="cod-driver-phone">{d.driver_phone || 'No phone'}</div>
                          </div>
                        </div>
                        <div className="cod-driver-stats">
                          <div className="cod-driver-stat">
                            <div className="cod-driver-stat-label">COLLECTED</div>
                            <div className="cod-driver-stat-value" style={{ color: '#16a34a' }}>
                              {formatCurrency(d.total_collected)}
                            </div>
                          </div>
                          <div className="cod-driver-stat">
                            <div className="cod-driver-stat-label">PENDING</div>
                            <div className="cod-driver-stat-value" style={{ color: '#d97706' }}>
                              {formatCurrency(d.total_pending)}
                            </div>
                          </div>
                          <div className="cod-driver-stat">
                            <div className="cod-driver-stat-label">ORDERS</div>
                            <div className="cod-driver-stat-value">{d.order_count}</div>
                          </div>
                          <div className="cod-driver-stat">
                            <div className="cod-driver-stat-label">DELIVERED</div>
                            <div className="cod-driver-stat-value">{d.delivered_count}</div>
                          </div>
                        </div>
                        <div className="cod-driver-actions">
                          <button className="cod-driver-btn" onClick={() => { setDriverFilter(String(d.driver_id)); setActiveTab('orders'); }}>
                            <Eye size={14} /> View Orders
                          </button>
                          {d.total_collected > 0 && (
                            <button className="cod-driver-btn settle" onClick={() => setShowSettleModal(d)}>
                              <Check size={14} /> Settle
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Tab: COD Orders */}
          {activeTab === 'orders' && (
            filtered.length === 0 ? (
              <div className="cod-empty">
                <div className="cod-empty-icon"><Package size={28} /></div>
                <h3>No COD Orders</h3>
                <p>No cash-on-delivery orders match your filters</p>
              </div>
            ) : (
              <div className="cod-table-wrap">
                <table className="cod-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Recipient</th>
                      <th>Driver</th>
                      <th>COD Amount</th>
                      <th>Delivery Fee</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr key={order.id}>
                        <td style={{ fontWeight: 700, color: '#f97316', fontFamily: 'monospace' }}>
                          {order.order_number}
                        </td>
                        <td style={{ fontWeight: 600 }}>{order.recipient_name}</td>
                        <td style={{ color: order.driver_name ? '#1e293b' : '#94a3b8' }}>
                          {order.driver_name || 'Unassigned'}
                        </td>
                        <td>
                          <span className={`cod-amount ${order.status === 'delivered' ? 'collected' : 'pending'}`}>
                            {formatCurrency(order.cod_amount)}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{formatCurrency(order.delivery_fee)}</td>
                        <td>
                          <span className={`cod-settlement-status ${order.status === 'delivered' ? 'collected' : 'pending'}`}>
                            <span className="cod-settlement-dot" />
                            {order.status === 'delivered' ? 'Collected' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatDateTime(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="cod-modal-overlay" onClick={() => setShowSettleModal(null)}>
          <div className="cod-modal" onClick={e => e.stopPropagation()}>
            <div className="cod-modal-header">
              <h3><Wallet size={18} /> Settle COD — {showSettleModal.driver_name}</h3>
              <button className="cod-modal-close" onClick={() => setShowSettleModal(null)}><Xmark size={16} /></button>
            </div>
            <div className="cod-modal-body">
              <div className="cod-summary-row">
                <span className="cod-summary-label">Total Collected</span>
                <span className="cod-summary-value" style={{ color: '#16a34a' }}>
                  {formatCurrency(showSettleModal.total_collected)}
                </span>
              </div>
              <div className="cod-summary-row">
                <span className="cod-summary-label">Delivered Orders</span>
                <span className="cod-summary-value">{showSettleModal.delivered_count}</span>
              </div>
              <div className="cod-summary-row" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <span className="cod-summary-label" style={{ fontWeight: 700, color: '#1e293b' }}>Amount to Settle</span>
                <span className="cod-summary-value" style={{ color: '#f97316', fontSize: 22 }}>
                  {formatCurrency(showSettleModal.total_collected)}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                This will mark all collected COD amounts for {showSettleModal.driver_name} as settled.
              </p>
            </div>
            <div className="cod-modal-footer">
              <button className="cod-btn-secondary" onClick={() => setShowSettleModal(null)}>Cancel</button>
              <button className="cod-btn-success" onClick={() => handleSettle(showSettleModal.driver_id)} disabled={settling}>
                {settling ? 'Settling...' : <><Check size={14} /> Confirm Settlement</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
