import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
  StatsReport, Calendar, MapPin, DeliveryTruck,
  Package, DollarCircle, Check, Xmark, Refresh, Download,
  User, Clock, Timer, Page, Wallet, CreditCard, Bank,
  Mail, Plus, Trash, SendMail
} from 'iconoir-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../lib/api';
import './CRMPages.css';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [period,   setPeriod]   = useState('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [data,     setData]     = useState(null);
  const [finData,  setFinData]  = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ frequency: 'daily', recipients: '' });
  const [loading,  setLoading]  = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => { fetchAll(); }, [period, dateFrom, dateTo]);
  useEffect(() => { if (activeSection === 'financial') fetchFinancial(); }, [activeSection, period, dateFrom, dateTo]);
  useEffect(() => { if (activeSection === 'schedules') fetchSchedules(); }, [activeSection]);

  const fetchSchedules = async () => {
    const res = await api.get('/reports/schedules');
    if (res.success) setSchedules(res.data || []);
  };

  const createSchedule = async () => {
    const recipients = scheduleForm.recipients.split(',').map(e => e.trim()).filter(Boolean);
    if (!recipients.length) return;
    const res = await api.post('/reports/schedules', { frequency: scheduleForm.frequency, recipients });
    if (res.success) {
      setShowScheduleForm(false);
      setScheduleForm({ frequency: 'daily', recipients: '' });
      fetchSchedules();
    }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this scheduled report?')) return;
    await api.delete(`/reports/schedules/${id}`);
    fetchSchedules();
  };

  const toggleSchedule = async (schedule) => {
    await api.put(`/reports/schedules/${schedule.id}`, { is_active: !schedule.is_active });
    fetchSchedules();
  };

  const sendNow = async (id) => {
    const res = await api.post(`/reports/schedules/${id}/send-now`);
    if (res.success) alert('Report sent successfully!');
  };

  const fetchFinancial = async () => {
    const params = new URLSearchParams({ period });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const res = await api.get(`/reports/financial?${params}`);
    if (res.success) setFinData(res.data);
  };

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

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    const ov = data.overview || {};
    const now = new Date().toLocaleDateString('en-AE', { dateStyle: 'long' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(36, 64, 102);
    doc.text('Delivery Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${now}  |  Period: Last ${period} days`, 14, 28);

    // KPIs table
    doc.setFontSize(13);
    doc.setTextColor(36, 64, 102);
    doc.text('Overview', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['Metric', 'Value']],
      body: [
        ['Total Orders', String(ov.total_orders || 0)],
        ['Delivered', String(ov.delivered || 0)],
        ['Failed', String(ov.failed || 0)],
        ['Success Rate', (ov.success_rate || 0) + '%'],
        ['Total Revenue', fmtAED(ov.total_revenue)],
        ['COD Collected', fmtAED(ov.cod_collected)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [36, 64, 102] },
      styles: { fontSize: 9 },
    });

    // Zone table
    if (data.by_zone?.length) {
      doc.setFontSize(13);
      doc.setTextColor(36, 64, 102);
      const zy = doc.lastAutoTable.finalY + 12;
      doc.text('Orders by Zone', 14, zy);
      autoTable(doc, {
        startY: zy + 4,
        head: [['Zone', 'Orders', 'Delivered', 'Success %', 'Revenue']],
        body: data.by_zone.map(r => [r.zone, r.orders, r.delivered, pct(r.delivered, r.orders), fmtAED(r.revenue)]),
        theme: 'grid',
        headStyles: { fillColor: [36, 64, 102] },
        styles: { fontSize: 8 },
      });
    }

    // Driver table
    if (data.driver_performance?.length) {
      const dy = doc.lastAutoTable.finalY + 12;
      if (dy > 240) doc.addPage();
      const startY = dy > 240 ? 20 : dy;
      doc.setFontSize(13);
      doc.setTextColor(36, 64, 102);
      doc.text('Driver Performance', 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [['Driver', 'Vehicle', 'Total', 'Delivered', 'Failed', 'Success %', 'Revenue']],
        body: data.driver_performance.map(r => [
          r.full_name, r.vehicle_type?.replace('_',' '), r.total_assigned, r.delivered, r.failed,
          pct(r.delivered, r.total_assigned), fmtAED(r.revenue)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [36, 64, 102] },
        styles: { fontSize: 8 },
      });
    }

    // Client table
    if (data.top_clients?.length) {
      const cy = doc.lastAutoTable.finalY + 12;
      if (cy > 240) doc.addPage();
      const startY = cy > 240 ? 20 : cy;
      doc.setFontSize(13);
      doc.setTextColor(36, 64, 102);
      doc.text('Top Clients', 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [['Client', 'Orders', 'Delivered', 'Revenue', 'Avg Value']],
        body: data.top_clients.map(r => [r.name, r.orders, r.delivered, fmtAED(r.revenue), fmtAED(r.avg_order_value)]),
        theme: 'grid',
        headStyles: { fillColor: [36, 64, 102] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`delivery-report-${period}days.pdf`);
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
          <p className="page-subheading">{t("reports.subtitle")}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="filter-date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} />
          <span className="date-sep">to</span>
          <input type="date" className="filter-date" value={dateTo}
            onChange={e => setDateTo(e.target.value)} />
          <select className="rpt-period-select" value={period}
            onChange={e => { setPeriod(e.target.value); setDateFrom(''); setDateTo(''); }}>
            <option value="7">{t("reports.last_7_days")}</option>
            <option value="30">{t("reports.last_30_days")}</option>
            <option value="90">{t("reports.last_90_days")}</option>
            <option value="365">Last year</option>
          </select>
          <button className="btn-outline-action" onClick={fetchAll}>
            <Refresh width={14} height={14} /> Refresh
          </button>
          <button className="btn-outline-action" onClick={exportPDF} style={{ background: '#244066', color: '#fff', border: 'none' }}>
            <Page width={14} height={14} /> PDF Report
          </button>
        </div>
      </div>

      <div className="od-tabs" style={{ marginBottom: 24 }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'volume',   label: 'Daily Volume' },
          { key: 'zones',    label: 'By Zone' },
          { key: 'drivers',  label: 'Driver Performance' },
          { key: 'clients',  label: 'Clients' },
          { key: 'types',    label: 'Order Types' },
          { key: 'delivery_time', label: 'Delivery Time' },
          { key: 'payments', label: 'Payments' },
          { key: 'financial', label: 'Financial' },
          { key: 'schedules', label: 'Email Schedules' },
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
              {/* Failure Reasons (#54) */}
              {data?.failure_reasons?.length > 0 && (
                <div className="rpt-chart-row" style={{ marginTop: 20 }}>
                  <div className="rpt-chart-card">
                    <div className="rpt-chart-header"><h4>{t("reports.failure_reasons")}</h4></div>
                    <ReactApexChart type="donut" height={280}
                      series={data.failure_reasons.map(d => d.count || 0)}
                      options={{
                        chart: CHART_BASE,
                        labels: data.failure_reasons.map(d => d.reason || 'Unknown'),
                        colors: ['#ef4444', '#f97316', '#d97706', '#94a3b8', '#8b5cf6', '#64748b'],
                        legend: { position: 'bottom' },
                        dataLabels: { formatter: v => v.toFixed(1) + '%' },
                        plotOptions: { pie: { donut: { size: '60%' } } },
                      }}
                    />
                  </div>
                  <div className="rpt-table-card" style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>{t("reports.failure_details")}</h4>
                    <table className="od-items-table">
                      <thead><tr><th>Reason</th><th>Count</th><th>% of Failed</th></tr></thead>
                      <tbody>
                        {data.failure_reasons.map((row, i) => {
                          const totalFailed = data.failure_reasons.reduce((a,b) => a + (b.count || 0), 0);
                          return (
                            <tr key={i}>
                              <td><strong>{row.reason}</strong></td>
                              <td style={{ fontWeight: 700, color: '#ef4444' }}>{row.count}</td>
                              <td>{pct(row.count, totalFailed)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DAILY VOLUME */}
          {activeSection === 'volume' && (
            <div className="rpt-chart-card">
              <div className="rpt-chart-header">
                <h4>{t("reports.daily_volume")}</h4>
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
              {/* Zone Heatmap (#57) */}
              {data?.by_zone?.length > 0 && (() => {
                const maxOrders = Math.max(...data.by_zone.map(z => z.orders || 0), 1);
                return (
                  <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                    <div className="rpt-chart-header"><h4>Zone Order Density</h4></div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 12, padding: '8px 0',
                    }}>
                      {data.by_zone.map((z, i) => {
                        const intensity = (z.orders || 0) / maxOrders;
                        const bg = `rgba(36, 64, 102, ${0.08 + intensity * 0.82})`;
                        const textColor = intensity > 0.45 ? '#fff' : '#244066';
                        const successRate = z.orders > 0 ? ((z.delivered / z.orders) * 100).toFixed(0) : 0;
                        return (
                          <div key={i} style={{
                            background: bg, borderRadius: 12, padding: '16px 14px',
                            color: textColor, position: 'relative', overflow: 'hidden',
                            minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{z.zone || 'Unknown'}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                              <div>
                                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{z.orders}</div>
                                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>orders</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{successRate}%</div>
                                <div style={{ fontSize: 10, opacity: 0.8 }}>success</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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

          {/* CLIENTS (#46) */}
          {activeSection === 'clients' && (
            <div>
              {data?.top_clients?.length > 0 && (
                <>
                  <div className="rpt-chart-row" style={{ marginBottom: 20 }}>
                    <div className="rpt-chart-card">
                      <div className="rpt-chart-header"><h4>Top Clients by Orders</h4></div>
                      <ReactApexChart type="bar" height={320}
                        series={[
                          { name: 'Orders', data: data.top_clients.slice(0,10).map(c => c.orders || 0) },
                          { name: 'Delivered', data: data.top_clients.slice(0,10).map(c => c.delivered || 0) },
                        ]}
                        options={{
                          chart: { ...CHART_BASE, stacked: false },
                          colors: ['#244066', '#22c55e'],
                          xaxis: { categories: data.top_clients.slice(0,10).map(c => c.name?.split(' ')[0] || 'N/A') },
                          plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
                          dataLabels: { enabled: false },
                          legend: { position: 'top' },
                          grid: { borderColor: '#f1f5f9' },
                        }}
                      />
                    </div>
                    <div className="rpt-chart-card">
                      <div className="rpt-chart-header"><h4>Revenue by Client</h4></div>
                      <ReactApexChart type="donut" height={320}
                        series={data.top_clients.slice(0,8).map(c => parseFloat(c.revenue) || 0)}
                        options={{
                          chart: CHART_BASE,
                          labels: data.top_clients.slice(0,8).map(c => c.name || 'N/A'),
                          colors: COLORS,
                          legend: { position: 'bottom' },
                          dataLabels: { formatter: v => v.toFixed(1) + '%' },
                          plotOptions: { pie: { donut: { size: '60%' } } },
                        }}
                      />
                    </div>
                  </div>
                  <div className="rpt-table-card">
                    <div className="rpt-chart-header" style={{ marginBottom: 16 }}>
                      <h4>{t("reports.client_analytics")}</h4>
                      <button className="btn-outline-action" onClick={() => exportCSV(data?.top_clients, 'client-analytics')}>
                        <Download width={13} height={13} /> Export CSV
                      </button>
                    </div>
                    <table className="od-items-table">
                      <thead><tr><th>Client</th><th>Company</th><th>Orders</th><th>Delivered</th><th>Failed</th><th>Success %</th><th>Revenue</th><th>Avg Value</th><th>{t("reports.cod_total")}</th></tr></thead>
                      <tbody>
                        {data.top_clients.map((row, i) => (
                          <tr key={i}>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.company || '—'}</td>
                            <td style={{ fontWeight: 700 }}>{row.orders}</td>
                            <td style={{ color: '#16a34a', fontWeight: 600 }}>{row.delivered}</td>
                            <td style={{ color: row.failed > 0 ? '#ef4444' : '#94a3b8' }}>{row.failed}</td>
                            <td>{pct(row.delivered, row.orders)}</td>
                            <td>{fmtAED(row.revenue)}</td>
                            <td>{fmtAED(row.avg_order_value)}</td>
                            <td>{fmtAED(row.cod_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {(!data?.top_clients || data.top_clients.length === 0) && (
                <div className="ord-empty">
                  <User width={48} height={48} />
                  <h3>No client data</h3>
                  <p>No client-linked orders found for the selected period</p>
                </div>
              )}
            </div>
          )}

          {/* ORDER TYPES (#49) */}
          {activeSection === 'types' && (
            <div className="rpt-chart-row">
              {data?.by_order_type?.length > 0 ? (
                <>
                  <div className="rpt-chart-card">
                    <div className="rpt-chart-header"><h4>Order Types Distribution</h4></div>
                    <ReactApexChart type="donut" height={300}
                      series={data.by_order_type.map(d => d.count || 0)}
                      options={{
                        chart: CHART_BASE,
                        labels: data.by_order_type.map(d => (d.order_type || 'standard').replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())),
                        colors: COLORS,
                        legend: { position: 'bottom' },
                        dataLabels: { formatter: v => v.toFixed(1) + '%' },
                        plotOptions: { pie: { donut: { size: '60%' } } },
                      }}
                    />
                  </div>
                  <div className="rpt-table-card" style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Order Type Breakdown</h4>
                    <table className="od-items-table">
                      <thead><tr><th>Type</th><th>Count</th><th>% of Total</th></tr></thead>
                      <tbody>
                        {data.by_order_type.map((row, i) => (
                          <tr key={i}>
                            <td><strong>{(row.order_type || 'standard').replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</strong></td>
                            <td style={{ fontWeight: 700 }}>{row.count}</td>
                            <td>{pct(row.count, ov.total_orders)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="ord-empty" style={{ gridColumn: '1 / -1' }}>
                  <Package width={48} height={48} />
                  <h3>No order type data</h3>
                  <p>Order types not recorded for this period</p>
                </div>
              )}
            </div>
          )}

          {/* DELIVERY TIME BY ZONE (#51) */}
          {activeSection === 'delivery_time' && (
            <div>
              {data?.delivery_time_by_zone?.length > 0 ? (
                <>
                  <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                    <div className="rpt-chart-header">
                      <h4>{t("reports.avg_delivery_time")}</h4>
                      <button className="btn-outline-action" onClick={() => exportCSV(data?.delivery_time_by_zone, 'delivery-time-by-zone')}>
                        <Download width={13} height={13} /> Export CSV
                      </button>
                    </div>
                    <ReactApexChart type="bar" height={340}
                      series={[
                        { name: 'Avg Minutes', data: data.delivery_time_by_zone.map(d => d.avg_minutes || 0) },
                      ]}
                      options={{
                        chart: CHART_BASE,
                        colors: ['#667eea'],
                        xaxis: { categories: data.delivery_time_by_zone.map(d => d.zone || '') },
                        plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
                        dataLabels: { enabled: true, formatter: v => v > 60 ? `${(v/60).toFixed(1)}h` : `${v}m` },
                        grid: { borderColor: '#f1f5f9' },
                        yaxis: { title: { text: 'Minutes' } },
                      }}
                    />
                  </div>
                  <div className="rpt-table-card">
                    <table className="od-items-table">
                      <thead><tr><th>Zone</th><th>{t("reports.deliveries")}</th><th>Avg Time</th><th>{t("reports.fastest")}</th><th>Slowest</th></tr></thead>
                      <tbody>
                        {data.delivery_time_by_zone.map((row, i) => {
                          const fmtM = m => { if (!m) return '—'; return m >= 60 ? `${(m/60).toFixed(1)}h` : `${m}m`; };
                          return (
                            <tr key={i}>
                              <td><strong>{row.zone}</strong></td>
                              <td>{row.delivered}</td>
                              <td style={{ fontWeight: 700, color: '#667eea' }}>{fmtM(row.avg_minutes)}</td>
                              <td style={{ color: '#16a34a' }}>{fmtM(row.min_minutes)}</td>
                              <td style={{ color: '#ef4444' }}>{fmtM(row.max_minutes)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="ord-empty">
                  <Timer width={48} height={48} />
                  <h3>No delivery time data</h3>
                  <p>No delivered orders with timing data for this period</p>
                </div>
              )}
            </div>
          )}

          {/* FINANCIAL SUMMARY (#55) */}
          {activeSection === 'financial' && (
            <div>
              {finData ? (() => {
                const fk = finData.kpis || {};
                return (
                  <>
                    {/* Financial KPI Cards */}
                    <div className="rpt-kpi-grid">
                      <KPI icon={DollarCircle} label="Gross Fees"     value={fmtAED(fk.gross_delivery_fees)} color="#244066" />
                      <KPI icon={Xmark}        label="Discounts"      value={fmtAED(fk.total_discounts)}     color="#ef4444" />
                      <KPI icon={Wallet}       label="Net Revenue"    value={fmtAED(fk.net_revenue)}         color="#16a34a" sub={`${fk.delivered || 0} delivered orders`} />
                      <KPI icon={CreditCard}   label="COD Collected"  value={fmtAED(fk.cod_collected)}       color="#f97316" />
                      <KPI icon={Bank}         label="COD Settled"    value={fmtAED(fk.cod_settled)}         color="#22c55e" />
                      <KPI icon={Clock}        label="COD Pending"    value={fmtAED(fk.cod_unsettled)}       color="#dc2626" sub={`Outstanding: ${fmtAED(fk.cod_outstanding)}`} />
                    </div>

                    {/* Revenue Trend Chart */}
                    {finData.revenue_by_day?.length > 0 && (
                      <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                        <div className="rpt-chart-header">
                          <h4>Revenue Trend</h4>
                          <button className="btn-outline-action" onClick={() => exportCSV(finData.revenue_by_day, 'revenue-by-day')}>
                            <Download width={13} height={13} /> Export CSV
                          </button>
                        </div>
                        <ReactApexChart type="area" height={320}
                          series={[
                            { name: 'Revenue', data: finData.revenue_by_day.map(d => parseFloat(d.revenue) || 0) },
                            { name: 'COD',     data: finData.revenue_by_day.map(d => parseFloat(d.cod) || 0) },
                          ]}
                          options={{
                            chart: { ...CHART_BASE, stacked: false },
                            colors: ['#22c55e', '#f97316'],
                            xaxis: { categories: finData.revenue_by_day.map(d => d.date?.slice(5) || '') },
                            stroke: { curve: 'smooth', width: [3, 2] },
                            fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
                            dataLabels: { enabled: false },
                            grid: { borderColor: '#f1f5f9' },
                            yaxis: { title: { text: 'AED' }, labels: { formatter: v => v >= 1000 ? (v/1000).toFixed(1) + 'K' : v.toFixed(0) } },
                            legend: { position: 'top' },
                            tooltip: { y: { formatter: v => fmtAED(v) } },
                          }}
                        />
                      </div>
                    )}

                    {/* Payment Method & Zone Revenue side-by-side */}
                    <div className="rpt-chart-row" style={{ marginBottom: 20 }}>
                      {finData.by_payment_method?.length > 0 && (
                        <div className="rpt-chart-card">
                          <div className="rpt-chart-header"><h4>Revenue by Payment Method</h4></div>
                          <ReactApexChart type="donut" height={280}
                            series={finData.by_payment_method.map(d => parseFloat(d.revenue) || 0)}
                            options={{
                              chart: CHART_BASE,
                              labels: finData.by_payment_method.map(d => (d.payment_method || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())),
                              colors: ['#22c55e', '#f97316', '#3b82f6', '#8b5cf6'],
                              legend: { position: 'bottom' },
                              dataLabels: { formatter: v => v.toFixed(1) + '%' },
                              plotOptions: { pie: { donut: { size: '60%' } } },
                              tooltip: { y: { formatter: v => fmtAED(v) } },
                            }}
                          />
                        </div>
                      )}
                      {finData.revenue_by_zone?.length > 0 && (
                        <div className="rpt-chart-card">
                          <div className="rpt-chart-header"><h4>Revenue by Zone</h4></div>
                          <ReactApexChart type="bar" height={280}
                            series={[{ name: 'Revenue', data: finData.revenue_by_zone.map(d => parseFloat(d.revenue) || 0) }]}
                            options={{
                              chart: CHART_BASE,
                              colors: ['#244066'],
                              xaxis: { categories: finData.revenue_by_zone.map(d => d.zone || '') },
                              plotOptions: { bar: { borderRadius: 6, columnWidth: '50%', horizontal: true } },
                              dataLabels: { enabled: true, formatter: v => fmtAED(v) },
                              grid: { borderColor: '#f1f5f9' },
                              tooltip: { y: { formatter: v => fmtAED(v) } },
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Top Clients by Revenue */}
                    {finData.top_clients?.length > 0 && (
                      <div className="rpt-table-card" style={{ marginBottom: 20 }}>
                        <div className="rpt-chart-header" style={{ marginBottom: 16 }}>
                          <h4>Top Clients by Revenue</h4>
                          <button className="btn-outline-action" onClick={() => exportCSV(finData.top_clients, 'top-clients-revenue')}>
                            <Download width={13} height={13} /> Export CSV
                          </button>
                        </div>
                        <table className="od-items-table">
                          <thead><tr><th>Client</th><th>Company</th><th>Orders</th><th>Revenue</th><th>COD</th></tr></thead>
                          <tbody>
                            {finData.top_clients.map((row, i) => (
                              <tr key={i}>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.company || '—'}</td>
                                <td>{row.orders}</td>
                                <td style={{ fontWeight: 700, color: '#16a34a' }}>{fmtAED(row.revenue)}</td>
                                <td>{fmtAED(row.cod_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Driver Settlements */}
                    {finData.driver_settlements?.length > 0 && (
                      <div className="rpt-table-card">
                        <div className="rpt-chart-header" style={{ marginBottom: 16 }}>
                          <h4>Driver Settlements</h4>
                          <button className="btn-outline-action" onClick={() => exportCSV(finData.driver_settlements, 'driver-settlements')}>
                            <Download width={13} height={13} /> Export CSV
                          </button>
                        </div>
                        <table className="od-items-table">
                          <thead><tr><th>Driver</th><th>{t("reports.deliveries")}</th><th>Revenue Generated</th><th>{t("reports.cod_collected")}</th><th>{t("reports.cod_settled")}</th><th>{t("reports.cod_pending")}</th></tr></thead>
                          <tbody>
                            {finData.driver_settlements.map((row, i) => (
                              <tr key={i}>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.deliveries}</td>
                                <td style={{ fontWeight: 600 }}>{fmtAED(row.revenue_generated)}</td>
                                <td>{fmtAED(row.cod_collected)}</td>
                                <td style={{ color: '#16a34a' }}>{fmtAED(row.cod_settled)}</td>
                                <td style={{ color: parseFloat(row.cod_pending) > 0 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>
                                  {fmtAED(row.cod_pending)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="rpt-loading">
                  {[1,2,3].map(i => <div key={i} className="skeleton-pulse" style={{ height: 120, borderRadius: 12 }} />)}
                </div>
              )}
            </div>
          )}

          {/* EMAIL SCHEDULES (#58) */}
          {activeSection === 'schedules' && (
            <div>
              <div className="rpt-chart-card" style={{ marginBottom: 20 }}>
                <div className="rpt-chart-header">
                  <h4><Mail width={18} height={18} /> Scheduled Email Reports</h4>
                  <button className="btn-outline-action" onClick={() => setShowScheduleForm(v => !v)}
                    style={{ background: '#244066', color: '#fff', border: 'none' }}>
                    <Plus width={14} height={14} /> New Schedule
                  </button>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>
                  Configure automated daily or weekly delivery reports sent to your email.
                </p>
              </div>

              {showScheduleForm && (
                <div className="rpt-table-card" style={{ marginBottom: 20, padding: 24 }}>
                  <h4 style={{ margin: '0 0 16px', fontWeight: 600 }}>{t("reports.create_schedule")}</h4>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>{t("reports.frequency")}</label>
                      <select className="rpt-period-select" value={scheduleForm.frequency}
                        onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))}>
                        <option value="daily">Daily (7:00 AM)</option>
                        <option value="weekly">Weekly (Monday 7:00 AM)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>
                        Recipients (comma-separated emails)
                      </label>
                      <input type="text" className="filter-date" style={{ width: '100%' }}
                        placeholder="admin@company.com, manager@company.com"
                        value={scheduleForm.recipients}
                        onChange={e => setScheduleForm(f => ({ ...f, recipients: e.target.value }))} />
                    </div>
                    <button className="btn-outline-action" onClick={createSchedule}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', height: 40 }}>
                      <Check width={14} height={14} /> Create
                    </button>
                  </div>
                </div>
              )}

              {schedules.length > 0 ? (
                <div className="rpt-table-card">
                  <table className="od-items-table">
                    <thead>
                      <tr>
                        <th>{t("reports.frequency")}</th>
                        <th>Recipients</th>
                        <th>Schedule</th>
                        <th>{t("reports.last_sent")}</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(s => {
                        const recipients = typeof s.recipients === 'string' ? JSON.parse(s.recipients) : (s.recipients || []);
                        return (
                          <tr key={s.id}>
                            <td><strong>{s.frequency === 'weekly' ? 'Weekly' : 'Daily'}</strong></td>
                            <td style={{ maxWidth: 260, wordBreak: 'break-all' }}>
                              {recipients.join(', ')}
                            </td>
                            <td style={{ color: '#64748b', fontSize: 13 }}>{s.cron_expression}</td>
                            <td>{s.last_sent ? new Date(s.last_sent).toLocaleString() : '—'}</td>
                            <td>
                              <span style={{
                                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: s.is_active ? '#dcfce7' : '#fee2e2',
                                color: s.is_active ? '#16a34a' : '#dc2626',
                              }}>
                                {s.is_active ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn-outline-action" onClick={() => toggleSchedule(s)} title={s.is_active ? 'Pause' : 'Activate'}>
                                  {s.is_active ? 'Pause' : 'Activate'}
                                </button>
                                <button className="btn-outline-action" onClick={() => sendNow(s.id)}
                                  title="Send report now" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <SendMail width={13} height={13} /> Send Now
                                </button>
                                <button className="btn-outline-action" onClick={() => deleteSchedule(s.id)}
                                  style={{ color: '#dc2626', borderColor: '#fecaca' }} title="Delete">
                                  <Trash width={13} height={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : !showScheduleForm ? (
                <div className="ord-empty">
                  <Mail width={48} height={48} />
                  <h3>No scheduled reports</h3>
                  <p>Create a schedule to receive automated daily or weekly delivery reports by email.</p>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
