import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, EditPencil, Trash, Xmark, Calculator } from 'iconoir-react';
import api from '../lib/api';
import './Pricing.css';

/* ═══════════════════════════════════════════════════════════
   PRICING — Delivery pricing rules + calculator + surge
   ═══════════════════════════════════════════════════════════ */

const ORDER_TYPES  = ['standard', 'express', 'same_day', 'scheduled', 'return'];
const CLIENT_TYPES = ['all', 'individual', 'business', 'vip'];
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EMPTY_RULE = {
  name: '', zone_id: '', client_type: 'all',
  base_price: '', price_per_km: '', price_per_kg: '',
  min_price: '', max_price: '', cod_fee_pct: '',
  express_surcharge: '', is_active: true,
};

const EMPTY_SURGE = {
  name: '', day_of_week: '', start_hour: '0', end_hour: '23',
  multiplier: '1.5', zone_id: '', is_active: true,
};

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  /* ── State ── */
  const [rules, setRules]       = useState([]);
  const [zones, setZones]       = useState([]);
  const [surgeRules, setSurge]  = useState([]);
  const [loading, setLoading]   = useState(true);

  // Rule form
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ ...EMPTY_RULE });
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  // Surge form
  const [showSurge, setShowSurge]   = useState(false);
  const [surgeEdit, setSurgeEdit]   = useState(null);
  const [surgeForm, setSurgeForm]   = useState({ ...EMPTY_SURGE });
  const [surgeErr, setSurgeErr]     = useState('');
  const [surgeSaving, setSurgeSaving] = useState(false);

  // Calculator
  const [calcForm, setCalcForm]     = useState({ zone_id: '', weight_kg: '', order_type: 'standard', is_cod: false, cod_amount: '', client_type: 'all', distance_km: '' });
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  /* ── Fetch ── */
  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/pricing').then(r => r.success && setRules(r.data || [])),
      api.get('/zones').then(r => r.success && setZones(r.data || [])),
      api.get('/pricing/surge').then(r => r.success && setSurge(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const zoneName = (id) => zones.find(z => z.id === id)?.name || (id ? `Zone ${id}` : '—');

  /* ── Rule CRUD ── */
  const openNew = () => { setSelected(null); setForm({ ...EMPTY_RULE }); setError(''); setShowForm(true); };
  const openEdit = (r) => {
    setSelected(r);
    setForm({
      name: r.name || '',
      zone_id: r.zone_id || '',
      client_type: r.client_type || 'all',
      base_price: r.base_price ?? '',
      price_per_km: r.price_per_km ?? '',
      price_per_kg: r.price_per_kg ?? '',
      min_price: r.min_price ?? '',
      max_price: r.max_price ?? '',
      cod_fee_pct: r.cod_fee_pct ?? '',
      express_surcharge: r.express_surcharge ?? '',
      is_active: r.is_active ?? true,
    });
    setError('');
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = { ...form };
    ['base_price','price_per_km','price_per_kg','min_price','max_price','cod_fee_pct','express_surcharge'].forEach(k => {
      if (payload[k] === '' || payload[k] == null) payload[k] = 0;
      else payload[k] = parseFloat(payload[k]) || 0;
    });
    const res = selected
      ? await api.put(`/pricing/${selected.id}`, payload)
      : await api.post('/pricing', payload);
    if (res.success) { setShowForm(false); fetchAll(); }
    else setError(res.message || t('pricing.save_failed'));
    setSaving(false);
  };
  const handleDelete = async (id) => {
    if (!confirm(t('pricing.delete_confirm'))) return;
    await api.delete(`/pricing/${id}`);
    fetchAll();
  };

  /* ── Surge CRUD ── */
  const openNewSurge = () => { setSurgeEdit(null); setSurgeForm({ ...EMPTY_SURGE }); setSurgeErr(''); setShowSurge(true); };
  const openEditSurge = (s) => {
    setSurgeEdit(s);
    setSurgeForm({
      name: s.name || '', day_of_week: s.day_of_week ?? '',
      start_hour: s.start_hour ?? '0', end_hour: s.end_hour ?? '23',
      multiplier: s.multiplier ?? '1.5', zone_id: s.zone_id || '', is_active: s.is_active ?? true,
    });
    setSurgeErr(''); setShowSurge(true);
  };
  const handleSurgeSubmit = async (e) => {
    e.preventDefault();
    setSurgeSaving(true); setSurgeErr('');
    const payload = { ...surgeForm };
    payload.day_of_week = payload.day_of_week === '' ? null : parseInt(payload.day_of_week);
    payload.start_hour  = parseInt(payload.start_hour) || 0;
    payload.end_hour    = parseInt(payload.end_hour)   || 23;
    payload.multiplier  = parseFloat(payload.multiplier) || 1.5;
    const res = surgeEdit
      ? await api.put(`/pricing/surge/${surgeEdit.id}`, payload)
      : await api.post('/pricing/surge', payload);
    if (res.success) { setShowSurge(false); fetchAll(); }
    else setSurgeErr(res.message || 'Failed to save');
    setSurgeSaving(false);
  };
  const handleSurgeDelete = async (id) => {
    if (!confirm(t('pricing.delete_confirm'))) return;
    await api.delete(`/pricing/surge/${id}`);
    fetchAll();
  };

  /* ── Calculator ── */
  const handleCalculate = async (e) => {
    e.preventDefault();
    setCalcLoading(true); setCalcResult(null);
    const payload = {
      zone_id: calcForm.zone_id || null,
      order_type: calcForm.order_type,
      weight_kg: parseFloat(calcForm.weight_kg) || 0,
      cod_amount: calcForm.is_cod ? (parseFloat(calcForm.cod_amount) || 0) : 0,
      client_type: calcForm.client_type,
      distance_km: parseFloat(calcForm.distance_km) || 0,
    };
    const res = await api.post('/pricing/calculate', payload);
    if (res.success) setCalcResult(res.data);
    setCalcLoading(false);
  };

  /* ── Render ── */
  return (
    <div className="prc-page page-container">
      {/* Header */}
      <div className="prc-header">
        <div className="prc-header-left">
          <h2>{t('pricing.title')}</h2>
          <p>{t('pricing.rules_configured', { count: rules.length })}</p>
        </div>
        <button className="prc-add-btn" onClick={openNew}>
          <Plus width={16} height={16} />
          {t('pricing.add_rule')}
        </button>
      </div>

      <div className="prc-grid">
        {/* ── Rules Table ── */}
        <div className="prc-rules-card">
          {loading ? (
            <div className="prc-loading"><span className="prc-spinner" /> {t('common.loading')}</div>
          ) : rules.length === 0 ? (
            <div className="prc-empty">
              <div className="prc-empty-icon">📋</div>
              <h4>{t('pricing.no_rules')}</h4>
              <p>{t('pricing.no_rules_sub')}</p>
            </div>
          ) : (
            <table className="prc-table">
              <thead>
                <tr style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <th>{t('pricing.header_name')}</th>
                  <th>{t('pricing.header_client')}</th>
                  <th>{t('pricing.header_base')}</th>
                  <th>{t('pricing.header_per_km')}</th>
                  <th>{t('pricing.header_per_kg')}</th>
                  <th>{t('pricing.header_cod_pct')}</th>
                  <th>{t('pricing.header_express')}</th>
                  <th>{t('pricing.header_limits')}</th>
                  <th>{t('pricing.header_status')}</th>
                  <th>{t('pricing.header_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td>
                      <div className="prc-rule-name">{rule.name}</div>
                      <div className="prc-rule-zone">{rule.zone_name || zoneName(rule.zone_id)}</div>
                    </td>
                    <td>
                      <span className="prc-client-badge">
                        {t(`pricing.client_types.${rule.client_type || 'all'}`)}
                      </span>
                    </td>
                    <td className="prc-fee">{t('pricing.currency_value', { value: parseFloat(rule.base_price || 0).toFixed(2) })}</td>
                    <td className="prc-fee-secondary">{rule.price_per_km > 0 ? t('pricing.currency_value', { value: parseFloat(rule.price_per_km).toFixed(2) }) : '—'}</td>
                    <td className="prc-fee-secondary">{rule.price_per_kg > 0 ? t('pricing.currency_value', { value: parseFloat(rule.price_per_kg).toFixed(2) }) : '—'}</td>
                    <td className="prc-fee-secondary">{rule.cod_fee_pct > 0 ? `${rule.cod_fee_pct}%` : '—'}</td>
                    <td className="prc-fee-secondary">{rule.express_surcharge > 0 ? t('pricing.currency_value', { value: parseFloat(rule.express_surcharge).toFixed(2) }) : '—'}</td>
                    <td className="prc-fee-secondary">
                      {t('pricing.currency_value', { value: parseFloat(rule.min_price || 0).toFixed(0) })} – {t('pricing.currency_value', { value: parseFloat(rule.max_price || 500).toFixed(0) })}
                    </td>
                    <td>
                      <span className={`prc-badge ${rule.is_active ? 'prc-badge-active' : 'prc-badge-inactive'}`}>
                        {rule.is_active ? t('pricing.active_label') : t('pricing.off_label')}
                      </span>
                    </td>
                    <td>
                      <div className="prc-actions">
                        <button className="prc-act-btn" onClick={() => openEdit(rule)}><EditPencil width={13} height={13} /></button>
                        <button className="prc-act-btn delete" onClick={() => handleDelete(rule.id)}><Trash width={13} height={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Price Calculator ── */}
        <div className="prc-calc-card">
          <div className="prc-calc-header">
            <div className="prc-calc-icon"><Calculator width={20} height={20} /></div>
            <h3>{t('pricing.price_calculator')}</h3>
          </div>
          <div className="prc-calc-body">
            <form onSubmit={handleCalculate}>
              <div className="prc-calc-field">
                <label>{t('pricing.zone_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                <select required value={calcForm.zone_id} onChange={e => setCalcForm(f => ({ ...f, zone_id: e.target.value }))}>
                  <option value="">{t('pricing.select_zone')}</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>

              <div className="prc-calc-row">
                <div className="prc-calc-field">
                  <label>{t('pricing.order_type')}</label>
                  <select value={calcForm.order_type} onChange={e => setCalcForm(f => ({ ...f, order_type: e.target.value }))}>
                    {ORDER_TYPES.map(ot => <option key={ot} value={ot}>{t(`pricing.types.${ot}`)}</option>)}
                  </select>
                </div>
                <div className="prc-calc-field">
                  <label>{t('pricing.client_type_label')}</label>
                  <select value={calcForm.client_type} onChange={e => setCalcForm(f => ({ ...f, client_type: e.target.value }))}>
                    {CLIENT_TYPES.map(ct => <option key={ct} value={ct}>{t(`pricing.client_types.${ct}`)}</option>)}
                  </select>
                </div>
              </div>

              <div className="prc-calc-row">
                <div className="prc-calc-field">
                  <label>{t('pricing.weight_kg')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input required type="number" step="0.1" min="0" value={calcForm.weight_kg}
                    onChange={e => setCalcForm(f => ({ ...f, weight_kg: e.target.value }))}
                    placeholder="0.0" />
                </div>
                <div className="prc-calc-field">
                  <label>{t('pricing.distance_km')}</label>
                  <input type="number" step="0.1" min="0" value={calcForm.distance_km}
                    onChange={e => setCalcForm(f => ({ ...f, distance_km: e.target.value }))}
                    placeholder="0.0" />
                </div>
              </div>

              <label className="prc-cod-check">
                <input type="checkbox" checked={calcForm.is_cod}
                  onChange={e => setCalcForm(f => ({ ...f, is_cod: e.target.checked }))} />
                <span>{t('pricing.cash_on_delivery')}</span>
              </label>

              {calcForm.is_cod && (
                <div className="prc-calc-field">
                  <label>{t('pricing.cod_amount_aed')}</label>
                  <input type="number" min="0" step="0.01" value={calcForm.cod_amount}
                    onChange={e => setCalcForm(f => ({ ...f, cod_amount: e.target.value }))}
                    placeholder="0.00" />
                </div>
              )}

              <button type="submit" className="prc-calc-btn" disabled={calcLoading}>
                {calcLoading ? t('pricing.calculating') : t('pricing.calculate_price')}
              </button>
            </form>

            {calcResult && (
              <div className="prc-calc-result">
                <div className="prc-calc-result-top">
                  <div className="prc-calc-result-label">{t('pricing.estimated_price')}</div>
                  {calcResult.free_delivery ? (
                    <div className="prc-calc-result-free">{t('pricing.free_delivery')} 🎉</div>
                  ) : (
                    <div className="prc-calc-result-value">
                      {t('pricing.currency_value', { value: parseFloat(calcResult.estimated_fee || 0).toFixed(2) })}
                    </div>
                  )}
                </div>
                {calcResult.breakdown && (
                  <div className="prc-calc-breakdown">
                    <div className="prc-calc-breakdown-divider" />
                    {Object.entries(calcResult.breakdown).filter(([k, v]) => typeof v === 'number' && v > 0).map(([k, v]) => (
                      <div key={k} className="prc-calc-breakdown-row">
                        <span>{t(`pricing.breakdown.${k}`, { defaultValue: k.replace(/_/g, ' ') })}</span>
                        <span>{k === 'surge_multiplier' ? `×${v}` : t('pricing.currency_value', { value: v.toFixed(2) })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Surge Pricing Section ── */}
      <div className="prc-surge-section">
        <div className="prc-surge-header">
          <h3>⚡ {t('pricing.surge_title')}</h3>
          <button className="prc-add-btn" onClick={openNewSurge} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
            <Plus width={14} height={14} />
            {t('pricing.add_surge')}
          </button>
        </div>
        <div className="prc-surge-card">
          {surgeRules.length === 0 ? (
            <div className="prc-empty" style={{ padding: '36px 20px' }}>
              <p>{t('pricing.no_surge')}</p>
            </div>
          ) : (
            <div className="prc-surge-grid">
              {surgeRules.map(s => (
                <div className="prc-surge-item" key={s.id}>
                  <div className="prc-surge-actions">
                    <button className="prc-act-btn" onClick={() => openEditSurge(s)}><EditPencil width={12} height={12} /></button>
                    <button className="prc-act-btn delete" onClick={() => handleSurgeDelete(s.id)}><Trash width={12} height={12} /></button>
                  </div>
                  <div className="prc-surge-item-name">{s.name}</div>
                  <div className="prc-surge-item-detail">
                    {s.day_of_week != null ? DAYS_OF_WEEK[s.day_of_week] : t('pricing.every_day')} · {String(s.start_hour).padStart(2,'0')}:00 – {String(s.end_hour).padStart(2,'0')}:00
                  </div>
                  <div className="prc-surge-item-detail">{s.zone_name || (s.zone_id ? zoneName(s.zone_id) : t('pricing.all_zones'))}</div>
                  <div className="prc-surge-multiplier">×{parseFloat(s.multiplier).toFixed(1)}</div>
                  {!s.is_active && <span className="prc-badge prc-badge-inactive" style={{ marginLeft: 8 }}>{t('pricing.off_label')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rule Form Modal ── */}
      {showForm && (
        <div className="prc-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="prc-modal">
            <div className="prc-modal-header">
              <h3>{selected ? t('pricing.edit_rule') : t('pricing.add_pricing_rule')}</h3>
              <button className="prc-modal-close" onClick={() => setShowForm(false)}><Xmark width={16} height={16} /></button>
            </div>
            <div className="prc-modal-body">
              {error && <div className="prc-modal-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="prc-form-grid">
                  <div className="prc-form-field">
                    <label>{t('pricing.rule_name')} <span className="req">*</span></label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('pricing.rule_name_placeholder')} />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.zone_label')}</label>
                    <select value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                      <option value="">{t('pricing.all_zones')}</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>

                  <div className="prc-form-field">
                    <label>{t('pricing.client_type_label')}</label>
                    <select value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
                      {CLIENT_TYPES.map(ct => <option key={ct} value={ct}>{t(`pricing.client_types.${ct}`)}</option>)}
                    </select>
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.base_price')} <span className="req">*</span></label>
                    <input required type="number" step="0.01" min="0" value={form.base_price}
                      onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="15.00" />
                  </div>

                  <div className="prc-form-section">{t('pricing.section_per_unit')}</div>

                  <div className="prc-form-field">
                    <label>{t('pricing.price_per_km')}</label>
                    <input type="number" step="0.01" min="0" value={form.price_per_km}
                      onChange={e => setForm(f => ({ ...f, price_per_km: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.price_per_kg')}</label>
                    <input type="number" step="0.01" min="0" value={form.price_per_kg}
                      onChange={e => setForm(f => ({ ...f, price_per_kg: e.target.value }))} placeholder="0.00" />
                  </div>

                  <div className="prc-form-section">{t('pricing.section_surcharges')}</div>

                  <div className="prc-form-field">
                    <label>{t('pricing.cod_fee_pct_label')}</label>
                    <input type="number" step="0.1" min="0" max="100" value={form.cod_fee_pct}
                      onChange={e => setForm(f => ({ ...f, cod_fee_pct: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.express_surcharge')}</label>
                    <input type="number" step="0.01" min="0" value={form.express_surcharge}
                      onChange={e => setForm(f => ({ ...f, express_surcharge: e.target.value }))} placeholder="10.00" />
                  </div>

                  <div className="prc-form-section">{t('pricing.section_limits')}</div>

                  <div className="prc-form-field">
                    <label>{t('pricing.min_price')}</label>
                    <input type="number" step="0.01" min="0" value={form.min_price}
                      onChange={e => setForm(f => ({ ...f, min_price: e.target.value }))} placeholder="10.00" />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.max_price')}</label>
                    <input type="number" step="0.01" min="0" value={form.max_price}
                      onChange={e => setForm(f => ({ ...f, max_price: e.target.value }))} placeholder="500.00" />
                  </div>

                  <div className="prc-form-toggle full-width">
                    <input type="checkbox" id="prc-active" checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    <label htmlFor="prc-active">{t('pricing.rule_active')}</label>
                  </div>
                </div>

                <div className="prc-form-footer">
                  <button type="button" className="prc-form-cancel" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="prc-form-submit" disabled={saving}>
                    {saving ? t('pricing.saving') : selected ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Surge Form Modal ── */}
      {showSurge && (
        <div className="prc-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSurge(false)}>
          <div className="prc-modal" style={{ maxWidth: 480 }}>
            <div className="prc-modal-header">
              <h3>{surgeEdit ? t('pricing.edit_surge') : t('pricing.add_surge_rule')}</h3>
              <button className="prc-modal-close" onClick={() => setShowSurge(false)}><Xmark width={16} height={16} /></button>
            </div>
            <div className="prc-modal-body">
              {surgeErr && <div className="prc-modal-error">{surgeErr}</div>}
              <form onSubmit={handleSurgeSubmit}>
                <div className="prc-form-grid">
                  <div className="prc-form-field full-width">
                    <label>{t('pricing.rule_name')} <span className="req">*</span></label>
                    <input required value={surgeForm.name} onChange={e => setSurgeForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('pricing.surge_name_placeholder')} />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.day_of_week')}</label>
                    <select value={surgeForm.day_of_week} onChange={e => setSurgeForm(f => ({ ...f, day_of_week: e.target.value }))}>
                      <option value="">{t('pricing.every_day')}</option>
                      {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{t(`pricing.days.${d.toLowerCase()}`, { defaultValue: d })}</option>)}
                    </select>
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.zone_label')}</label>
                    <select value={surgeForm.zone_id} onChange={e => setSurgeForm(f => ({ ...f, zone_id: e.target.value }))}>
                      <option value="">{t('pricing.all_zones')}</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.start_hour')}</label>
                    <input type="number" min="0" max="23" value={surgeForm.start_hour}
                      onChange={e => setSurgeForm(f => ({ ...f, start_hour: e.target.value }))} />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.end_hour')}</label>
                    <input type="number" min="0" max="23" value={surgeForm.end_hour}
                      onChange={e => setSurgeForm(f => ({ ...f, end_hour: e.target.value }))} />
                  </div>
                  <div className="prc-form-field">
                    <label>{t('pricing.multiplier')} <span className="req">*</span></label>
                    <input required type="number" step="0.1" min="1" max="5" value={surgeForm.multiplier}
                      onChange={e => setSurgeForm(f => ({ ...f, multiplier: e.target.value }))} placeholder="1.5" />
                  </div>
                  <div className="prc-form-toggle">
                    <input type="checkbox" id="prc-surge-active" checked={surgeForm.is_active}
                      onChange={e => setSurgeForm(f => ({ ...f, is_active: e.target.checked }))} />
                    <label htmlFor="prc-surge-active">{t('pricing.rule_active')}</label>
                  </div>
                </div>
                <div className="prc-form-footer">
                  <button type="button" className="prc-form-cancel" onClick={() => setShowSurge(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="prc-form-submit" disabled={surgeSaving}>
                    {surgeSaving ? t('pricing.saving') : surgeEdit ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
