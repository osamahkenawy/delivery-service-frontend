import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Integrations() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', permissions: 'read' });
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const res = await api.get('/api-keys');
    if (res.success) setKeys(res.data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.post('/api-keys', form);
    if (res.success) {
      setNewKey(res.data?.key || res.data?.api_key);
      setForm({ name: '', permissions: 'read' });
      setShowCreate(false);
      fetchKeys();
    }
    setSaving(false);
  };

  const handleToggle = async (id) => {
    await api.patch('/api-keys/' + id + '/toggle');
    fetchKeys();
  };

  const handleDelete = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await api.delete('/api-keys/' + id);
    fetchKeys();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>API Keys</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Manage API keys for third-party integrations</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Create API Key
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 8 }}>✅ API Key Created Successfully</div>
          <div style={{ fontSize: 13, color: '#166534', marginBottom: 12 }}>Copy this key now — it will not be shown again!</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <code style={{ flex: 1, background: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #86efac' }}>
              {newKey}
            </code>
            <button onClick={copyKey}
              style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : '#15803d', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {keys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
              <div style={{ fontSize: 16 }}>No API keys yet</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Create your first key to start integrating</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Name', 'Key Preview', 'Permissions', 'Status', 'Last Used', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map(key => (
                  <tr key={key.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 15 }}>{key.name}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <code style={{ fontSize: 13, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, color: '#475569' }}>
                        {key.key_preview || (key.api_key ? key.api_key.substring(0, 20) + '...' : 'hidden')}
                      </code>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{key.permissions || 'read'}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: key.is_active ? '#dcfce7' : '#f1f5f9', color: key.is_active ? '#16a34a' : '#64748b' }}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{new Date(key.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleToggle(key.id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                          {key.is_active ? 'Revoke' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(key.id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Create API Key</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Key Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. WooCommerce Integration"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Permissions</label>
                <select value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                  <option value="read">Read Only</option>
                  <option value="write">Read & Write</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
