import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StatsUpSquare, DeliveryTruck, Clock, Medal, StarSolid,
  Timer, Check, Xmark, StatUp, StatDown,
  Refresh, MapPin
} from 'iconoir-react';
import api from '../lib/api';
import './Performance.css';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom Range' },
];

const SLA_TARGET_HOURS = 24;

function SLARing({ percent, color, size = 100, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="perf-sla-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="#f1f5f9" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="perf-sla-ring-text">{percent}%</span>
    </div>
  );
}

function RatingStars({ rating }) {
  return (
    <span className="perf-rating">
      {[1,2,3,4,5].map(s => (
        <StarSolid key={s} width={14} height={14}
          className={`perf-rating-star ${s <= Math.round(rating) ? '' : 'empty'}`} />
      ))}
      <span className="perf-rating-value">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function Performance() {
  const [orders, setOrders]   = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch drivers (usually small dataset — one page is fine)
      const drvRes = await api.get('/drivers?limit=500');
      setDrivers(drvRes.drivers || drvRes || []);

      // Fetch ALL orders by walking pages (pagination caps at 100/page)
      const PAGE_SIZE = 100;
      let allOrders = [];
      let page = 1;
      while (true) {
        const res = await api.get(`/orders?limit=${PAGE_SIZE}&page=${page}`);
        const batch = res.orders || (Array.isArray(res) ? res : []);
        allOrders = allOrders.concat(batch);
        if (batch.length < PAGE_SIZE) break;   // last page reached
        page++;
        if (page > 100) break;                 // safety cap: max 10 000 orders
      }
      setOrders(allOrders);
    } catch (e) {
      console.error('Performance load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── period filtering ── */
  const filtered = useMemo(() => {
    const now = new Date();
    return (Array.isArray(orders) ? orders : []).filter(o => {
      const created = new Date(o.created_at);
      if (period === 'today') {
        return created.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const wstart = new Date(now); wstart.setDate(now.getDate() - now.getDay());
        wstart.setHours(0,0,0,0);
        return created >= wstart;
      }
      if (period === 'month') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const qstart = new Date(now.getFullYear(), q * 3, 1);
        return created >= qstart;
      }
      if (period === 'custom') {
        if (dateFrom && created < new Date(dateFrom)) return false;
        if (dateTo && created > new Date(dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [orders, period, dateFrom, dateTo]);

  /* ── KPI calculations ── */
  const kpis = useMemo(() => {
    const total = filtered.length;
    const delivered = filtered.filter(o => o.status === 'delivered');
    const failed = filtered.filter(o => o.status === 'failed' || o.status === 'returned');
    const inTransit = filtered.filter(o => o.status === 'in_transit');
    const pending = filtered.filter(o => o.status === 'pending' || o.status === 'assigned');

    // On-time delivery: delivered within SLA_TARGET_HOURS of creation
    let onTime = 0;
    delivered.forEach(o => {
      const created = new Date(o.created_at);
      const deliveredAt = new Date(o.delivered_at || o.updated_at);
      const hours = (deliveredAt - created) / (1000 * 60 * 60);
      if (hours <= SLA_TARGET_HOURS) onTime++;
    });
    const onTimePct = delivered.length ? Math.round((onTime / delivered.length) * 100) : 0;

    // Average delivery time
    let totalHours = 0;
    delivered.forEach(o => {
      const created = new Date(o.created_at);
      const deliveredAt = new Date(o.delivered_at || o.updated_at);
      totalHours += (deliveredAt - created) / (1000 * 60 * 60);
    });
    const avgDeliveryHours = delivered.length ? (totalHours / delivered.length) : 0;

    // First-attempt success rate: delivered / (delivered + failed)
    const firstAttemptTotal = delivered.length + failed.length;
    const firstAttemptPct = firstAttemptTotal ? Math.round((delivered.length / firstAttemptTotal) * 100) : 0;

    // Delivery rate
    const deliveryRate = total ? Math.round((delivered.length / total) * 100) : 0;

    return {
      total, delivered: delivered.length, failed: failed.length,
      inTransit: inTransit.length, pending: pending.length,
      onTimePct, avgDeliveryHours, firstAttemptPct, deliveryRate,
    };
  }, [filtered]);

  /* ── driver performance ── */
  const driverPerf = useMemo(() => {
    const map = {};
    filtered.forEach(o => {
      if (!o.driver_id) return;
      if (!map[o.driver_id]) {
        map[o.driver_id] = {
          driver_id: o.driver_id,
          name: o.driver_name || `Driver #${o.driver_id}`,
          phone: o.driver_phone || '',
          total: 0, delivered: 0, failed: 0, returned: 0,
          totalHours: 0, onTime: 0, cod_collected: 0,
        };
      }
      const d = map[o.driver_id];
      d.total++;
      if (o.status === 'delivered') {
        d.delivered++;
        const created = new Date(o.created_at);
        const deliveredAt = new Date(o.delivered_at || o.updated_at);
        const hours = (deliveredAt - created) / (1000 * 60 * 60);
        d.totalHours += hours;
        if (hours <= SLA_TARGET_HOURS) d.onTime++;
      }
      if (o.status === 'failed') d.failed++;
      if (o.status === 'returned') d.returned++;
      if (o.payment_method === 'cod' && o.cod_collected) d.cod_collected += Number(o.cod_amount || 0);
    });

    return Object.values(map)
      .map(d => ({
        ...d,
        successRate: d.total ? Math.round((d.delivered / d.total) * 100) : 0,
        avgHours: d.delivered ? (d.totalHours / d.delivered) : 0,
        onTimePct: d.delivered ? Math.round((d.onTime / d.delivered) * 100) : 0,
        rating: 3 + (d.total ? Math.min((d.delivered / d.total) * 2, 2) : 0), // simulated rating
      }))
      .sort((a, b) => b.successRate - a.successRate || b.delivered - a.delivered);
  }, [filtered]);

  const gradeClass = (pct) => pct >= 85 ? 'excellent' : pct >= 60 ? 'good' : 'poor';
  const gradeLabel = (pct) => pct >= 85 ? 'Excellent' : pct >= 60 ? 'Good' : 'Needs Improvement';
  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

  const formatHours = (h) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h/24).toFixed(1)}d`;
  };

  if (loading) return <div className="perf-page"><div className="perf-spinner" /></div>;

  return (
    <div className="perf-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="hero-content">
          <h1 className="hero-title">Performance & SLA</h1>
          <p className="hero-subtitle">
            Delivery metrics, SLA compliance, and driver scorecards
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={load} className="hero-btn secondary">
            <Refresh width={16} height={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="perf-filters">
        <select className="perf-filter-select" value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {period === 'custom' && (
          <>
            <input type="date" className="perf-date-input" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: '#94a3b8' }}>to</span>
            <input type="date" className="perf-date-input" value={dateTo}
              onChange={e => setDateTo(e.target.value)} />
          </>
        )}
      </div>

      {/* Stat Cards */}
      <div className="perf-stats-grid">
        <div className="perf-stat-card primary">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
              <StatsUpSquare width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{kpis.total}</span>
              <span className="perf-stat-lbl">Total Shipments</span>
            </div>
          </div>
        </div>
        <div className="perf-stat-card success">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Check width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{kpis.deliveryRate}%</span>
              <span className="perf-stat-lbl">Delivery Rate</span>
              <div className={`perf-stat-change ${kpis.deliveryRate >= 80 ? 'up' : 'down'}`}>
                {kpis.deliveryRate >= 80 ? <StatUp width={12} height={12} /> : <StatDown width={12} height={12} />}
                {kpis.delivered} delivered
              </div>
            </div>
          </div>
        </div>
        <div className="perf-stat-card info">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#ede9fe', color: '#667eea' }}>
              <Timer width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{formatHours(kpis.avgDeliveryHours)}</span>
              <span className="perf-stat-lbl">Avg Delivery Time</span>
            </div>
          </div>
        </div>
        <div className="perf-stat-card warning">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Clock width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{kpis.onTimePct}%</span>
              <span className="perf-stat-lbl">On-Time ({SLA_TARGET_HOURS}h SLA)</span>
            </div>
          </div>
        </div>
        <div className="perf-stat-card danger">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <Xmark width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{kpis.failed}</span>
              <span className="perf-stat-lbl">Failed / Returned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="perf-tabs">
        {[
          { key: 'overview', label: 'SLA Overview', Icon: StatsUpSquare },
          { key: 'drivers', label: 'Driver Scorecards', Icon: DeliveryTruck },
        ].map(t => (
          <button key={t.key} className={`perf-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            <t.Icon width={15} height={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* SLA Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="perf-sla-grid">
            <div className="perf-sla-card">
              <SLARing percent={kpis.onTimePct}
                color={kpis.onTimePct >= 85 ? '#16a34a' : kpis.onTimePct >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">On-Time Delivery</div>
              <div className="perf-sla-sub">Target: {SLA_TARGET_HOURS}h — {gradeLabel(kpis.onTimePct)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={kpis.firstAttemptPct}
                color={kpis.firstAttemptPct >= 85 ? '#16a34a' : kpis.firstAttemptPct >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">First-Attempt Success</div>
              <div className="perf-sla-sub">{kpis.delivered} of {kpis.delivered + kpis.failed} — {gradeLabel(kpis.firstAttemptPct)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={kpis.deliveryRate}
                color={kpis.deliveryRate >= 85 ? '#16a34a' : kpis.deliveryRate >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">Overall Delivery Rate</div>
              <div className="perf-sla-sub">{kpis.delivered} of {kpis.total} — {gradeLabel(kpis.deliveryRate)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={Math.min(100, Math.round((1 - kpis.avgDeliveryHours / (SLA_TARGET_HOURS * 2)) * 100))}
                color={kpis.avgDeliveryHours <= SLA_TARGET_HOURS ? '#16a34a' : '#ef4444'} />
              <div className="perf-sla-label">Average Speed</div>
              <div className="perf-sla-sub">
                {formatHours(kpis.avgDeliveryHours)} avg — {kpis.avgDeliveryHours <= SLA_TARGET_HOURS ? 'Within SLA' : 'Over SLA'}
              </div>
            </div>
          </div>

          {/* Distribution Chart Placeholders */}
          <div className="perf-charts-grid">
            <div className="perf-chart-card">
              <div className="perf-chart-title">
                <StatsUpSquare width={16} height={16} style={{ color: '#f97316' }} />
                Status Distribution
              </div>
              <div className="perf-chart-sub">Shipment outcomes for selected period</div>
              <div className="perf-chart-body">
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', height: '100%', paddingBottom: 20 }}>
                  {[
                    { label: 'Delivered', count: kpis.delivered, color: '#16a34a' },
                    { label: 'In Transit', count: kpis.inTransit, color: '#667eea' },
                    { label: 'Pending', count: kpis.pending, color: '#d97706' },
                    { label: 'Failed', count: kpis.failed, color: '#ef4444' },
                  ].map(b => {
                    const max = Math.max(kpis.delivered, kpis.inTransit, kpis.pending, kpis.failed, 1);
                    return (
                      <div key={b.label} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{
                          height: `${(b.count / max) * 160}px`,
                          background: b.color,
                          borderRadius: '6px 6px 0 0',
                          minHeight: 4,
                          transition: 'height 0.6s ease',
                          marginBottom: 6,
                        }} />
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{b.count}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{b.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="perf-chart-card">
              <div className="perf-chart-title">
                <DeliveryTruck width={16} height={16} style={{ color: '#f97316' }} />
                Top Drivers
              </div>
              <div className="perf-chart-sub">By delivery success rate</div>
              <div className="perf-chart-body">
                <div style={{ width: '100%', padding: '0 8px' }}>
                  {driverPerf.slice(0, 5).map((d, i) => (
                    <div key={d.driver_id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    }}>
                      <span className={`perf-rank ${rankClass(i)}`}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        {d.name}
                      </span>
                      <div style={{ width: 120 }}>
                        <div className="perf-progress-wrap">
                          <div className="perf-progress-bar-bg">
                            <div className={`perf-progress-bar ${gradeClass(d.successRate)}`}
                              style={{ width: `${d.successRate}%` }} />
                          </div>
                          <span className="perf-progress-pct" style={{ color: d.successRate >= 85 ? '#16a34a' : d.successRate >= 60 ? '#d97706' : '#ef4444' }}>
                            {d.successRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {driverPerf.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>
                      No driver data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Driver Scorecards Tab */}
      {activeTab === 'drivers' && (
        driverPerf.length === 0 ? (
          <div className="perf-empty">
            <div className="perf-empty-icon"><DeliveryTruck width={28} height={28} /></div>
            <h3>No Driver Data</h3>
            <p>No assigned orders found for the selected period</p>
          </div>
        ) : (
          <div className="perf-table-wrap">
            <table className="perf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Driver</th>
                  <th>Total</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Success Rate</th>
                  <th>On-Time</th>
                  <th>Avg Time</th>
                  <th>Rating</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {driverPerf.map((d, i) => (
                  <tr key={d.driver_id}>
                    <td><span className={`perf-rank ${rankClass(i)}`}>{i + 1}</span></td>
                    <td>
                      <div className="perf-driver-cell">
                        <div className="perf-driver-avatar">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="perf-driver-info">
                          <div className="perf-driver-name">{d.name}</div>
                          {d.phone && <div className="perf-driver-phone">{d.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.total}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{d.delivered}</td>
                    <td style={{ fontWeight: 700, color: d.failed > 0 ? '#ef4444' : '#94a3b8' }}>{d.failed}</td>
                    <td>
                      <div className="perf-progress-wrap">
                        <div className="perf-progress-bar-bg">
                          <div className={`perf-progress-bar ${gradeClass(d.successRate)}`}
                            style={{ width: `${d.successRate}%` }} />
                        </div>
                        <span className="perf-progress-pct"
                          style={{ color: d.successRate >= 85 ? '#16a34a' : d.successRate >= 60 ? '#d97706' : '#ef4444' }}>
                          {d.successRate}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: d.onTimePct >= 85 ? '#16a34a' : d.onTimePct >= 60 ? '#d97706' : '#ef4444' }}>
                        {d.onTimePct}%
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatHours(d.avgHours)}</td>
                    <td><RatingStars rating={d.rating} /></td>
                    <td>
                      <span className={`perf-badge ${gradeClass(d.successRate)}`}>
                        {gradeLabel(d.successRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
