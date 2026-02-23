import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  StatsReport, Calendar, MapPin, DeliveryTruck,
  Package, DollarCircle, Check, Xmark, Refresh, Download
} from 'iconoir-react';
import api from '../lib/api';
import './CRMPages.css';

/* ── Helpers ──────────────────────────────────────────────────── */
const fmtAED = v => `AED ${parseFloat(v || 0).toFixed(2)}`;
const pct    = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

/* ── KPI Card ─────────────────────────────────────────────────── */
const KPI = ({ label, value, sub, color, icon: Icon }) => (
  <div className="rpt-kpi-card">
    <div className="rpt-kpi-icon" style={{ background: color + '18', color }}>
      <Icon width={20} height={20} />
    </div>
    <div className="rpt-kpi-body">
      <div className="rpt-kpi-value">{value}</div>
      <div className="rpt-kpi-label">{label}</div>
      {sub && <div className="rpt-kpi-sub">{sub}</div>}
    </div>
  </div>
);

/* ── Chart base options ───────────────────────────────────────── */
const CHART_BASE = {
  fontFamily: 'inherit',
  toolbar: { show: false },
  zoom:    { enabled: false },
};
const COLORS = ['#f97316', '#244066', '#22c55e', '#ef4444', '#8b5cf6', '#0ea5e9', '#f59e0b'];

