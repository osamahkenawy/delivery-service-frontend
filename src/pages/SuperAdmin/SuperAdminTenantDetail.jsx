import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building, User, Package, CheckCircle, Xmark,
  NavArrowLeft, EditPencil, Key, Play, Pause,
  Globe, Calendar, Mail, Phone, MapPin, Settings,
  Refresh, DeliveryTruck, StatsReport, Eye, Trash
} from 'iconoir-react';
import SEO from '../../components/SEO';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const SuperAdminTenantDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [showMaxUsersModal, setShowMaxUsersModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const token = localStorage.getItem('superAdminToken');
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTenant(), fetchUsage(), fetchModules()]);
    setLoading(false);
  };

  const fetchTenant = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTenant(data.tenant);
        setUsers(data.users || []);
        setSubscription(data.subscription || null);
        setEditForm({
          name: data.tenant.name || '',
          email: data.tenant.email || '',
          phone: data.tenant.phone || '',
          city: data.tenant.city || '',
          country: data.tenant.country || '',
          industry: data.tenant.industry || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch tenant:', err);
    }
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/usage`, { headers });
      if (res.ok) {
        setUsage(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/modules`, { headers });
      if (res.ok) {
        setAvailableModules(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  };

  const saveTenant = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchTenant();
        setEditMode(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (newStatus) => {
    try {
      await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/toggle-status`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchTenant();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const updateMaxUsers = async (val) => {
    try {
      await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/max-users`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ max_users: parseInt(val) }),
      });
      await fetchTenant();
      setShowMaxUsersModal(false);
    } catch (err) {
      console.error('Failed to update max users:', err);
    }
  };

  const updateModules = async () => {
    try {
      await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/modules`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ modules: selectedModules }),
      });
      await fetchTenant();
      setShowModulesModal(false);
    } catch (err) {
      console.error('Failed to update modules:', err);
    }
  };

  const impersonate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}/impersonate`, {
        method: 'POST', headers,
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        if (data.user?.tenant_id) {
          localStorage.setItem('crm_tenant', JSON.stringify({ id: data.user.tenant_id }));
        }
        window.open('/dashboard', '_blank');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to impersonate');
      }
    } catch (err) {
      console.error('Failed to impersonate:', err);
    }
  };

  const deleteTenant = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/super-admin/tenants/${id}`, {
        method: 'DELETE', headers,
      });
      if (res.ok) {
        navigate('/super-admin/tenants');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openModulesModal = () => {
    const tenantSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings || '{}') : (tenant.settings || {});
    const current = tenantSettings.allowed_modules || availableModules.map(m => m.id);
    setSelectedModules(Array.isArray(current) ? current : availableModules.map(m => m.id));
    setShowModulesModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="sa-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="sa-empty">
        <h2>Tenant not found</h2>
        <button className="sa-primary-btn" onClick={() => navigate('/super-admin/tenants')}>
          <NavArrowLeft size={18} /> Back to Tenants
        </button>
      </div>
    );
  }

  const tenantSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings || '{}') : (tenant.settings || {});
  const allowedModules = tenantSettings.allowed_modules || [];

  return (
    <div className="sa-tenant-detail">
      <SEO page="superAdminTenantDetail" noindex={true} />

      {/* Header */}
      <div className="sa-detail-header">
        <button className="sa-back-btn" onClick={() => navigate('/super-admin/tenants')}>
          <NavArrowLeft size={20} /> Back
        </button>
        <div className="sa-detail-title">
          <div className="sa-tenant-avatar large">
            {tenant.logo_url ? (
              <img src={`${API_BASE_URL.replace('/api', '')}${tenant.logo_url}`} alt={tenant.name} />
            ) : (
              tenant.name?.charAt(0)
            )}
          </div>
          <div>
            <h1>{tenant.name}</h1>
            <div className="sa-detail-meta">
              <span className={`sa-status-badge ${getStatusColor(tenant.status)}`}>{tenant.status}</span>
              <span className="sa-meta-item"><Globe size={14} /> {tenant.slug}</span>
              <span className="sa-meta-item"><Calendar size={14} /> Created {new Date(tenant.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="sa-detail-actions">
          {tenant.status === 'active' ? (
            <button className="sa-btn warning" onClick={() => toggleStatus('suspended')}>
              <Pause size={16} /> Suspend
            </button>
          ) : (
            <button className="sa-btn success" onClick={() => toggleStatus('active')}>
              <Play size={16} /> Activate
            </button>
          )}
          <button className="sa-btn primary" onClick={impersonate}>
            <Key size={16} /> Login as Admin
          </button>
          {!tenantSettings.isPlatformOwner && (
            <button className="sa-btn danger" onClick={() => setShowDeleteConfirm(true)}>
              <Trash size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-tabs">
        {['overview', 'users', 'modules', 'settings'].map(tab => (
          <button
            key={tab}
            className={`sa-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="sa-tab-content">
          {/* Stats Cards */}
          <div className="sa-detail-stats">
            <div className="sa-stat-card">
              <div className="sa-stat-icon blue"><User size={22} /></div>
              <div className="sa-stat-info">
                <span className="sa-stat-value">{users.length}</span>
                <span className="sa-stat-label">Total Users</span>
              </div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-icon green"><CheckCircle size={22} /></div>
              <div className="sa-stat-info">
                <span className="sa-stat-value">{users.filter(u => u.is_active).length}</span>
                <span className="sa-stat-label">Active Users</span>
              </div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-icon purple"><Package size={22} /></div>
              <div className="sa-stat-info">
                <span className="sa-stat-value">{usage?.orders || 0}</span>
                <span className="sa-stat-label">Total Orders</span>
              </div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-icon orange"><DeliveryTruck size={22} /></div>
              <div className="sa-stat-info">
                <span className="sa-stat-value">{usage?.delivered_orders || 0}</span>
                <span className="sa-stat-label">Delivered</span>
              </div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-icon teal"><StatsReport size={22} /></div>
              <div className="sa-stat-info">
                <span className="sa-stat-value">{tenant.max_users || subscription?.max_users || 10}</span>
                <span className="sa-stat-label">Max Users</span>
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="sa-detail-grid">
            <div className="sa-card">
              <div className="sa-card-header">
                <h3>Company Information</h3>
                <button className="sa-btn-icon" onClick={() => setEditMode(!editMode)}>
                  <EditPencil size={16} />
                </button>
              </div>
              <div className="sa-card-body">
                {editMode ? (
                  <div className="sa-form-grid">
                    <div className="sa-form-group">
                      <label>Company Name</label>
                      <input value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Email</label>
                      <input value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Phone</label>
                      <input value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} />
                    </div>
                    <div className="sa-form-group">
                      <label>City</label>
                      <input value={editForm.city} onChange={e => setEditForm(p => ({...p, city: e.target.value}))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Country</label>
                      <input value={editForm.country} onChange={e => setEditForm(p => ({...p, country: e.target.value}))} />
                    </div>
                    <div className="sa-form-group">
                      <label>Industry</label>
                      <select value={editForm.industry} onChange={e => setEditForm(p => ({...p, industry: e.target.value}))}>
                        <option value="">Select</option>
                        <option value="delivery">Delivery & Logistics</option>
                        <option value="ecommerce">E-Commerce</option>
                        <option value="food">Food & Restaurant</option>
                        <option value="retail">Retail</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="sa-form-actions" style={{gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                      <button className="sa-btn secondary" onClick={() => setEditMode(false)}>Cancel</button>
                      <button className="sa-btn primary" onClick={saveTenant} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="sa-info-list">
                    <div className="sa-info-row">
                      <span className="sa-info-label"><Mail size={14} /> Email</span>
                      <span className="sa-info-value">{tenant.email || '–'}</span>
                    </div>
                    <div className="sa-info-row">
                      <span className="sa-info-label"><Phone size={14} /> Phone</span>
                      <span className="sa-info-value">{tenant.phone || '–'}</span>
                    </div>
                    <div className="sa-info-row">
                      <span className="sa-info-label"><MapPin size={14} /> Location</span>
                      <span className="sa-info-value">{[tenant.city, tenant.country].filter(Boolean).join(', ') || '–'}</span>
                    </div>
                    <div className="sa-info-row">
                      <span className="sa-info-label"><Building size={14} /> Industry</span>
                      <span className="sa-info-value">{tenant.industry || '–'}</span>
                    </div>
                    <div className="sa-info-row">
                      <span className="sa-info-label"><Globe size={14} /> Subdomain</span>
                      <span className="sa-info-value">{tenant.slug}</span>
                    </div>
                    <div className="sa-info-row">
                      <span className="sa-info-label"><Settings size={14} /> Currency</span>
                      <span className="sa-info-value">{tenant.currency || 'AED'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sa-card">
              <div className="sa-card-header">
                <h3>Subscription</h3>
                <button className="sa-btn-icon" onClick={() => setShowMaxUsersModal(true)}>
                  <EditPencil size={16} />
                </button>
              </div>
              <div className="sa-card-body">
                <div className="sa-info-list">
                  <div className="sa-info-row">
                    <span className="sa-info-label">Plan</span>
                    <span className="sa-info-value sa-plan-badge">{subscription?.plan || tenant.plan || 'trial'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Max Users</span>
                    <span className="sa-info-value">{tenant.max_users || subscription?.max_users || 10}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Current Users</span>
                    <span className="sa-info-value">{users.length}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Trial Ends</span>
                    <span className="sa-info-value">{tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString() : '–'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Status</span>
                    <span className="sa-info-value">
                      <span className={`sa-status-badge ${subscription?.status === 'active' ? 'success' : 'warning'}`}>
                        {subscription?.status || 'active'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          {usage && (
            <div className="sa-card" style={{marginTop: 16}}>
              <div className="sa-card-header"><h3>Usage Statistics</h3></div>
              <div className="sa-card-body">
                <div className="sa-usage-grid">
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.orders || 0}</span>
                    <span className="sa-usage-label">Orders</span>
                  </div>
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.delivered_orders || 0}</span>
                    <span className="sa-usage-label">Delivered</span>
                  </div>
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.drivers || 0}</span>
                    <span className="sa-usage-label">Drivers</span>
                  </div>
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.clients || 0}</span>
                    <span className="sa-usage-label">Clients</span>
                  </div>
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.zones || 0}</span>
                    <span className="sa-usage-label">Zones</span>
                  </div>
                  <div className="sa-usage-item">
                    <span className="sa-usage-value">{usage.users || 0}</span>
                    <span className="sa-usage-label">Users</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="sa-tab-content">
          <div className="sa-card">
            <div className="sa-card-header"><h3>Users ({users.length})</h3></div>
            <div className="sa-table-wrapper">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="sa-tenant-name">
                          <div className="sa-tenant-avatar small">{u.full_name?.charAt(0) || u.username?.charAt(0)}</div>
                          <div>
                            <span className="sa-tenant-company">{u.full_name || u.username}</span>
                            <span className="sa-tenant-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="sa-role-badge">{u.role}</span></td>
                      <td>
                        <span className={`sa-status-badge ${u.is_active ? 'success' : 'danger'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '–'}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === 'modules' && (
        <div className="sa-tab-content">
          <div className="sa-card">
            <div className="sa-card-header">
              <h3>Allowed Modules</h3>
              <button className="sa-btn primary" onClick={openModulesModal}>
                <EditPencil size={16} /> Configure
              </button>
            </div>
            <div className="sa-card-body">
              <div className="sa-modules-status-grid">
                {availableModules.map(m => {
                  const isAllowed = allowedModules.length === 0 || allowedModules.includes(m.id);
                  return (
                    <div key={m.id} className={`sa-module-status-card ${isAllowed ? 'enabled' : 'disabled'}`}>
                      <div className="sa-module-status-icon">
                        {isAllowed ? <CheckCircle size={20} /> : <Xmark size={20} />}
                      </div>
                      <div className="sa-module-status-info">
                        <span className="sa-module-status-name">{m.name}</span>
                        <span className="sa-module-status-cat">{m.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="sa-tab-content">
          <div className="sa-detail-grid">
            <div className="sa-card">
              <div className="sa-card-header"><h3>Tenant Settings</h3></div>
              <div className="sa-card-body">
                <div className="sa-info-list">
                  <div className="sa-info-row">
                    <span className="sa-info-label">Timezone</span>
                    <span className="sa-info-value">{tenant.timezone || 'Asia/Dubai'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Currency</span>
                    <span className="sa-info-value">{tenant.currency || 'AED'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Language</span>
                    <span className="sa-info-value">{tenant.language || 'en'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Platform Owner</span>
                    <span className="sa-info-value">{tenantSettings.isPlatformOwner ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="sa-info-row">
                    <span className="sa-info-label">Demo Mode</span>
                    <span className="sa-info-value">{tenantSettings.isDemo ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="sa-card">
              <div className="sa-card-header"><h3>Raw Settings (JSON)</h3></div>
              <div className="sa-card-body">
                <pre className="sa-json-view">{JSON.stringify(tenantSettings, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Max Users Modal */}
      {showMaxUsersModal && (
        <div className="sa-modal-overlay" onClick={() => setShowMaxUsersModal(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Set Max Users</h3>
              <button className="sa-modal-close" onClick={() => setShowMaxUsersModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <p>Set maximum users for <strong>{tenant.name}</strong></p>
              <div className="sa-form-group">
                <label>Max Users</label>
                <input type="number" min="1" defaultValue={tenant.max_users || subscription?.max_users || 10} id="detailMaxUsersInput" className="sa-input" />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowMaxUsersModal(false)}>Cancel</button>
              <button className="sa-btn primary" onClick={() => updateMaxUsers(document.getElementById('detailMaxUsersInput').value)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules Modal */}
      {showModulesModal && (
        <div className="sa-modal-overlay" onClick={() => setShowModulesModal(false)}>
          <div className="sa-modal large" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Configure Modules for {tenant.name}</h3>
              <button className="sa-modal-close" onClick={() => setShowModulesModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <p>Select which modules this tenant can access:</p>
              <div className="sa-modules-grid">
                {availableModules.map(m => (
                  <label key={m.id} className="sa-module-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(m.id)}
                      onChange={() => {
                        setSelectedModules(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]);
                      }}
                    />
                    <div className="sa-module-info">
                      <span className="sa-module-name">{m.name}</span>
                      <span className="sa-module-category">{m.category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowModulesModal(false)}>Cancel</button>
              <button className="sa-btn primary" onClick={updateModules}>Save Modules</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="sa-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Delete Tenant</h3>
              <button className="sa-modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-danger-notice">
                <Xmark size={24} />
                <div>
                  <strong>This action cannot be undone!</strong>
                  <p>This will permanently delete <strong>{tenant.name}</strong> and all associated data including users, orders, and configurations.</p>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="sa-btn danger" onClick={deleteTenant}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTenantDetail;
