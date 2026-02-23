import { useState, useEffect } from 'react';
import api from '../lib/api';

const TABS = ['General', 'Users'];

export default function Settings() {
  const [tab, setTab] = useState('General');
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'dispatcher' });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [sRes, uRes] = await Promise.all([
      api.get('/settings'),
      api.get('/settings/users'),
    ]);
    if (sRes.success) setSettings(sRes.data || {});
    if (uRes.success) setUsers(uRes.data || []);
    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const res = await api.put('/settings', settings);
    if (res.success) setSuccess('Settings saved successfully');
    else setError(res.message || 'Failed to save');
    setSaving(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setUserError('');
    const res = await api.post('/settings/users', userForm);
    if (res.success) {
      setShowAddUser(false);
      setUserForm({ full_name: '', email: '', phone: '', password: '', role: 'dispatcher' });
      api.get('/settings/users').then(r => r.success && setUsers(r.data || []));
    } else {
      setUserError(res.message || 'Failed to create user');
    }
    setSavingUser(false);
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Remove this user?')) return;
    await api.delete(`/settings/users/${id}`);
    api.get('/settings/users').then(r => r.success && setUsers(r.data || []));
  };

  const ROLE_COLORS = {
    superadmin:  { bg: '#ede9fe', color: '#7c3aed' },
    admin:       { bg: '#dbeafe', color: '#1d4ed8' },
    dispatcher:  { bg: '#dcfce7', color: '#16a34a' },
    driver:      { bg: '#fef3c7', color: '#d97706' },
    client:      { bg: '#f1f5f9', color: '#64748b' },
  };

  const settingGroups = [
    {
      title: 'Company',
      fields: [
        { key: 'company_name', label: 'Company Name' },
        { key: 'company_phone', label: 'Company Phone' },
        { key: 'company_email', label: 'Company Email', type: 'email' },
        { key: 'company_address', label: 'Company Address' },
        { key: 'vat_number', label: 'VAT Number' },
      ],
    },
    {
      title: 'Delivery Defaults',
      fields: [
        { key: 'default_emirate', label: 'Default Emirate' },
        { key: 'max_cod_amount', label: 'Max COD Amount (AED)', type: 'number' },
        { key: 'default_delivery_fee', label: 'Default Delivery Fee (AED)', type: 'number' },
        { key: 'driver_commission_percent', label: 'Driver Commission (%)', type: 'number' },
      ],
    },
    {
      title: 'Notifications',
      fields: [
        { key: 'sms_sender_id', label: 'SMS Sender ID' },
        { key: 'smtp_host', label: 'SMTP Host' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'number' },
        { key: 'smtp_user', label: 'SMTP User' },
      ],
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Settings</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Configure your delivery platform</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#f97316' : '#64748b', fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontSize: 14, boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div>
      ) : tab === 'General' ? (
        <form onSubmit={handleSaveSettings}>
          {success && <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{success}</div>}
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
          {settingGroups.map(group => (
            <div key={group.title} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{group.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {group.fields.map(({ key, label, type }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#475569' }}>{label}</label>
                    <input type={type || 'text'} value={settings[key] || ''}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      ) : (
        /* Users Tab */
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowAddUser(true)}
              style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              + Add User
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Name', 'Email', 'Phone', 'Role', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No users</td></tr>
                ) : users.map(user => {
                  const rc = ROLE_COLORS[user.role] || ROLE_COLORS.client;
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569' }}>{user.email}</td>
                      <td style={{ padding: '14px 20px', fontSize: 14, color: '#475569' }}>{user.phone || '—'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ ...rc, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{user.role}</span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '14px 20px' }}>
                        {user.role !== 'superadmin' && (
                          <button onClick={() => handleDeleteUser(user.id)}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 13 }}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showAddUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Add User</h3>
                {userError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{userError}</div>}
                <form onSubmit={handleAddUser}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                      { field: 'full_name', label: 'Full Name', required: true },
                      { field: 'email', label: 'Email', type: 'email', required: true },
                      { field: 'phone', label: 'Phone' },
                      { field: 'password', label: 'Password', type: 'password', required: true },
                    ].map(({ field, label, required, type }) => (
                      <div key={field}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}{required && ' *'}</label>
                        <input required={required} type={type || 'text'} value={userForm[field]}
                          onChange={e => setUserForm(f => ({ ...f, [field]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Role</label>
                      <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                        {['admin', 'dispatcher', 'driver', 'client'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowAddUser(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                    <button type="submit" disabled={savingUser} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                      {savingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
