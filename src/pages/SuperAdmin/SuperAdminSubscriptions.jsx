import { useState, useEffect } from 'react';
import {
  CreditCard, Plus, EditPencil, Trash, CheckCircle, Clock,
  Xmark, Eye, Building, Refresh, Search, Filter
} from 'iconoir-react';
import './SuperAdmin.css';

const API = import.meta.env.VITE_API_URL || '/api';
const token = () => localStorage.getItem('superAdminToken');
const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

const PLAN_COLORS = {
  trial: '#6b7280', starter: '#3b82f6', professional: '#8b5cf6',
  enterprise: '#f59e0b', self_hosted: '#10b981', pro: '#8b5cf6'
};

const SuperAdminSubscriptions = () => {
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({});
  const [tenants, setTenants] = useState([]);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'plans') {
        const res = await fetch(`${API}/super-admin/plans`, { headers: headers() });
        if (res.ok) setPlans(await res.json());
      } else if (tab === 'subscriptions') {
        const res = await fetch(`${API}/super-admin/subscriptions`, { headers: headers() });
        if (res.ok) { const d = await res.json(); setSubscriptions(d.subscriptions || []); }
      } else if (tab === 'invoices') {
        const res = await fetch(`${API}/super-admin/invoices`, { headers: headers() });
        if (res.ok) { const d = await res.json(); setInvoices(d.invoices || []); }
        const tres = await fetch(`${API}/super-admin/tenants?limit=999`, { headers: headers() });
        if (tres.ok) { const td = await tres.json(); setTenants(td.tenants || []); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const savePlan = async () => {
    try {
      const res = await fetch(`${API}/super-admin/plans`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(editPlan)
      });
      if (res.ok) { setShowPlanModal(false); setEditPlan(null); fetchData(); }
    } catch (e) { console.error(e); }
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    await fetch(`${API}/super-admin/plans/${id}`, { method: 'DELETE', headers: headers() });
    fetchData();
  };

  const updateSubscription = async () => {
    if (!editSub) return;
    await fetch(`${API}/super-admin/subscriptions/${editSub.id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(editSub)
    });
    setEditSub(null); fetchData();
  };

  const createInvoice = async () => {
    await fetch(`${API}/super-admin/invoices`, {
      method: 'POST', headers: headers(), body: JSON.stringify(invoiceForm)
    });
    setShowInvoiceModal(false); setInvoiceForm({}); fetchData();
  };

  const updateInvoiceStatus = async (id, status) => {
    await fetch(`${API}/super-admin/invoices/${id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ status })
    });
    fetchData();
  };

  const fmtCur = (n) => `AED ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const safeFeatures = (f) => { if (Array.isArray(f)) return f; if (typeof f === 'string') { try { const p = JSON.parse(f); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Subscriptions & Billing</h1>
          <p>Manage plans, subscriptions, and invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-tabs" style={{ marginBottom: 20 }}>
        {['plans', 'subscriptions', 'invoices'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`sa-tab ${tab === t ? 'active' : ''}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sa-loading-page"><div className="loading-spinner"></div></div>
      ) : (
        <>
          {/* PLANS TAB */}
          {tab === 'plans' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="sa-primary-btn" onClick={() => { setEditPlan({ name: '', slug: '', description: '', max_drivers: 10, max_users: 5, max_orders_per_month: 1000, price_aed: 0, setup_fee_aed: 0, features: [], is_active: true, base_stops: 0, extra_rate_aed: 0, is_featured: false, badge_key: '', landing_features: [], landing_visible: true, sort_order: 0 }); setShowPlanModal(true); }}>
                  <Plus size={16} /> New Plan
                </button>
              </div>
              <div className="sa-plans-grid">
                {plans.map(plan => {
                  const planColor = PLAN_COLORS[plan.slug] || PLAN_COLORS[plan.name?.toLowerCase()] || '#3b82f6';
                  return (
                  <div key={plan.id} className="sa-plan-card">
                    <div className="sa-plan-header" style={{ borderBottomColor: planColor }}>
                      <h3>{plan.name} {plan.is_featured ? <span style={{ fontSize: 11, background: '#3b82f620', color: '#3b82f6', padding: '2px 8px', borderRadius: 8, marginLeft: 6 }}>★ Featured</span> : null}</h3>
                      <span className="sa-badge-pill" style={{ background: plan.is_active ? '#dcfce7' : '#fef2f2', color: plan.is_active ? '#16a34a' : '#dc2626' }}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {plan.description && <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 4px', fontStyle: 'italic' }}>{plan.description}</p>}
                    <div className="sa-plan-price">{fmtCur(plan.price_aed)}<span>/mo</span></div>
                    {plan.setup_fee_aed > 0 && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -4 }}>One-time setup: {fmtCur(plan.setup_fee_aed)}</div>}
                    {plan.base_stops > 0 && (
                      <div style={{ fontSize: 12, color: '#6366f1', marginTop: 4, fontWeight: 500 }}>
                        🚚 {Number(plan.base_stops).toLocaleString()} base stops · +{Number(plan.extra_rate_aed || 0).toFixed(4)} AED/extra
                      </div>
                    )}
                    <div className="sa-plan-features">
                      <div className="sa-plan-limit"><strong>{plan.max_users || 5}</strong> Users</div>
                      <div className="sa-plan-limit"><strong>{plan.max_drivers}</strong> Drivers</div>
                      <div className="sa-plan-limit"><strong>{Number(plan.max_orders_per_month).toLocaleString()}</strong> Orders/mo</div>
                      {safeFeatures(plan.features).map((f, i) => (
                        <div key={i} className="sa-plan-feature"><CheckCircle size={14} style={{ color: planColor }} /> {f}</div>
                      ))}
                    </div>
                    {plan.landing_visible ? (
                      <div style={{ fontSize: 11, color: '#10b981', marginTop: 6 }}>✓ Visible on landing page (order: {plan.sort_order})</div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Hidden from landing page</div>
                    )}
                    <div className="sa-plan-actions">
                      <button onClick={() => { setEditPlan(plan); setShowPlanModal(true); }} className="sa-icon-btn"><EditPencil size={16} /></button>
                      <button onClick={() => deletePlan(plan.id)} className="sa-icon-btn danger"><Trash size={16} /></button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SUBSCRIPTIONS TAB */}
          {tab === 'subscriptions' && (
            <div className="sa-card">
              <div className="sa-table-container">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Max Users</th>
                      <th>Billing</th>
                      <th>Monthly</th>
                      <th>Period End</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id}>
                        <td><strong>{sub.tenant_name || `Tenant #${sub.tenant_id}`}</strong></td>
                        <td>
                          <span className="sa-badge-pill" style={{ background: `${PLAN_COLORS[sub.plan] || '#6b7280'}20`, color: PLAN_COLORS[sub.plan] || '#6b7280' }}>
                            {sub.plan}
                          </span>
                        </td>
                        <td>
                          <span className={`sa-status-badge ${sub.status}`}>{sub.status}</span>
                        </td>
                        <td>{sub.max_users}</td>
                        <td>{sub.billing_cycle}</td>
                        <td>{fmtCur(sub.price_monthly)}</td>
                        <td>{fmtDate(sub.current_period_end)}</td>
                        <td>
                          <button className="sa-icon-btn" onClick={() => setEditSub({ ...sub })}>
                            <EditPencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVOICES TAB */}
          {tab === 'invoices' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="sa-primary-btn" onClick={() => setShowInvoiceModal(true)}>
                  <Plus size={16} /> Create Invoice
                </button>
              </div>
              <div className="sa-card">
                <div className="sa-table-container">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Tenant</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Paid At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td><code>{inv.invoice_number}</code></td>
                          <td>{inv.tenant_name || `#${inv.tenant_id}`}</td>
                          <td><strong>{fmtCur(inv.amount)}</strong></td>
                          <td>
                            <span className={`sa-status-badge ${inv.status}`}>{inv.status}</span>
                          </td>
                          <td>{fmtDate(inv.due_date)}</td>
                          <td>{fmtDate(inv.paid_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {inv.status !== 'paid' && (
                                <button className="sa-icon-btn success" onClick={() => updateInvoiceStatus(inv.id, 'paid')} title="Mark Paid">
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {inv.status === 'draft' && (
                                <button className="sa-icon-btn info" onClick={() => updateInvoiceStatus(inv.id, 'sent')} title="Mark Sent">
                                  <Eye size={16} />
                                </button>
                              )}
                              {inv.status === 'sent' && (
                                <button className="sa-icon-btn warning" onClick={() => updateInvoiceStatus(inv.id, 'overdue')} title="Mark Overdue">
                                  <Clock size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No invoices yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Plan Modal */}
      {showPlanModal && editPlan && (
        <div className="sa-modal-backdrop" onClick={() => setShowPlanModal(false)}>
          <div className="sa-modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>{editPlan.id ? 'Edit Plan' : 'New Plan'}</h2>
              <button className="sa-modal-close" onClick={() => setShowPlanModal(false)}>×</button>
            </div>
            <div className="sa-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Core Plan Fields */}
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 10px', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>Core Plan Settings</h4>
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Plan Name</label>
                  <input value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })} />
                </div>
                <div className="sa-form-group">
                  <label>Slug</label>
                  <input value={editPlan.slug} onChange={e => setEditPlan({ ...editPlan, slug: e.target.value })} />
                </div>
                <div className="sa-form-group full-width">
                  <label>Description</label>
                  <input value={editPlan.description || ''} onChange={e => setEditPlan({ ...editPlan, description: e.target.value })} placeholder="Brief plan description" />
                </div>
                <div className="sa-form-group">
                  <label>Price (AED/mo)</label>
                  <input type="number" value={editPlan.price_aed} onChange={e => setEditPlan({ ...editPlan, price_aed: parseFloat(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Setup Fee (AED)</label>
                  <input type="number" value={editPlan.setup_fee_aed || 0} onChange={e => setEditPlan({ ...editPlan, setup_fee_aed: parseFloat(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Max Users</label>
                  <input type="number" value={editPlan.max_users || 5} onChange={e => setEditPlan({ ...editPlan, max_users: parseInt(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Max Drivers</label>
                  <input type="number" value={editPlan.max_drivers} onChange={e => setEditPlan({ ...editPlan, max_drivers: parseInt(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Max Orders/Month</label>
                  <input type="number" value={editPlan.max_orders_per_month} onChange={e => setEditPlan({ ...editPlan, max_orders_per_month: parseInt(e.target.value) })} />
                </div>
                <div className="sa-form-group full-width">
                  <label>Features (comma-separated)</label>
                  <textarea
                    rows={3}
                    value={safeFeatures(editPlan.features).join(', ')}
                    onChange={e => setEditPlan({ ...editPlan, features: e.target.value.split(',').map(f => f.trim()).filter(Boolean) })}
                    placeholder="Feature 1, Feature 2, ..."
                  />
                </div>
              </div>

              {/* Landing Page Pricing Section */}
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#6366f1', margin: '18px 0 10px', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>🌐 Landing Page Pricing</h4>
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Base Stops (included deliveries)</label>
                  <input type="number" value={editPlan.base_stops || 0} onChange={e => setEditPlan({ ...editPlan, base_stops: parseInt(e.target.value) })} placeholder="e.g. 1000" />
                </div>
                <div className="sa-form-group">
                  <label>Extra Rate (AED/delivery)</label>
                  <input type="number" step="0.0001" value={editPlan.extra_rate_aed || 0} onChange={e => setEditPlan({ ...editPlan, extra_rate_aed: parseFloat(e.target.value) })} placeholder="e.g. 0.04" />
                </div>
                <div className="sa-form-group">
                  <label>Sort Order</label>
                  <input type="number" value={editPlan.sort_order || 0} onChange={e => setEditPlan({ ...editPlan, sort_order: parseInt(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Badge i18n Key</label>
                  <input value={editPlan.badge_key || ''} onChange={e => setEditPlan({ ...editPlan, badge_key: e.target.value })} placeholder="e.g. pricing.bestForFleets" />
                </div>
                <div className="sa-form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editPlan.is_featured} onChange={e => setEditPlan({ ...editPlan, is_featured: e.target.checked })} />
                    Featured Plan
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editPlan.landing_visible !== false && editPlan.landing_visible !== 0} onChange={e => setEditPlan({ ...editPlan, landing_visible: e.target.checked })} />
                    Visible on Landing
                  </label>
                </div>
                <div className="sa-form-group full-width">
                  <label>Landing Feature Keys (comma-separated i18n keys)</label>
                  <textarea
                    rows={2}
                    value={safeFeatures(editPlan.landing_features).join(', ')}
                    onChange={e => setEditPlan({ ...editPlan, landing_features: e.target.value.split(',').map(f => f.trim()).filter(Boolean) })}
                    placeholder="starterF1, starterF2, starterF3"
                  />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-secondary-btn" onClick={() => setShowPlanModal(false)}>Cancel</button>
              <button className="sa-primary-btn" onClick={savePlan}>Save Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Edit Modal */}
      {editSub && (
        <div className="sa-modal-backdrop" onClick={() => setEditSub(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Edit Subscription — {editSub.tenant_name}</h2>
              <button className="sa-modal-close" onClick={() => setEditSub(null)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Plan</label>
                  <select value={editSub.plan} onChange={e => setEditSub({ ...editSub, plan: e.target.value })}>
                    <option value="trial">Trial</option><option value="starter">Starter</option>
                    <option value="professional">Professional</option><option value="enterprise">Enterprise</option>
                    <option value="self_hosted">Self-hosted</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Status</label>
                  <select value={editSub.status} onChange={e => setEditSub({ ...editSub, status: e.target.value })}>
                    <option value="active">Active</option><option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option><option value="paused">Paused</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Max Users</label>
                  <input type="number" value={editSub.max_users} onChange={e => setEditSub({ ...editSub, max_users: parseInt(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Billing Cycle</label>
                  <select value={editSub.billing_cycle} onChange={e => setEditSub({ ...editSub, billing_cycle: e.target.value })}>
                    <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Monthly Price (AED)</label>
                  <input type="number" value={editSub.price_monthly} onChange={e => setEditSub({ ...editSub, price_monthly: parseFloat(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Period End</label>
                  <input type="date" value={editSub.current_period_end?.substring(0, 10) || ''} onChange={e => setEditSub({ ...editSub, current_period_end: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-secondary-btn" onClick={() => setEditSub(null)}>Cancel</button>
              <button className="sa-primary-btn" onClick={updateSubscription}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Create Modal */}
      {showInvoiceModal && (
        <div className="sa-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Create Invoice</h2>
              <button className="sa-modal-close" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Tenant</label>
                  <select value={invoiceForm.tenant_id || ''} onChange={e => setInvoiceForm({ ...invoiceForm, tenant_id: parseInt(e.target.value) })}>
                    <option value="">Select tenant...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Amount (AED)</label>
                  <input type="number" step="0.01" value={invoiceForm.amount || ''} onChange={e => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) })} />
                </div>
                <div className="sa-form-group">
                  <label>Due Date</label>
                  <input type="date" value={invoiceForm.due_date || ''} onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
                </div>
                <div className="sa-form-group">
                  <label>Billing Start</label>
                  <input type="date" value={invoiceForm.billing_period_start || ''} onChange={e => setInvoiceForm({ ...invoiceForm, billing_period_start: e.target.value })} />
                </div>
                <div className="sa-form-group">
                  <label>Billing End</label>
                  <input type="date" value={invoiceForm.billing_period_end || ''} onChange={e => setInvoiceForm({ ...invoiceForm, billing_period_end: e.target.value })} />
                </div>
                <div className="sa-form-group full-width">
                  <label>Notes</label>
                  <textarea value={invoiceForm.notes || ''} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} rows={3} />
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-secondary-btn" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
              <button className="sa-primary-btn" onClick={createInvoice}>Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscriptions;
