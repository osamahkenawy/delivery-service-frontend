import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, User, Building, TruckDelivery, Mail,
  Plus, Trash, CheckCircle, WarningCircle
} from 'iconoir-react';
import api from '../lib/api';
import './Settings.css';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ROLE_BADGE = {
  superadmin: 'badge-purple',
  admin:      'badge-blue',
  dispatcher: 'badge-green',
  driver:     'badge-yellow',
  client:     'badge-gray',
};

const SETTING_GROUPS = [
  {
    key: 'company',
    title: 'Company',
    icon: Building,
    fields: [
      { key: 'company_name',    label: 'Company Name' },
      { key: 'company_phone',   label: 'Company Phone' },
      { key: 'company_email',   label: 'Company Email',   type: 'email' },
      { key: 'company_address', label: 'Company Address', span: true },
      { key: 'vat_number',      label: 'VAT Number' },
    ],
  },
  {
    key: 'delivery',
    title: 'Delivery Defaults',
    icon: TruckDelivery,
    fields: [
      { key: 'default_emirate',          label: 'Default Emirate' },
      { key: 'max_cod_amount',           label: 'Max COD Amount (AED)',    type: 'number' },
      { key: 'default_delivery_fee',     label: 'Default Delivery Fee (AED)', type: 'number' },
      { key: 'driver_commission_percent',label: 'Driver Commission (%)',   type: 'number' },
    ],
  },
  {
    key: 'notifications',
    title: 'Notifications',
    icon: Mail,
    fields: [
      { key: 'sms_sender_id', label: 'SMS Sender ID' },
      { key: 'smtp_host',     label: 'SMTP Host' },
      { key: 'smtp_port',     label: 'SMTP Port',  type: 'number' },
      { key: 'smtp_user',     label: 'SMTP User' },
    ],
  },
];

const TABS = [
  { id: 'general', label: 'General',  icon: SettingsIcon },
  { id: 'users',   label: 'Users',    icon: User },
];

/* ════════════════════════════════════════════════════════════ */
function GeneralTab({ settings, setSettings, onSave, saving, success, error }) {
  return (
    <form onSubmit={onSave}>
      {success && (
        <div className="stg-alert stg-alert-success">
          <CheckCircle width={16} height={16} /> {success}
        </div>
      )}
      {error && (
        <div className="stg-alert stg-alert-error">
          <WarningCircle width={16} height={16} /> {error}
        </div>
      )}
      {SETTING_GROUPS.map(group => (
        <div key={group.key} className="stg-group">
          <div className="stg-group-header">
            <group.icon width={17} height={17} />
            <span>{group.title}</span>
          </div>
          <div className="stg-group-body">
            <div className="stg-fields-grid">
              {group.fields.map(({ key, label, type, span }) => (
                <div key={key} className={`form-group${span ? ' stg-span-full' : ''}`}>
                  <label>{label}</label>
                  <input
                    type={type || 'text'}
                    value={settings[key] || ''}
                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    className="form-input"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="stg-save-row">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

/* ════════════════════════════════════════════════════════════ */
function UsersTab() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ username:'', full_name:'', email:'', phone:'', password:'', role:'dispatcher' });
  const [saving,     setSaving]     = useState(false);
  const [userError,  setUserError]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/settings/users');
    if (res.success) setUsers(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async e => {
    e.preventDefault(); setSaving(true); setUserError('');
    const res = await api.post('/settings/users', form);
    if (res.success) {
      setShowModal(false);
      setForm({ username:'', full_name:'', email:'', phone:'', password:'', role:'dispatcher' });
      load();
    } else {
      setUserError(res.message || 'Failed to create user');
    }
    setSaving(false);
  };

  const del = async id => {
    if (!confirm('Remove this user?')) return;
    await api.delete(`/settings/users/${id}`);
    load();
  };

  return (
    <div>
      <div className="intg-section-header">
        <div>
          <h3 className="intg-section-title">Team Members</h3>
          <p className="intg-section-sub">{users.length} user{users.length!==1?'s':''} in your workspace</p>
        </div>
        <button className="btn-primary" onClick={() => { setUserError(''); setShowModal(true); }}>
          <Plus width={16} height={16} /> Add User
        </button>
      </div>

      {loading ? <div className="loading-state">Loading…</div>
       : users.length === 0 ? (
        <div className="empty-state">
          <User width={40} height={40} className="empty-state-icon" />
          <div className="empty-state-title">No team members yet</div>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>{['Name','Username','Email','Phone','Role','Joined','Actions'].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="td-primary">{u.full_name}</div>
                  </td>
                  <td className="td-secondary">{u.username || '—'}</td>
                  <td className="td-secondary">{u.email}</td>
                  <td className="td-secondary">{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${ROLE_BADGE[u.role]||'badge-gray'}`}>{u.role}</span>
                  </td>
                  <td className="td-secondary">{fmtDate(u.created_at)}</td>
                  <td>
                    {u.role !== 'superadmin' && (
                      <button className="btn-danger-sm" onClick={() => del(u.id)}>
                        <Trash width={13} height={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Team Member</h3>
              <button className="modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            {userError && <div className="stg-alert stg-alert-error"><WarningCircle width={15}/> {userError}</div>}
            <form onSubmit={handleAdd}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input required value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} className="form-input" placeholder="Ahmed Al Mansoori" />
                </div>
                <div className="form-group">
                  <label>Username *</label>
                  <input required value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} className="form-input" placeholder="ahmed.mansoori" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input required type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="form-input" placeholder="ahmed@company.ae" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="form-input" placeholder="+971 50 000 0000" />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input required type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="form-select">
                    {['admin','dispatcher','driver','client'].map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving?'Creating…':'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════ */
export default function Settings() {
  const [tab,      setTab]      = useState('general');
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.success) setSettings(res.data || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const res = await api.put('/settings', settings);
    if (res.success) { setSuccess('Settings saved successfully'); setTimeout(() => setSuccess(''), 3500); }
    else setError(res.message || 'Failed to save settings');
    setSaving(false);
  };

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2 className="page-heading">Settings</h2>
          <p className="page-subheading">Configure your delivery platform</p>
        </div>
      </div>

      <div className="intg-tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`intg-tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <t.icon width={15} height={15} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-state">Loading…</div>
       : tab === 'general'
          ? <GeneralTab settings={settings} setSettings={setSettings} onSave={handleSave} saving={saving} success={success} error={error} />
          : <UsersTab />
      }
    </div>
  );
}
