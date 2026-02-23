import { useState, useEffect } from 'react';
import api from '../lib/api';

const KPI_CONFIG = [
  { key: 'orders_today',     label: 'Orders Today',       icon: '📦', color: '#f97316', bg: '#fff7ed' },
  { key: 'active_orders',    label: 'Active Orders',      icon: '🚗', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'delivered_today',  label: 'Delivered Today',    icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'failed_today',     label: 'Failed Today',       icon: '❌', color: '#dc2626', bg: '#fef2f2' },
  { key: 'revenue_today',    label: 'Revenue Today (AED)',icon: '💰', color: '#7c3aed', bg: '#faf5ff' },
  { key: 'available_drivers',label: 'Available Drivers',  icon: '🚚', color: '#0891b2', bg: '#ecfeff' },
  { key: 'pending_orders',   label: 'Pending Orders',     icon: '⏳', color: '#d97706', bg: '#fffbeb' },
  { key: 'success_rate',     label: 'Success Rate %',     icon: '📈', color: '#16a34a', bg: '#f0fdf4' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [chart, setChart] = useState([]);
  const [topZones, setTopZones] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(res => {
      if (res.success) {
        setStats(res.data?.kpis || {});
        setChart(res.data?.daily_chart || []);
        setTopZones(res.data?.top_zones || []);
        setTopDrivers(res.data?.top_drivers || []);
      }
      setLoading(false);
    });
  }, []);

  const maxOrders = Math.max(...chart.map(d => d.orders || 0), 1);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Dashboard</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 18 }}>Loading dashboard...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {KPI_CONFIG.map((kpi) => (
              <div key={kpi.key} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: '3px solid ' + kpi.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{kpi.icon}</div>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>
                  {kpi.key === 'revenue_today' ? parseFloat(stats[kpi.key] || 0).toFixed(2) : (stats[kpi.key] || 0)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Orders — Last 7 Days</h3>
              {chart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No data</div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 140 }}>
                  {chart.map((day, idx) => {
                    const pct = ((day.orders || 0) / maxOrders) * 100;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{day.orders || 0}</div>
                        <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 4, height: 100, display: 'flex', alignItems: 'flex-end' }}>
                          <div style={{ width: '100%', height: pct + '%', background: '#f97316', borderRadius: 4, minHeight: 4 }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Top Zones</h3>
              {topZones.length === 0 ? <div style={{ color: '#94a3b8' }}>No data</div> : topZones.slice(0, 5).map((zone, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < 4 ? '1px solid #f8fafc' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{zone.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{zone.emirate}</div>
                  </div>
                  <span style={{ background: '#fff7ed', color: '#f97316', padding: '3px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{zone.orders_count}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Top Drivers</h3>
              {topDrivers.length === 0 ? <div style={{ color: '#94a3b8' }}>No data</div> : topDrivers.slice(0, 5).map((driver, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < 4 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: idx === 0 ? '#f97316' : '#f1f5f9', color: idx === 0 ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{idx + 1}</div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{driver.full_name}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{driver.delivered_count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
