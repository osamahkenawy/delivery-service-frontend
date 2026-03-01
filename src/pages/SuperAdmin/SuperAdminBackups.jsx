import { useState, useEffect } from 'react';
import {
  Download, Building, Database, Notes, Refresh,
  User, Package, Calendar
} from 'iconoir-react';
import './SuperAdmin.css';

const API = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('superAdminToken');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const SuperAdminBackups = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => { fetchTenants(); }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/tenants?limit=999`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setTenants(d.tenants || []); }
    } catch (_) {}
    setLoading(false);
  };

  const downloadFile = async (url, filename) => {
    try {
      setExporting(filename);
      const res = await fetch(`${API}/super-admin/${url}`, { headers: headers() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Backup & Export</h1>
          <p>Export tenant data, reports, and audit logs</p>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <div className="sa-card sa-export-card" onClick={() => downloadFile('export/tenants-csv', `tenants_${Date.now()}.csv`)}>
          <div className="sa-export-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <Building size={28} />
          </div>
          <h3>All Tenants (CSV)</h3>
          <p>Export all tenants with subscription info, user counts, and order counts</p>
          <div className="sa-export-btn">
            {exporting === `tenants_${Date.now()}.csv` ? <div className="loading-spinner small" /> : <><Download size={16} /> Download CSV</>}
          </div>
        </div>

        <div className="sa-card sa-export-card" onClick={() => downloadFile('export/audit-logs', `audit_logs_${Date.now()}.json`)}>
          <div className="sa-export-icon" style={{ background: '#faf5ff', color: '#8b5cf6' }}>
            <Notes size={28} />
          </div>
          <h3>Audit Logs (JSON)</h3>
          <p>Export all super admin activity logs for compliance and review</p>
          <div className="sa-export-btn">
            <Download size={16} /> Download JSON
          </div>
        </div>

        <div className="sa-card sa-export-card" onClick={() => downloadFile('export/platform-summary', `platform_summary_${Date.now()}.json`)}>
          <div className="sa-export-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <Database size={28} />
          </div>
          <h3>Platform Summary</h3>
          <p>Complete platform overview with stats, subscriptions, and top tenants</p>
          <div className="sa-export-btn">
            <Download size={16} /> Download JSON
          </div>
        </div>
      </div>

      {/* Tenant-specific Export */}
      <div className="sa-card" style={{ padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building size={20} /> Export Individual Tenant Data
        </h3>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>Export all data for a specific tenant including users, orders, clients, and zones</p>

        {loading ? (
          <div className="sa-loading-page"><div className="loading-spinner"></div></div>
        ) : (
          <div className="sa-table-container" style={{ maxHeight: 500, overflow: 'auto' }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th style={{ width: 120 }}>Export</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td><span className={`sa-status-badge ${t.status}`}>{t.status}</span></td>
                    <td>{t.email || '—'}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="sa-icon-btn info"
                        onClick={() => downloadFile(`export/tenant/${t.id}`, `tenant_${t.id}_${t.name?.replace(/\s/g, '_')}_${Date.now()}.json`)}
                        disabled={!!exporting}
                        title="Export as JSON"
                      >
                        {exporting?.includes(`tenant_${t.id}`) ? <div className="loading-spinner small" /> : <Download size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBackups;
