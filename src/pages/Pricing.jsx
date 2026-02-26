import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [rules, setRules] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ zone_id: '', order_type: 'standard', min_weight_kg: '', max_weight_kg: '', base_fee: '', per_kg_fee: '', cod_fee_percent: '', priority_fee: '', is_active: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Calculator
  const [calcForm, setCalcForm] = useState({ zone_id: '', weight_kg: '', order_type: 'standard', is_cod: false, cod_amount: '' });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/pricing').then(r => r.success && setRules(r.data || [])),
      api.get('/zones').then(r => r.success && setZones(r.data || [])),
    ]).then(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = selected ? await api.put(`/pricing/${selected.id}`, form) : await api.post('/pricing', form);
    if (res.success) { setShowForm(false); setSelected(null); resetForm(); api.get('/pricing').then(r => r.success && setRules(r.data || [])); }
    else setError(res.message || t('pricing.save_failed'));
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('pricing.delete_confirm'))) return;
    await api.delete(`/pricing/${id}`);
    api.get('/pricing').then(r => r.success && setRules(r.data || []));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcResult(null);
    const res = await api.post('/pricing/calculate', calcForm);
    if (res.success) setCalcResult(res.data);
    setCalcLoading(false);
  };

  const resetForm = () => setForm({ zone_id: '', order_type: 'standard', min_weight_kg: '', max_weight_kg: '', base_fee: '', per_kg_fee: '', cod_fee_percent: '', priority_fee: '', is_active: true });
  const openEdit = (r) => { setSelected(r); setForm({ ...r }); setShowForm(true); };

  const ORDER_TYPES = ['standard', 'express', 'same_day', 'scheduled', 'return'];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{t("pricing.title")}</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{t('pricing.rules_configured', { count: rules.length })}</p>
        </div>
        <button onClick={() => { resetForm(); setSelected(null); setShowForm(true); }}
          style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          {t('pricing.add_rule')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Rules table */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{t("common.loading")}</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {[t('pricing.header_zone'), t('pricing.header_type'), t('pricing.header_weight_range'), t('pricing.header_base_fee'), t('pricing.header_per_kg'), t('pricing.header_cod_pct'), t('pricing.header_status'), t('pricing.header_actions')].map((h, i) => (
                      <th key={i} style={{ padding: '12px 16px', textAlign: isRTL ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>{t("pricing.no_rules")}</td></tr>
                  ) : rules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{rule.zone_name || t('pricing.zone_fallback', { id: rule.zone_id })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{rule.order_type}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                        {rule.min_weight_kg || 0}–{rule.max_weight_kg || '∞'} {t('pricing.weight_unit')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{t('pricing.currency_value', { value: rule.base_fee })}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{rule.per_kg_fee ? t('pricing.currency_value', { value: rule.per_kg_fee }) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{rule.cod_fee_percent ? `${rule.cod_fee_percent}%` : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: rule.is_active ? '#dcfce7' : '#f1f5f9', color: rule.is_active ? '#16a34a' : '#64748b' }}>
                          {rule.is_active ? t('pricing.active_label') : t('pricing.off_label')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(rule)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>{t("common.edit")}</button>
                          <button onClick={() => handleDelete(rule.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>{t('pricing.delete_short')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Calculator */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>{t('pricing.price_calculator')}</h3>
          <form onSubmit={handleCalculate}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t('pricing.zone_required')}</label>
              <select required value={calcForm.zone_id} onChange={e => setCalcForm(f => ({ ...f, zone_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                <option value="">{t('pricing.select_zone')}</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t('pricing.order_type_required')}</label>
              <select required value={calcForm.order_type} onChange={e => setCalcForm(f => ({ ...f, order_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                {ORDER_TYPES.map(ot => <option key={ot} value={ot}>{t('pricing.types.' + ot)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t('pricing.weight_kg_required')}</label>
              <input required type="number" step="0.1" value={calcForm.weight_kg} onChange={e => setCalcForm(f => ({ ...f, weight_kg: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="is_cod" checked={calcForm.is_cod} onChange={e => setCalcForm(f => ({ ...f, is_cod: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="is_cod" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t("pricing.cash_on_delivery")}</label>
            </div>
            {calcForm.is_cod && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t('pricing.cod_amount_aed')}</label>
                <input type="number" value={calcForm.cod_amount} onChange={e => setCalcForm(f => ({ ...f, cod_amount: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            )}
            <button type="submit" disabled={calcLoading}
              style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {calcLoading ? t('pricing.calculating') : t('pricing.calculate_price')}
            </button>
          </form>
          {calcResult && (
            <div style={{ marginTop: 16, background: '#fff7ed', borderRadius: 10, padding: 16, border: '1px solid #fed7aa' }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{t("pricing.estimated_price")}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>{t('pricing.currency_value', { value: parseFloat(calcResult.total_fee || 0).toFixed(2) })}</div>
              {calcResult.breakdown && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  {Object.entries(calcResult.breakdown).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>{k.replace(/_/g, ' ')}</span>
                      <span>{t('pricing.currency_value', { value: parseFloat(v).toFixed(2) })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>{selected ? t('pricing.edit_rule') : t('pricing.add_pricing_rule')}</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t('pricing.zone_required')}</label>
                  <select required value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    <option value="">{t('pricing.select_zone')}</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t("pricing.order_type")}</label>
                  <select value={form.order_type} onChange={e => setForm(f => ({ ...f, order_type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                    {ORDER_TYPES.map(ot => <option key={ot} value={ot}>{t('pricing.types.' + ot)}</option>)}
                  </select>
                </div>
                {[
                  { field: 'base_fee', label: t('pricing.base_fee_aed'), required: true, type: 'number' },
                  { field: 'per_kg_fee', label: t('pricing.per_kg_fee_aed'), type: 'number' },
                  { field: 'min_weight_kg', label: t('pricing.min_weight_kg'), type: 'number' },
                  { field: 'max_weight_kg', label: t('pricing.max_weight_kg'), type: 'number' },
                  { field: 'cod_fee_percent', label: t('pricing.cod_fee_pct'), type: 'number' },
                  { field: 'priority_fee', label: t('pricing.priority_fee_aed'), type: 'number' },
                ].map(({ field, label, required, type }) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}{required && ' *'}</label>
                    <input required={required} type={type} step="0.01" value={form[field] || ''}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="r_is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <label htmlFor="r_is_active" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{t("common.active")}</label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setSelected(null); }}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>{t("common.cancel")}</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {saving ? t('pricing.saving') : selected ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
