import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building, Search, Plus, Eye, EditPencil, 
  CheckCircle, Xmark, User, Package, Settings,
  Refresh, Play, Pause, Key
} from 'iconoir-react';
import SEO from '../../components/SEO';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import './SuperAdmin.css';

const SuperAdminTenants = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', city: '', country: '', industry: '', max_users: 10 });
  const [creating, setCreating] = useState(false);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    fetchTenants();
    fetchModules();
  }, [statusFilter, searchQuery]);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${API_BASE_URL}/super-admin/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${API_BASE_URL}/super-admin/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableModules(data);
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    }
  };

  const toggleStatus = async (tenant, newStatus) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      await fetch(`${API_BASE_URL}/super-admin/tenants/${tenant.id}/toggle-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTenants();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const updateMaxUsers = async (tenantId, maxUsers) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      await fetch(`${API_BASE_URL}/super-admin/tenants/${tenantId}/max-users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_users: parseInt(maxUsers) }),
      });
      fetchTenants();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to update max users:', error);
    }
  };

  const updateModules = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      await fetch(`${API_BASE_URL}/super-admin/tenants/${selectedTenant.id}/modules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modules: selectedModules }),
      });
      fetchTenants();
      setShowModulesModal(false);
    } catch (error) {
      console.error('Failed to update modules:', error);
    }
  };

  const impersonate = async (tenantId) => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${API_BASE_URL}/super-admin/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
        if (data.user?.tenant_id) {
          localStorage.setItem('crm_tenant', JSON.stringify({ id: data.user.tenant_id }));
        }
        window.open('/dashboard', '_blank');
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to impersonate');
      }
    } catch (error) {
      console.error('Failed to impersonate:', error);
    }
  };

  const createTenant = async () => {
    try {
      setCreating(true);
      const token = localStorage.getItem('superAdminToken');
      const response = await fetch(`${API_BASE_URL}/super-admin/tenants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (response.ok) {
        const result = await response.json();
        setShowCreateModal(false);
        setCreateForm({ name: '', email: '', phone: '', city: '', country: '', industry: '', max_users: 10 });
        fetchTenants();
        alert(`Tenant "${result.tenant?.name}" created successfully!\n\nDefault admin credentials:\nUsername: admin_${result.tenant?.slug}\nPassword: ${result.defaultPassword || 'Admin@123'}`);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Failed to create tenant:', error);
    } finally {
      setCreating(false);
    }
  };

  const openModulesModal = (tenant) => {
    setSelectedTenant(tenant);
    const tenantSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings || '{}') : (tenant.settings || {});
    const currentModules = tenantSettings.allowed_modules ? 
      (typeof tenantSettings.allowed_modules === 'string' ? JSON.parse(tenantSettings.allowed_modules) : tenantSettings.allowed_modules) : 
      availableModules.map(m => m.id);
    setSelectedModules(currentModules);
    setShowModulesModal(true);
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="sa-tenants">
      <SEO page="superAdminTenants" noindex={true} />
      <div className="sa-page-header">
        <div>
          <h1>Tenant Management</h1>
          <p>Manage all CRM client accounts</p>
        </div>
        <div className="sa-header-actions">
          <button className="sa-primary-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>New Tenant</span>
          </button>
          <button className="sa-secondary-btn" onClick={fetchTenants}>
            <Refresh size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="sa-filters">
        <div className="sa-search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sa-filter-select"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Tenants Table */}
      <div className="sa-card">
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Users</th>
                <th>Max Users</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="sa-loading-row">
                    <div className="loading-spinner"></div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sa-empty-row">
                    No tenants found
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td>
                      <div className="sa-tenant-name">
                        <div className="sa-tenant-avatar">
                          {tenant.name?.charAt(0)}
                        </div>
                        <div>
                          <span className="sa-tenant-company">{tenant.name}</span>
                          <span className="sa-tenant-email">{tenant.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{tenant.industry || '-'}</td>
                    <td>
                      <span className="sa-user-count">
                        <User size={14} />
                        {tenant.user_count || 0}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="sa-editable-value"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setShowModal(true);
                        }}
                      >
                        {tenant.max_users || 10}
                        <EditPencil size={12} />
                      </button>
                    </td>
                    <td>
                      <span className={`sa-status-badge ${getStatusColor(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td>{new Date(tenant.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="sa-actions">
                        <button
                          className="sa-action-btn"
                          title="View Details"
                          onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="sa-action-btn"
                          title="Configure Modules"
                          onClick={() => openModulesModal(tenant)}
                        >
                          <Package size={18} />
                        </button>
                        {tenant.status === 'active' ? (
                          <button
                            className="sa-action-btn warning"
                            title="Suspend"
                            onClick={() => toggleStatus(tenant, 'suspended')}
                          >
                            <Pause size={18} />
                          </button>
                        ) : (
                          <button
                            className="sa-action-btn success"
                            title="Activate"
                            onClick={() => toggleStatus(tenant, 'active')}
                          >
                            <Play size={18} />
                          </button>
                        )}
                        <button
                          className="sa-action-btn"
                          title="Login as Admin"
                          onClick={() => impersonate(tenant.id)}
                        >
                          <Key size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Max Users Modal */}
      {showModal && selectedTenant && (
        <div className="sa-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Set Max Users</h3>
              <button className="sa-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <p>Set maximum number of users for <strong>{selectedTenant.name}</strong></p>
              <div className="sa-form-group">
                <label>Max Users</label>
                <input
                  type="number"
                  min="1"
                  defaultValue={selectedTenant.max_users || 10}
                  id="maxUsersInput"
                  className="sa-input"
                />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button 
                className="sa-btn primary"
                onClick={() => {
                  const input = document.getElementById('maxUsersInput');
                  updateMaxUsers(selectedTenant.id, input.value);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules Modal */}
      {showModulesModal && selectedTenant && (
        <div className="sa-modal-overlay" onClick={() => setShowModulesModal(false)}>
          <div className="sa-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Configure Modules for {selectedTenant.name}</h3>
              <button className="sa-modal-close" onClick={() => setShowModulesModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <p>Select which modules this tenant can access:</p>
              <div className="sa-modules-grid">
                {availableModules.map((module) => (
                  <label key={module.id} className="sa-module-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                    />
                    <div className="sa-module-info">
                      <span className="sa-module-name">{module.name}</span>
                      <span className="sa-module-category">{module.category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowModulesModal(false)}>
                Cancel
              </button>
              <button className="sa-btn primary" onClick={updateModules}>
                Save Modules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="sa-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="sa-modal large" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h3>Create New Tenant</h3>
              <button className="sa-modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Company Name *</label>
                  <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" />
                </div>
                <div className="sa-form-group">
                  <label>Email *</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@company.com" />
                </div>
                <div className="sa-form-group">
                  <label>Phone</label>
                  <input type="text" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971..." />
                </div>
                <div className="sa-form-group">
                  <label>Industry</label>
                  <select value={createForm.industry} onChange={e => setCreateForm(p => ({ ...p, industry: e.target.value }))}>
                    <option value="">Select Industry</option>
                    <option value="delivery">Delivery & Logistics</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="food">Food & Restaurant</option>
                    <option value="retail">Retail</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>City</label>
                  <input type="text" value={createForm.city} onChange={e => setCreateForm(p => ({ ...p, city: e.target.value }))} placeholder="Dubai" />
                </div>
                <div className="sa-form-group">
                  <label>Country</label>
                  <input type="text" value={createForm.country} onChange={e => setCreateForm(p => ({ ...p, country: e.target.value }))} placeholder="UAE" />
                </div>
                <div className="sa-form-group">
                  <label>Max Users</label>
                  <input type="number" min="1" value={createForm.max_users} onChange={e => setCreateForm(p => ({ ...p, max_users: parseInt(e.target.value) || 10 }))} />
                </div>
              </div>
              <div className="sa-info-box" style={{ marginTop: 16 }}>
                <CheckCircle size={18} />
                <span>A default admin user will be created with password <strong>Admin@123</strong></span>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-btn secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="sa-btn primary" onClick={createTenant} disabled={creating || !createForm.name || !createForm.email}>
                {creating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTenants;

