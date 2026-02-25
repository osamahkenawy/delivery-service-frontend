import { useState, useEffect, useCallback } from 'react';
import {
  StatsUpSquare, DeliveryTruck, Clock, Medal, StarSolid,
  Timer, Check, Xmark, StatUp, StatDown,
  Refresh, Download
} from 'iconoir-react';
import api from '../lib/api';
import './Performance.css';
import { useTranslation } from 'react-i18next';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'custom', label: 'Custom Range' },
];

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
  const { t } = useTranslation();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom' && dateFrom) params.set('date_from', dateFrom);
      if (period === 'custom' && dateTo) params.set('date_to', dateTo);
      const res = await api.get(`/reports/performance?${params}`);
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Performance load error', e);
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis || {};
  const driverPerf = data?.drivers || [];
  const slaTarget = kpis.slaTargetHours || 24;

  const gradeClass = (pct) => pct >= 85 ? 'excellent' : pct >= 60 ? 'good' : 'poor';
  const gradeLabel = (pct) => pct >= 85 ? 'Excellent' : pct >= 60 ? 'Good' : 'Needs Improvement';
  const rankClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';

  const formatHours = (h) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h/24).toFixed(1)}d`;
  };

  const exportCSV = () => {
    if (!driverPerf.length) return;
    const headers = 'Rank,Driver,Phone,Vehicle,Total,Delivered,Failed,Success Rate,On-Time %,Avg Time,Rating,Grade';
    const rows = driverPerf.map((d, i) =>
      `${i+1},"${d.name}","${d.phone || ''}","${d.vehicle_type || ''}",${d.total},${d.delivered},${d.failed},${d.successRate}%,${d.onTimePct}%,${formatHours(d.avgHours)},${d.rating},${d.grade}`
    );
    const blob = new Blob([headers + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `driver-performance-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="perf-page"><div className="perf-spinner" /></div>;

  return (
    <div className="perf-page">
      {/* Hero */}
      <div className="module-hero">
        <div className="hero-content">
          <h1 className="hero-title">{t("performance.title")}</h1>
          <p className="hero-subtitle">
            Delivery metrics, SLA compliance, and driver scorecards
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={exportCSV} className="hero-btn secondary" title="Export driver data">
            <Download width={16} height={16} /> Export
          </button>
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
              <span className="perf-stat-val">{kpis.total || 0}</span>
              <span className="perf-stat-lbl">{t("performance.total_shipments")}</span>
            </div>
          </div>
        </div>
        <div className="perf-stat-card success">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <Check width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{kpis.deliveryRate || 0}%</span>
              <span className="perf-stat-lbl">Delivery Rate</span>
              <div className={`perf-stat-change ${(kpis.deliveryRate || 0) >= 80 ? 'up' : 'down'}`}>
                {(kpis.deliveryRate || 0) >= 80 ? <StatUp width={12} height={12} /> : <StatDown width={12} height={12} />}
                {kpis.delivered || 0} delivered
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
              <span className="perf-stat-val">{formatHours(kpis.avgDeliveryHours || 0)}</span>
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
              <span className="perf-stat-val">{kpis.onTimePct || 0}%</span>
              <span className="perf-stat-lbl">On-Time ({slaTarget}h SLA)</span>
            </div>
          </div>
        </div>
        <div className="perf-stat-card danger">
          <div className="perf-stat-card-row">
            <div className="perf-stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <Xmark width={22} height={22} />
            </div>
            <div className="perf-stat-body">
              <span className="perf-stat-val">{(kpis.failed || 0) + (kpis.returned || 0)}</span>
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
              <SLARing percent={kpis.onTimePct || 0}
                color={(kpis.onTimePct||0) >= 85 ? '#16a34a' : (kpis.onTimePct||0) >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">{t("performance.on_time_delivery")}</div>
              <div className="perf-sla-sub">Target: {slaTarget}h — {gradeLabel(kpis.onTimePct || 0)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={kpis.firstAttemptPct || 0}
                color={(kpis.firstAttemptPct||0) >= 85 ? '#16a34a' : (kpis.firstAttemptPct||0) >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">First-Attempt Success</div>
              <div className="perf-sla-sub">{kpis.delivered || 0} of {(kpis.delivered||0) + (kpis.failed||0)} — {gradeLabel(kpis.firstAttemptPct || 0)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={kpis.deliveryRate || 0}
                color={(kpis.deliveryRate||0) >= 85 ? '#16a34a' : (kpis.deliveryRate||0) >= 60 ? '#f97316' : '#ef4444'} />
              <div className="perf-sla-label">{t("performance.overall_rate")}</div>
              <div className="perf-sla-sub">{kpis.delivered || 0} of {kpis.total || 0} — {gradeLabel(kpis.deliveryRate || 0)}</div>
            </div>
            <div className="perf-sla-card">
              <SLARing percent={Math.min(100, Math.round((1 - (kpis.avgDeliveryHours||0) / (slaTarget * 2)) * 100))}
                color={(kpis.avgDeliveryHours||0) <= slaTarget ? '#16a34a' : '#ef4444'} />
              <div className="perf-sla-label">Average Speed</div>
              <div className="perf-sla-sub">
                {formatHours(kpis.avgDeliveryHours || 0)} avg — {(kpis.avgDeliveryHours||0) <= slaTarget ? 'Within SLA' : 'Over SLA'}
              </div>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="perf-charts-grid">
            <div className="perf-chart-card">
              <div className="perf-chart-title">
                <StatsUpSquare width={16} height={16} style={{ color: '#f97316' }} />
                Status Distribution
              </div>
              <div className="perf-chart-sub">{t("performance.subtitle")}</div>
              <div className="perf-chart-body">
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', height: '100%', paddingBottom: 20 }}>
                  {[
                    { label: 'Delivered', count: kpis.delivered || 0, color: '#16a34a' },
                    { label: 'In Transit', count: kpis.in_transit || 0, color: '#667eea' },
                    { label: 'Pending', count: kpis.pending || 0, color: '#d97706' },
                    { label: 'Failed', count: kpis.failed || 0, color: '#ef4444' },
                  ].map(b => {
                    const max = Math.max(kpis.delivered||0, kpis.in_transit||0, kpis.pending||0, kpis.failed||0, 1);
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
            <h3>{t("performance.no_driver_data")}</h3>
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
                  <th>{t("performance.success_rate")}</th>
                  <th>{t("performance.on_time")}</th>
                  <th>Avg Time</th>
                  <th>{t("performance.rating")}</th>
                  <th>{t("performance.grade")}</th>
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
                    <td><RatingStars rating={d.rating || 0} /></td>
                    <td>
                      <span className={`perf-badge ${d.grade || gradeClass(d.successRate)}`}>
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
