import { useState, useEffect } from 'react';
import api from '../lib/api';

const REPORTS = [
  { key: 'overview',         label: 'Overview',          icon: '📊' },
  { key: 'volume_by_day',    label: 'Daily Volume',      icon: '📅' },
  { key: 'by_zone',          label: 'By Zone',           icon: '🗺️' },
  { key: 'by_emirate',       label: 'By Emirate',        icon: '🏙️' },
  { key: 'driver_performance',label: 'Driver Performance',icon: '🚚' },
  { key: 'by_order_type',    label: 'By Order Type',     icon: '📦' },
  { key: 'by_payment_method',label: 'By Payment Method', icon: '💳' },
];

export default function Reports() {
  const [reportType, setReportType] = useState('overview');
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, [reportType, period]);

  const fetchReport = async () => {
    setLoading(true);
    const res = await api.get('/reports?type=' + reportType + '&period=' + period);
    if (res.success) {
      setData(res.data?.rows || res.data || []);
      setSummary(res.data?.summary || {});
    }
    setLoading(false);
  };

  const summaryKeys = Object.keys(summary);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Reports</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Analytics & performance insights</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* Report type nav */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'fit-content' }}>
          {REPORTS.map(r => (
            <button key={r.key} onClick={() => setReportType(r.key)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: reportType === r.key ? '#fff7ed' : 'transparent', color: reportType === r.key ? '#f97316' : '#475569', cursor: 'pointer', fontSize: 14, fontWeight: reportType === r.key ? 700 : 400, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span>{r.icon}</span>{r.label}
            </button>
          ))}
        </div>

        <div>
          {/* Summary cards */}
          {summaryKeys.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
              {summaryKeys.map(key => (
                <div key={key} style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f97316' }}>
                    {typeof summary[key] === 'number' && summary[key] > 100 ? parseFloat(summary[key]).toFixed(2) : summary[key]}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading report...</div>
          ) : data.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              No data for this period
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {Object.keys(data[0] || {}).map(col => (
                      <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} style={{ padding: '11px 16px', fontSize: 14 }}>
                          {typeof v === 'number' && k.includes('revenue') ? 'AED ' + parseFloat(v).toFixed(2) :
                           typeof v === 'number' && k.includes('rate') ? parseFloat(v).toFixed(1) + '%' :
                           (v ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