export default function Reports() {
  const [period,   setPeriod]   = useState('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => { fetchAll(); }, [period, dateFrom, dateTo]);

  const fetchAll = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: 'overview', period });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo)   params.set('date_to',   dateTo);
    const res = await api.get(`/reports?${params}`);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  const exportCSV = (rows, filename) => {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]).join(',');
    const body = rows.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const ov = data?.overview || {};

  const volumeSeries = data?.volume_by_day?.length ? [
    { name: 'Total',     data: data.volume_by_day.map(d => d.total || 0) },
    { name: 'Delivered', data: data.volume_by_day.map(d => d.delivered || 0) },
    { name: 'Failed',    data: data.volume_by_day.map(d => d.failed || 0) },
  ] : [];
  const volumeCategories = data?.volume_by_day?.map(d => d.date?.slice(5) || '') || [];

  const zoneSeries = data?.by_zone?.length ? [
    { name: 'Orders',    data: data.by_zone.map(d => d.orders || 0) },
    { name: 'Delivered', data: data.by_zone.map(d => d.delivered || 0) },
  ] : [];
  const zoneCategories = data?.by_zone?.map(d => d.zone || '') || [];

  const statusBreakdown = ov.total_orders > 0 ? [
    ov.delivered || 0,
    ov.failed    || 0,
    (ov.total_orders || 0) - (ov.delivered || 0) - (ov.failed || 0),
  ] : [];

  const paymentSeries     = data?.by_payment_method?.map(d => d.count || 0) || [];
  const paymentCategories = data?.by_payment_method?.map(d =>
    d.payment_method?.replace('_', ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || '') || [];

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Reports</h2>
          <p className="page-subheading">Analytics & performance insights</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="filter-date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} />
          <span className="date-sep">to</span>
          <input type="date" className="filter-date" value={dateTo}
            onChange={e => setDateTo(e.target.value)} />
          <select className="rpt-period-select" value={period}
            onChange={e => { setPeriod(e.target.value); setDateFrom(''); setDateTo(''); }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button className="btn-outline-action" onClick={fetchAll}>
            <Refresh width={14} height={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="od-tabs" style={{ marginBottom: 24 }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'volume',   label: 'Daily Volume' },
          { key: 'zones',    label: 'By Zone' },
          { key: 'drivers',  label: 'Driver Performance' },
          { key: 'payments', label: 'Payments' },
        ].map(s => (
          <button key={s.key} className={`od-tab ${activeSection === s.key ? 'active' : ''}`}
            onClick={() => setActiveSection(s.key)}>{s.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="rpt-loading">
          {[1,2,3,4].map(i => <div key={i} className="skeleton-pulse" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      ) : !data ? (
        <div className="ord-empty">
          <StatsReport width={48} height={48} />
          <h3>No data available</h3>
          <p>No orders found for the selected period</p>
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div>
              <div className="rpt-kpi-grid">
                <KPI icon={Package}      label="Total Orders"  value={ov.total_orders || 0}    color="#244066" />
                <KPI icon={Check}        label="Delivered"     value={ov.delivered || 0}         color="#16a34a" sub={pct(ov.delivered, ov.total_orders) + ' success rate'} />
                <KPI icon={Xmark}        label="Failed"        value={ov.failed || 0}            color="#dc2626" sub={pct(ov.failed, ov.total_orders) + ' of total'} />
                <KPI icon={DollarCircle} label="Revenue"       value={fmtAED(ov.total_revenue)}  color="#f97316" />
                <KPI icon={DollarCircle} label="COD Collected" value={fmtAED(ov.cod_collected)}  color="#8b5cf6" />
                <KPI icon={StatsReport}  label="Success Rate"  value={(ov.success_rate || 0) + '%'} color="#0ea5e9" />
              </div>
              {statusBreakdown.length > 0 && (
                <div className="rpt-chart-row">
                  <div className="rpt-chart-card">
                    <div className="rpt-chart-header"><h4>Order Status Breakdown</h4></div>
                    <ReactApexChart type="donut" height={280}
                      series={statusBreakdown}
                      options={{
                        chart: CHART_BASE,
                        labels: ['Delivered', 'Failed', 'Other'],
                        colors: ['#22c55e', '#ef4444', '#94a3b8'],
                        legend: { position: 'bottom' },
                        dataLabels: { formatter: v => v.toFixed(1) + '%' },
                        plotOptions: { pie: { donut: { size: '65%' } } },
                      }}
                    />
                  </div>
                  {data?.by_emirate?.length > 0 && (
                    <div className="rpt-chart-card">
                      <div className="rpt-chart-header"><h4>Orders by Emirate</h4></div>
                      <ReactApexChart type="bar" height={280}
                        series={[{ name: 'Orders', data: data.by_emirate.map(d => d.orders || 0) }]}
                        options={{
                          chart: CHART_BASE,
                          colors: [COLORS[0]],
                          xaxis: { categories: data.by_emirate.map(d => d.emirate || '') },
                          plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                          dataLabels: { enabled: false },
                          grid: { borderColor: '#f1f5f9' },
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DAILY VOLUME */}
          {activeSection === 'volume' && (
            <div className="rpt-chart-card">
              <div className="rpt-chart-header">
                <h4>Daily Order Volume</h4>
                <button className="btn-outline-action" onClick={() => exportCSV(data?.volume_by_day, 'volume-by-day')}>
                  <Download width={13} height={13} /> Export CSV
                </button>
              </div>
              {volumeSeries.length > 0 ? (
                <ReactApexChart type="area" height={340} series={volumeSeries}
                  options={{
                    chart: { ...CHART_BASE, stacked: false },
                    colors: ['#244066', '#22c55e', '#ef4444'],
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
                    stroke: { curve: 'smooth', width: 2 },
                    xaxis: { categories: volumeCategories, labels: { rotate: -45 } },
                    tooltip: { shared: true, intersect: false },
                    legend: { position: 'top' },
                    dataLabels: { enabled: false },
                    grid: { borderColor: '#f1f5f9' },
                  }}
                />
              ) : <p className="od-empty-tab">No daily data yet.</p>}
            </div>
          )}

          {/* BY ZONE */}
          {activeSection === 'zones' && (
            <div>
              <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                <div className="rpt-chart-header">
                  <h4>Orders by Zone</h4>
                  <button className="btn-outline-action" onClick={() => exportCSV(data?.by_zone, 'orders-by-zone')}>
                    <Download width={13} height={13} /> Export CSV
                  </button>
                </div>
                {zoneSeries.length > 0 ? (
                  <ReactApexChart type="bar" height={320} series={zoneSeries}
                    options={{
                      chart: CHART_BASE,
                      colors: ['#244066', '#22c55e'],
                      xaxis: { categories: zoneCategories },
                      plotOptions: { bar: { borderRadius: 6, columnWidth: '60%', grouped: true } },
                      dataLabels: { enabled: false },
                      legend: { position: 'top' },
                      grid: { borderColor: '#f1f5f9' },
                    }}
                  />
                ) : <p className="od-empty-tab">No zone data yet.</p>}
              </div>
              {data?.by_zone?.length > 0 && (
                <div className="rpt-table-card">
                  <table className="od-items-table">
                    <thead><tr><th>Zone</th><th>Total</th><th>Delivered</th><th>Success Rate</th><th>Revenue</th></tr></thead>
                    <tbody>
                      {data.by_zone.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.zone}</strong></td>
                          <td>{row.orders}</td>
                          <td>{row.delivered}</td>
                          <td>{pct(row.delivered, row.orders)}</td>
                          <td>{fmtAED(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DRIVER PERFORMANCE */}
          {activeSection === 'drivers' && (
            <div>
              {data?.driver_performance?.length > 0 && (
                <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                  <div className="rpt-chart-header">
                    <h4>Top Drivers by Deliveries</h4>
                    <button className="btn-outline-action" onClick={() => exportCSV(data?.driver_performance, 'driver-performance')}>
                      <Download width={13} height={13} /> Export CSV
                    </button>
                  </div>
                  <ReactApexChart type="bar" height={300}
                    series={[
                      { name: 'Delivered', data: data.driver_performance.slice(0,10).map(d => d.delivered || 0) },
                      { name: 'Failed',    data: data.driver_performance.slice(0,10).map(d => d.failed || 0) },
                    ]}
                    options={{
                      chart: { ...CHART_BASE, stacked: true },
                      colors: ['#22c55e', '#ef4444'],
                      xaxis: { categories: data.driver_performance.slice(0,10).map(d => d.full_name?.split(' ')[0] || '') },
                      plotOptions: { bar: { borderRadius: 4 } },
                      dataLabels: { enabled: false },
                      legend: { position: 'top' },
                      grid: { borderColor: '#f1f5f9' },
                    }}
                  />
                </div>
              )}
              <div className="rpt-table-card">
                <table className="od-items-table">
                  <thead><tr><th>Driver</th><th>Vehicle</th><th>Total</th><th>Delivered</th><th>Failed</th><th>Success Rate</th><th>Revenue</th><th>Rating</th></tr></thead>
                  <tbody>
                    {data?.driver_performance?.length ? data.driver_performance.map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.full_name}</strong></td>
                        <td>{row.vehicle_type?.replace('_',' ')}</td>
                        <td>{row.total_assigned}</td>
                        <td style={{ color:'#16a34a', fontWeight:600 }}>{row.delivered}</td>
                        <td style={{ color:'#dc2626' }}>{row.failed}</td>
                        <td>{pct(row.delivered, row.total_assigned)}</td>
                        <td>{fmtAED(row.revenue)}</td>
                        <td>{row.rating ? `⭐ ${parseFloat(row.rating).toFixed(1)}` : '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No driver data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {activeSection === 'payments' && (
            <div className="rpt-chart-row">
              {paymentSeries.length > 0 && (
                <div className="rpt-chart-card">
                  <div className="rpt-chart-header"><h4>Payment Method Distribution</h4></div>
                  <ReactApexChart type="pie" height={300} series={paymentSeries}
                    options={{
                      chart: CHART_BASE,
                      labels: paymentCategories,
                      colors: COLORS,
                      legend: { position: 'bottom' },
                      dataLabels: { formatter: v => v.toFixed(1) + '%' },
                    }}
                  />
                </div>
              )}
              <div className="rpt-table-card" style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Payment Breakdown</h4>
                <table className="od-items-table">
                  <thead><tr><th>Method</th><th>Orders</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {data?.by_payment_method?.length ? data.by_payment_method.map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.payment_method?.replace('_',' ')?.replace(/\b\w/g, c => c.toUpperCase())}</strong></td>
                        <td>{row.count}</td>
                        <td>{fmtAED(row.revenue)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No payment data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
