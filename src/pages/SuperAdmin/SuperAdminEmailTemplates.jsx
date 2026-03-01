import { useState, useEffect } from 'react';
import {
  Mail, Plus, EditPencil, Trash, Send, Eye, Copy,
  CheckCircle, Code
} from 'iconoir-react';
import './SuperAdmin.css';

const API = import.meta.env.VITE_API_URL || '/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('superAdminToken')}`, 'Content-Type': 'application/json' });

const safeVariables = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};

const CATEGORY_CONFIG = {
  welcome: { color: '#10b981', label: 'Welcome' },
  notification: { color: '#3b82f6', label: 'Notification' },
  billing: { color: '#f59e0b', label: 'Billing' },
  system: { color: '#8b5cf6', label: 'System' },
  custom: { color: '#6b7280', label: 'Custom' }
};

const SuperAdminEmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showTestModal, setShowTestModal] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', subject: '', body: '', variables: [], category: 'custom'
  });
  const [variableInput, setVariableInput] = useState('');

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/super-admin/email-templates`, { headers: headers() });
      if (res.ok) setTemplates(await res.json());
    } catch (_) {}
    setLoading(false);
  };

  const save = async () => {
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API}/super-admin/email-templates/${editId}` : `${API}/super-admin/email-templates`;
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) });
    if (res.ok) { setShowModal(false); setEditId(null); fetchTemplates(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`${API}/super-admin/email-templates/${id}`, { method: 'DELETE', headers: headers() });
    fetchTemplates();
  };

  const sendTest = async (id) => {
    if (!testEmail) return;
    const res = await fetch(`${API}/super-admin/email-templates/${id}/test`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ to: testEmail })
    });
    if (res.ok) { alert('Test email sent!'); setShowTestModal(null); setTestEmail(''); }
    else { const d = await res.json(); alert(d.error || 'Failed'); }
  };

  const openEdit = (t) => {
    setEditId(t.id);
    setForm({
      name: t.name, slug: t.slug, subject: t.subject, body: t.body,
      variables: safeVariables(t.variables), category: t.category
    });
    setShowModal(true);
  };

  const addVariable = () => {
    if (variableInput && !form.variables.includes(variableInput)) {
      setForm({ ...form, variables: [...form.variables, variableInput] });
      setVariableInput('');
    }
  };

  const removeVariable = (v) => {
    setForm({ ...form, variables: form.variables.filter(x => x !== v) });
  };

  return (
    <div className="sa-page">
      <div className="sa-page-header">
        <div>
          <h1>Email Templates</h1>
          <p>Manage and customize email templates for platform notifications</p>
        </div>
        <button className="sa-primary-btn" onClick={() => { setEditId(null); setForm({ name: '', slug: '', subject: '', body: '', variables: [], category: 'custom' }); setShowModal(true); }}>
          <Plus size={16} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="sa-loading-page"><div className="loading-spinner"></div></div>
      ) : templates.length === 0 ? (
        <div className="sa-card"><div className="sa-empty-state"><Mail size={48} /><h3>No templates yet</h3></div></div>
      ) : (
        <div className="sa-template-grid">
          {templates.map(t => {
            const cat = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.custom;
            const vars = safeVariables(t.variables);
            return (
              <div key={t.id} className="sa-template-card">
                <div className="sa-template-header">
                  <span className="sa-badge-pill" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                  <span className={`sa-status-dot ${t.is_active ? 'active' : 'inactive'}`} />
                </div>
                <h3 style={{ margin: '12px 0 4px' }}>{t.name}</h3>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>Slug: <code>{t.slug}</code></p>
                <p style={{ color: '#475569', fontSize: 13, margin: '0 0 12px' }}><strong>Subject:</strong> {t.subject}</p>
                {vars.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {vars.map(v => <code key={v} style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{`{{${v}}}`}</code>)}
                  </div>
                )}
                <div className="sa-template-actions">
                  <button className="sa-icon-btn" onClick={() => setShowPreview(t)} title="Preview"><Eye size={16} /></button>
                  <button className="sa-icon-btn info" onClick={() => { setShowTestModal(t.id); setTestEmail(''); }} title="Send Test"><Send size={16} /></button>
                  <button className="sa-icon-btn" onClick={() => openEdit(t)} title="Edit"><EditPencil size={16} /></button>
                  <button className="sa-icon-btn danger" onClick={() => remove(t.id)} title="Delete"><Trash size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="sa-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="sa-modal-header">
              <h2>{editId ? 'Edit Template' : 'New Template'}</h2>
              <button className="sa-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-grid">
                <div className="sa-form-group">
                  <label>Template Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="sa-form-group">
                  <label>Slug (unique)</label>
                  <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} disabled={!!editId} />
                </div>
                <div className="sa-form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="sa-form-group">
                  <label>Subject</label>
                  <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="sa-form-group full-width">
                  <label>Body (HTML)</label>
                  <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={10} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <div className="sa-form-group full-width">
                  <label>Variables</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={variableInput} onChange={e => setVariableInput(e.target.value)} placeholder="variable_name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariable())} />
                    <button className="sa-secondary-btn" onClick={addVariable} style={{ padding: '6px 12px' }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {form.variables.map(v => (
                      <span key={v} className="sa-badge-pill" style={{ background: '#f1f5f9', cursor: 'pointer' }} onClick={() => removeVariable(v)}>
                        {`{{${v}}}`} ×
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="sa-primary-btn" onClick={save}>Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="sa-modal-backdrop" onClick={() => setShowPreview(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="sa-modal-header">
              <h2>Preview: {showPreview.name}</h2>
              <button className="sa-modal-close" onClick={() => setShowPreview(null)}>×</button>
            </div>
            <div className="sa-modal-body">
              <p style={{ color: '#6b7280', marginBottom: 8 }}><strong>Subject:</strong> {showPreview.subject}</p>
              <div
                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, background: '#fff' }}
                dangerouslySetInnerHTML={{ __html: showPreview.body }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="sa-modal-backdrop" onClick={() => setShowTestModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="sa-modal-header">
              <h2>Send Test Email</h2>
              <button className="sa-modal-close" onClick={() => setShowTestModal(null)}>×</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-form-group">
                <label>Recipient Email</label>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" />
              </div>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Variables will be replaced with sample data.</p>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-secondary-btn" onClick={() => setShowTestModal(null)}>Cancel</button>
              <button className="sa-primary-btn" onClick={() => sendTest(showTestModal)}>
                <Send size={16} /> Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminEmailTemplates;
