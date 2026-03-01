import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import {
  Settings as SettingsIcon, User, Building, DeliveryTruck, Mail, Bell,
  Label as Tag, Plus, Trash, CheckCircle, WarningCircle, Globe, Phone,
  MapPin, Wallet, Clock, EditPencil, Xmark, Upload, Eye, EyeClosed,
  NavArrowRight, SwitchOn as ToggleOn, ShieldCheck,
} from 'iconoir-react';
import api from '../lib/api';
import Toast, { useToast } from '../components/Toast';
import './Settings.css';

/* ── helpers ──────────────────────────────────────────────── */
const fmtDate = (d, language = 'en') => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-AE', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const ROLE_META = {
  superadmin: { badge:'#7c3aed', bg:'#ede9fe' },
  admin:      { badge:'#1d4ed8', bg:'#dbeafe' },
  dispatcher: { badge:'#0d9488', bg:'#ccfbf1' },
  driver:     { badge:'#d97706', bg:'#fef3c7' },
  client:     { badge:'#64748b', bg:'#f1f5f9' },
};

const EMIRATE_OPTIONS = ['Dubai','Abu Dhabi','Sharjah','Ajman','RAK','Fujairah','UAQ'];
const TIMEZONE_OPTIONS = ['Asia/Dubai','Asia/Riyadh','Asia/Kuwait','Europe/London','America/New_York'];
const CURRENCY_OPTIONS = ['AED','USD','SAR','KWD','BHD','EUR'];
const CATEGORY_COLORS  = ['#f97316','#3b82f6','#8b5cf6','#16a34a','#ec4899','#ef4444','#0d9488','#64748b','#f59e0b','#06b6d4','#84cc16','#a855f7'];

/* ── Toggle switch ────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
      background: on ? '#f97316' : '#e2e8f0', position:'relative', transition:'background .2s', flexShrink:0,
    }}>
      <span style={{
        position:'absolute', top:3, [isRTL?'right':'left']: on ? 22 : 2,
        width:18, height:18, borderRadius:'50%', background:'#fff',
        boxShadow:'0 1px 4px rgba(0,0,0,.2)', transition:(isRTL?'right':'left')+' .2s',
        display:'block',
      }}/>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   GENERAL TAB
═══════════════════════════════════════════════════════════════ */
function GeneralTab({ data, setData, onSave, saving }) {
  const { t } = useTranslation();
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const setTenant = (k, v) => setData(d => ({ ...d, [k]: v }));

  const [uploadingColored, setUploadingColored] = useState(false);
  const [uploadingWhite, setUploadingWhite] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const handleLogoUpload = async (file, variant) => {
    const isWhite = variant === 'white';
    isWhite ? setUploadingWhite(true) : setUploadingColored(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_URL}/uploads/logo/${variant}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        const key = isWhite ? 'logo_url_white' : 'logo_url';
        setData(d => ({ ...d, [key]: result.url }));
      }
    } catch (e) { console.error('Logo upload failed:', e); }
    isWhite ? setUploadingWhite(false) : setUploadingColored(false);
  };

  const removeLogo = (variant) => {
    const key = variant === 'white' ? 'logo_url_white' : 'logo_url';
    setData(d => ({ ...d, [key]: '' }));
  };

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon orange"><Building width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.general.company_info')}</div>
            <div className="stg-section-sub">{t('settings.general.company_info_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.general.company_name')}</label>
            <div className="stg-input-wrap"><Building width={15} height={15} className="stg-input-icon"/>
              <input value={data.name||''} onChange={e=>setTenant('name',e.target.value)} placeholder="Trasealla Solutions Co." />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.company_phone')}</label>
            <div className="stg-input-wrap"><Phone width={15} height={15} className="stg-input-icon"/>
              <input value={data.phone||''} onChange={e=>setTenant('phone',e.target.value)} placeholder="+971 4 000 0000" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.company_email')}</label>
            <div className="stg-input-wrap"><Mail width={15} height={15} className="stg-input-icon"/>
              <input type="email" value={data.email||''} onChange={e=>setTenant('email',e.target.value)} placeholder="info@company.ae" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.website')}</label>
            <div className="stg-input-wrap"><Globe width={15} height={15} className="stg-input-icon"/>
              <input value={s.website||''} onChange={e=>set('website',e.target.value)} placeholder="www.company.ae" />
            </div>
          </div>
          <div className="stg-field stg-span">
            <label>{t('settings.general.company_address')}</label>
            <div className="stg-input-wrap"><MapPin width={15} height={15} className="stg-input-icon"/>
              <input value={data.address||''} onChange={e=>setTenant('address',e.target.value)} placeholder="Office 123, Business Bay, Dubai" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.city')}</label>
            <input value={data.city||''} onChange={e=>setTenant('city',e.target.value)} placeholder="Dubai" />
          </div>
          <div className="stg-field">
            <label>{t('settings.general.vat_number')}</label>
            <div className="stg-input-wrap"><Wallet width={15} height={15} className="stg-input-icon"/>
              <input value={s.vat_number||''} onChange={e=>set('vat_number',e.target.value)} placeholder="100XXXXXXXXX003" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Logo Upload Section ── */}
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon orange"><Upload width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.general.company_logos')}</div>
            <div className="stg-section-sub">{t('settings.general.company_logos_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          {/* Colored Logo */}
          <div className="stg-field stg-span">
            <label>{t('settings.general.logo_colored')}</label>
            <div className="stg-logo-upload-area">
              {data.logo_url ? (
                <div className="stg-logo-preview">
                  <div className="stg-logo-preview-img" style={{ background: '#f8fafc' }}>
                    <img src={data.logo_url} alt="Colored Logo" onError={e => { e.target.style.display='none'; }} />
                  </div>
                  <div className="stg-logo-preview-info">
                    <span className="stg-logo-filename">{t('settings.general.logo_uploaded')}</span>
                    <div className="stg-logo-actions">
                      <label className="stg-logo-change-btn">
                        {t('settings.general.change_logo')}
                        <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                          onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0], 'colored')} />
                      </label>
                      <button type="button" className="stg-logo-remove-btn" onClick={() => removeLogo('colored')}>
                        <Trash width={14} height={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="stg-logo-dropzone">
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                    onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0], 'colored')} />
                  {uploadingColored ? (
                    <div className="stg-logo-uploading"><div className="stg-spinner" /> {t('settings.general.uploading')}</div>
                  ) : (
                    <>
                      <Upload width={24} height={24} style={{ color: '#94a3b8' }} />
                      <span>{t('settings.general.upload_colored_hint')}</span>
                      <small>PNG, JPG, WEBP — {t('settings.general.max_2mb')}</small>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* White Logo */}
          <div className="stg-field stg-span">
            <label>{t('settings.general.logo_white')}</label>
            <div className="stg-logo-upload-area">
              {data.logo_url_white ? (
                <div className="stg-logo-preview">
                  <div className="stg-logo-preview-img" style={{ background: '#1e293b' }}>
                    <img src={data.logo_url_white} alt="White Logo" onError={e => { e.target.style.display='none'; }} />
                  </div>
                  <div className="stg-logo-preview-info">
                    <span className="stg-logo-filename">{t('settings.general.logo_uploaded')}</span>
                    <div className="stg-logo-actions">
                      <label className="stg-logo-change-btn">
                        {t('settings.general.change_logo')}
                        <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                          onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0], 'white')} />
                      </label>
                      <button type="button" className="stg-logo-remove-btn" onClick={() => removeLogo('white')}>
                        <Trash width={14} height={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="stg-logo-dropzone">
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden
                    onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0], 'white')} />
                  {uploadingWhite ? (
                    <div className="stg-logo-uploading"><div className="stg-spinner" /> {t('settings.general.uploading')}</div>
                  ) : (
                    <>
                      <Upload width={24} height={24} style={{ color: '#94a3b8' }} />
                      <span>{t('settings.general.upload_white_hint')}</span>
                      <small>PNG, JPG, WEBP — {t('settings.general.max_2mb')}</small>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon blue"><Globe width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.general.regional')}</div>
            <div className="stg-section-sub">{t('settings.general.regional_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.general.timezone')}</label>
            <select value={data.timezone||'Asia/Dubai'} onChange={e=>setTenant('timezone',e.target.value)}>
              {TIMEZONE_OPTIONS.map(tz=><option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.currency')}</label>
            <select value={data.currency||'AED'} onChange={e=>setTenant('currency',e.target.value)}>
              {CURRENCY_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>{t('settings.general.country')}</label>
            <input value={data.country||''} onChange={e=>setTenant('country',e.target.value)} placeholder="United Arab Emirates" />
          </div>
          <div className="stg-field">
            <label>{t('settings.general.default_language')}</label>
            <select value={s.default_language||'en'} onChange={e=>set('default_language',e.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic (العربية)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stg-save-bar">
        <button type="submit" className="stg-btn-primary" disabled={saving}>
          {saving ? <><span className="stg-spin"/>{t('settings.saving')}</> : <><CheckCircle width={16} height={16}/>{t('settings.save_changes')}</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   DELIVERY TAB
═══════════════════════════════════════════════════════════════ */
function DeliveryTab({ data, setData, onSave, saving }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon orange"><DeliveryTruck width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.delivery.defaults')}</div>
            <div className="stg-section-sub">{t('settings.delivery.defaults_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.delivery.default_emirate')}</label>
            <select value={s.default_emirate||'Dubai'} onChange={e=>set('default_emirate',e.target.value)}>
              {EMIRATE_OPTIONS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.default_fee')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">AED</span>
              <input type="number" min="0" step="0.01" value={s.default_delivery_fee||''} onChange={e=>set('default_delivery_fee',e.target.value)} placeholder="15.00" style={{[isRTL?'paddingRight':'paddingLeft']:52}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.max_cod')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">AED</span>
              <input type="number" min="0" value={s.max_cod_amount||''} onChange={e=>set('max_cod_amount',e.target.value)} placeholder="5000" style={{[isRTL?'paddingRight':'paddingLeft']:52}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.driver_commission')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="100" step="0.1" value={s.driver_commission_percent||''} onChange={e=>set('driver_commission_percent',e.target.value)} placeholder="20" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.platform_commission')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="100" step="0.1" value={s.platform_commission_percent||''} onChange={e=>set('platform_commission_percent',e.target.value)} placeholder="15" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.expected_days')}</label>
            <div className="stg-input-wrap"><Clock width={15} height={15} className="stg-input-icon"/>
              <input type="number" min="1" value={s.expected_delivery_days||''} onChange={e=>set('expected_delivery_days',e.target.value)} placeholder="1" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.delivery.max_weight')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">kg</span>
              <input type="number" min="0" step="0.1" value={s.max_weight_kg||''} onChange={e=>set('max_weight_kg',e.target.value)} placeholder="30" style={{[isRTL?'paddingRight':'paddingLeft']:38}} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tax & VAT Configuration (#61 #73) ── */}
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon green" style={{background:'#dcfce7'}}><Wallet width={18} height={18} style={{color:'#16a34a'}}/></div>
          <div>
            <div className="stg-section-title">{t('settings.tax.title')}</div>
            <div className="stg-section-sub">{t('settings.tax.subtitle')}</div>
          </div>
        </div>
        <div className="stg-toggles" style={{marginBottom:16}}>
          <div className="stg-toggle-row">
            <div>
              <div className="stg-toggle-label">{t('settings.tax.vat_enabled')}</div>
              <div className="stg-toggle-desc">{t('settings.tax.vat_enabled_desc')}</div>
            </div>
            <Toggle on={!!s.vat_enabled} onChange={v => set('vat_enabled', v)} />
          </div>
          {s.vat_enabled && (
            <div className="stg-toggle-row">
              <div>
                <div className="stg-toggle-label">{t('settings.tax.apply_on_delivery')}</div>
                <div className="stg-toggle-desc">{t('settings.tax.apply_on_delivery_desc')}</div>
              </div>
              <Toggle on={s.apply_vat_on_delivery_fee !== false} onChange={v => set('apply_vat_on_delivery_fee', v)} />
            </div>
          )}
        </div>
        {s.vat_enabled && (
          <div className="stg-grid">
            <div className="stg-field">
              <label>{t('settings.tax.vat_rate')}</label>
              <div className="stg-input-wrap"><span className="stg-prefix">%</span>
                <input type="number" min="0" max="100" step="0.01" value={s.vat_rate||''} onChange={e=>set('vat_rate',e.target.value)} placeholder="5" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
              </div>
            </div>
            <div className="stg-field">
              <label>{t('settings.tax.vat_trn')}</label>
              <div className="stg-input-wrap"><Wallet width={15} height={15} className="stg-input-icon"/>
                <input value={s.vat_number||''} onChange={e=>set('vat_number',e.target.value)} placeholder="100XXXXXXXXX003" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── NEW FINANCIAL SETTINGS (#63–#109) ────────────────── */}
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon purple"><Wallet width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.financial.title')}</div>
            <div className="stg-section-sub">{t('settings.financial.subtitle')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.financial.commission_rate')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="100" step="0.01" value={s.commission_rate||''} onChange={e=>set('commission_rate',e.target.value)} placeholder="10" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.financial.platform_fee')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="100" step="0.01" value={s.platform_fee_pct||''} onChange={e=>set('platform_fee_pct',e.target.value)} placeholder="2" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.financial.payment_gateway_fee')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="10" step="0.01" value={s.payment_gateway_fee_pct||''} onChange={e=>set('payment_gateway_fee_pct',e.target.value)} placeholder="2.5" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.financial.free_delivery_min')}</label>
            <div className="stg-input-wrap"><Wallet width={15} height={15} className="stg-input-icon"/>
              <input type="number" min="0" step="1" value={s.free_delivery_min_order||''} onChange={e=>set('free_delivery_min_order',e.target.value)} placeholder="100" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.financial.late_settlement_fee')}</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="50" step="0.1" value={s.late_settlement_fee_pct||''} onChange={e=>set('late_settlement_fee_pct',e.target.value)} placeholder="5" style={{[isRTL?'paddingRight':'paddingLeft']:36}} />
            </div>
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon purple"><ToggleOn width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.delivery.feature_toggles')}</div>
            <div className="stg-section-sub">{t('settings.delivery.feature_toggles_sub')}</div>
          </div>
        </div>
        <div className="stg-toggles">
          {[
            { key:'cod_enabled',           label:t('settings.delivery.cod_enabled'),         desc:t('settings.delivery.cod_desc') },
            { key:'return_enabled',        label:t('settings.delivery.return_enabled'),      desc:t('settings.delivery.return_desc') },
            { key:'express_enabled',       label:t('settings.delivery.express_enabled'),     desc:t('settings.delivery.express_desc') },
            { key:'sms_tracking_enabled',  label:t('settings.delivery.sms_tracking'),        desc:t('settings.delivery.sms_tracking_desc') },
            { key:'email_tracking_enabled',label:t('settings.delivery.email_tracking'),      desc:t('settings.delivery.email_tracking_desc') },
            { key:'driver_tip_enabled',    label:t('settings.delivery.driver_tips'),         desc:t('settings.delivery.driver_tips_desc') },
          ].map(({ key, label, desc }) => (
            <div key={key} className="stg-toggle-row">
              <div>
                <div className="stg-toggle-label">{label}</div>
                <div className="stg-toggle-desc">{desc}</div>
              </div>
              <Toggle on={!!s[key]} onChange={v => set(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="stg-save-bar">
        <button type="submit" className="stg-btn-primary" disabled={saving}>
          {saving ? <><span className="stg-spin"/>{t('settings.saving')}</> : <><CheckCircle width={16} height={16}/>{t('settings.save_changes')}</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
═══════════════════════════════════════════════════════════════ */
function NotificationsTab({ data, setData, onSave, saving }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const [showPass, setShowPass] = useState(false);

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon blue"><Mail width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.notifications.email_smtp')}</div>
            <div className="stg-section-sub">{t('settings.notifications.email_smtp_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.notifications.smtp_host')}</label>
            <input value={s.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.office365.com" />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.smtp_port')}</label>
            <input type="number" value={s.smtp_port||''} onChange={e=>set('smtp_port',e.target.value)} placeholder="587" />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.smtp_username')}</label>
            <div className="stg-input-wrap"><Mail width={15} height={15} className="stg-input-icon"/>
              <input value={s.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="noreply@company.ae" />
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.smtp_password')}</label>
            <div className="stg-input-wrap" style={{position:'relative'}}>
              <input type={showPass?'text':'password'} value={s.smtp_pass||''} onChange={e=>set('smtp_pass',e.target.value)} placeholder="••••••••••" style={{[isRTL?'paddingLeft':'paddingRight']:40}} />
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',[isRTL?'left':'right']:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:0}}>
                {showPass ? <EyeClosed width={15} height={15}/> : <Eye width={15} height={15}/>}
              </button>
            </div>
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.from_name')}</label>
            <input value={s.email_from_name||''} onChange={e=>set('email_from_name',e.target.value)} placeholder="Trasealla Solutions" />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.reply_to')}</label>
            <input type="email" value={s.email_reply_to||''} onChange={e=>set('email_reply_to',e.target.value)} placeholder="support@company.ae" />
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon green"><Bell width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">{t('settings.notifications.sms_title')}</div>
            <div className="stg-section-sub">{t('settings.notifications.sms_sub')}</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>{t('settings.notifications.sms_sender_id')}</label>
            <input value={s.sms_sender_id||''} onChange={e=>set('sms_sender_id',e.target.value)} placeholder="TRASEALLA" maxLength={11} />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.twilio_sid')}</label>
            <input value={s.twilio_sid||''} onChange={e=>set('twilio_sid',e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.twilio_token')}</label>
            <input type="password" value={s.twilio_token||''} onChange={e=>set('twilio_token',e.target.value)} placeholder="••••••••••••••••••••••••••••••••" />
          </div>
          <div className="stg-field">
            <label>{t('settings.notifications.twilio_phone')}</label>
            <div className="stg-input-wrap"><Phone width={15} height={15} className="stg-input-icon"/>
              <input value={s.twilio_phone||''} onChange={e=>set('twilio_phone',e.target.value)} placeholder="+12015550123" />
            </div>
          </div>
        </div>
        <div className="stg-info-box">
          <Bell width={14} height={14}/>
          {t('settings.notifications.sms_info')}
        </div>
      </div>

      <div className="stg-save-bar">
        <button type="submit" className="stg-btn-primary" disabled={saving}>
          {saving ? <><span className="stg-spin"/>{t('settings.saving')}</> : <><CheckCircle width={16} height={16}/>{t('settings.save_changes')}</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES TAB
═══════════════════════════════════════════════════════════════ */
function CategoriesTab({ toast }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const emptyForm = { name:'', name_ar:'', color:'#f97316', icon:'package', description:'' };
  const [form, setForm]             = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/settings/categories');
    if (res.success) setCategories(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = c  => { setEditing(c); setForm({ name:c.name, name_ar:c.name_ar||'', color:c.color||'#f97316', icon:c.icon||'package', description:c.description||'' }); setShowModal(true); };

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    const res = editing
      ? await api.put('/settings/categories/'+editing.id, form)
      : await api.post('/settings/categories', form);
    if (res.success) {
      toast('success', editing ? t('settings.categories.updated') : t('settings.categories.created'));
      setShowModal(false); load();
    } else {
      toast('error', res.message || t('settings.categories.save_failed'));
    }
    setSaving(false);
  };

  const handleDelete = async cat => {
    if (!confirm(t('settings.categories.delete_confirm', { name: cat.name }))) return;
    const res = await api.delete('/settings/categories/'+cat.id);
    if (res.success) { toast('success', t('settings.categories.deleted')); load(); }
    else toast('error', t('settings.categories.delete_failed'));
  };

  const handleToggle = async cat => {
    await api.put('/settings/categories/'+cat.id, { ...cat, is_active: !cat.is_active });
    load();
  };

  if (loading) return <div className="stg-loader">{t('settings.categories.loading')}</div>;

  return (
    <div className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="stg-section-icon purple"><Tag width={18} height={18}/></div>
            <div>
              <div className="stg-section-title">{t('settings.categories.title')}</div>
              <div className="stg-section-sub">{t('settings.categories.count', { count: categories.length })}</div>
            </div>
          </div>
          <button className="stg-btn-primary" type="button" onClick={openAdd}>
            <Plus width={15} height={15}/> {t('settings.categories.add')}
          </button>
        </div>

        <div className="stg-cat-grid">
          {categories.map(cat => (
            <div key={cat.id} className={'stg-cat-card'+(cat.is_active?'':' stg-cat-inactive')}>
              <div className="stg-cat-swatch" style={{background:cat.color+'18',border:'2px solid '+cat.color+'40'}}>
                <div className="stg-cat-dot" style={{background:cat.color}}/>
              </div>
              <div className="stg-cat-info">
                <div className="stg-cat-name">{cat.name}</div>
                {cat.name_ar && <div className="stg-cat-ar" dir="rtl">{cat.name_ar}</div>}
                {cat.description && <div className="stg-cat-desc">{cat.description}</div>}
              </div>
              <div className="stg-cat-actions">
                <Toggle on={!!cat.is_active} onChange={() => handleToggle(cat)} />
                <button type="button" className="stg-icon-btn blue" onClick={() => openEdit(cat)} title="Edit"><EditPencil width={14} height={14}/></button>
                <button type="button" className="stg-icon-btn red"  onClick={() => handleDelete(cat)} title="Delete"><Trash width={14} height={14}/></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="stg-empty"><Tag width={36} height={36}/><p>{t('settings.categories.empty')}</p></div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="stg-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="stg-modal">
            <div className="stg-modal-head">
              <span>{editing ? t('settings.categories.edit_title') : t('settings.categories.new_title')}</span>
              <button type="button" onClick={()=>setShowModal(false)} className="stg-modal-close"><Xmark width={18} height={18}/></button>
            </div>
            <form onSubmit={handleSave} className="stg-modal-body">
              <div className="stg-grid">
                <div className="stg-field">
                  <label>{t('settings.categories.name_en')}</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Electronics" />
                </div>
                <div className="stg-field">
                  <label>{t('settings.categories.name_ar')}</label>
                  <input dir="rtl" value={form.name_ar} onChange={e=>setForm(f=>({...f,name_ar:e.target.value}))} placeholder="إلكترونيات" />
                </div>
                <div className="stg-field stg-span">
                  <label>{t('settings.categories.description')}</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Short description (optional)" />
                </div>
                <div className="stg-field stg-span">
                  <label>{t('settings.categories.color')}</label>
                  <div className="stg-color-picker">
                    {CATEGORY_COLORS.map(c => (
                      <button key={c} type="button"
                        className={'stg-color-swatch'+(form.color===c?' selected':'')}
                        style={{background:c, outline: form.color===c?'3px solid '+c:undefined, outlineOffset:2}}
                        onClick={() => setForm(f=>({...f,color:c}))} />
                    ))}
                    <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} className="stg-color-custom" title="Custom color" />
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:form.color+'22',border:'2px solid '+form.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:14,height:14,borderRadius:'50%',background:form.color}}/>
                    </div>
                    <span style={{fontSize:12,fontFamily:'monospace',color:'#475569',fontWeight:600}}>{form.color}</span>
                  </div>
                </div>
              </div>
              <div className="stg-modal-footer">
                <button type="button" className="stg-btn-ghost" onClick={()=>setShowModal(false)}>{t('settings.categories.cancel')}</button>
                <button type="submit" className="stg-btn-primary" disabled={saving}>
                  {saving ? <><span className="stg-spin"/>{t('settings.categories.saving')}</> : (editing ? t('settings.categories.update') : t('settings.categories.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROLES & PERMISSIONS TAB
═══════════════════════════════════════════════════════════════ */

const MODULE_SECTIONS = {
  main:       { label: 'Main', icon: '🏠' },
  operations: { label: 'Operations', icon: '📦' },
  finance:    { label: 'Finance', icon: '💰' },
  analytics:  { label: 'Analytics', icon: '📊' },
  config:     { label: 'Configuration', icon: '⚙️' },
  system:     { label: 'System', icon: '🔧' },
  driver:     { label: 'Driver Tools', icon: '🚗' },
};

function RolesTab({ toast }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [roles, setRoles]         = useState([]);
  const [modules, setModules]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editRole, setEditRole]   = useState(null);   // null = list view, object = editing
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]       = useState(false);

  const emptyForm = { name: '', name_ar: '', slug: '', description: '', modules: [] };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const [rolesRes, modsRes] = await Promise.all([
      api.get('/settings/roles'),
      api.get('/settings/modules'),
    ]);
    if (rolesRes.success) setRoles(rolesRes.data || []);
    if (modsRes.success) setModules(modsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const g = {};
    for (const m of modules) {
      if (!g[m.section]) g[m.section] = [];
      g[m.section].push(m);
    }
    return g;
  }, [modules]);

  const toggleModule = (key) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(key) ? f.modules.filter(k => k !== key) : [...f.modules, key],
    }));
  };

  const toggleSection = (sectionModules) => {
    const keys = sectionModules.map(m => m.key);
    const allSelected = keys.every(k => form.modules.includes(k));
    setForm(f => ({
      ...f,
      modules: allSelected
        ? f.modules.filter(k => !keys.includes(k))
        : [...new Set([...f.modules, ...keys])],
    }));
  };

  const selectAll = () => {
    setForm(f => ({ ...f, modules: modules.map(m => m.key) }));
  };
  const clearAll = () => {
    setForm(f => ({ ...f, modules: [] }));
  };

  const startEdit = (role) => {
    setForm({
      name: role.name,
      name_ar: role.name_ar || '',
      slug: role.slug,
      description: role.description || '',
      modules: Array.isArray(role.modules) ? [...role.modules] : [],
    });
    setEditRole(role);
    setShowCreate(false);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditRole(null);
    setShowCreate(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editRole) {
      const res = await api.put('/settings/roles/' + editRole.id, form);
      if (res.success) {
        toast('success', t('settings.roles_tab.saved'));
        setEditRole(null);
        load();
      } else {
        toast('error', res.message || t('settings.roles_tab.save_failed'));
      }
    } else {
      const res = await api.post('/settings/roles', form);
      if (res.success) {
        toast('success', t('settings.roles_tab.created'));
        setShowCreate(false);
        load();
      } else {
        toast('error', res.message || t('settings.roles_tab.create_failed'));
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('settings.roles_tab.delete_confirm'))) return;
    const res = await api.delete('/settings/roles/' + id);
    if (res.success) {
      toast('success', t('settings.roles_tab.deleted'));
      load();
    } else {
      toast('error', res.message || t('settings.roles_tab.delete_failed'));
    }
  };

  if (loading) return <div className="stg-loader">{t('settings.loading')}</div>;

  // Editing / creating form view
  if (editRole || showCreate) {
    return (
      <div className="stg-content">
        <div className="stg-section">
          <div className="stg-section-head" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="stg-section-icon" style={{ background: '#7c3aed20', color: '#7c3aed' }}>
                <ShieldCheck width={18} height={18} />
              </div>
              <div>
                <div className="stg-section-title">
                  {editRole ? t('settings.roles_tab.edit_role') : t('settings.roles_tab.new_role')}
                </div>
                <div className="stg-section-sub">
                  {editRole ? editRole.name : t('settings.roles_tab.new_role_sub')}
                </div>
              </div>
            </div>
            <button className="stg-btn-ghost" type="button" onClick={() => { setEditRole(null); setShowCreate(false); }}>
              ← {t('settings.roles_tab.back')}
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="stg-grid" style={{ padding: '0 0 20px' }}>
              <div className="stg-field">
                <label>{t('settings.roles_tab.role_name')}</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                       placeholder="e.g. Manager" />
              </div>
              <div className="stg-field">
                <label>{t('settings.roles_tab.role_name_ar')}</label>
                <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                       placeholder="e.g. مدير" dir="rtl" />
              </div>
              {!editRole && (
                <div className="stg-field">
                  <label>{t('settings.roles_tab.slug')}</label>
                  <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') }))}
                         placeholder="e.g. manager" style={{ fontFamily: 'monospace' }} />
                </div>
              )}
              <div className="stg-field" style={{ gridColumn: '1/-1' }}>
                <label>{t('settings.roles_tab.description')}</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                       placeholder={t('settings.roles_tab.description_placeholder')} />
              </div>
            </div>

            {/* Module permissions */}
            <div style={{ padding: '0 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                {t('settings.roles_tab.module_permissions')} ({form.modules.length}/{modules.length})
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="stg-btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={selectAll}>
                  {t('settings.roles_tab.select_all')}
                </button>
                <button type="button" className="stg-btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={clearAll}>
                  {t('settings.roles_tab.clear_all')}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {Object.entries(grouped).map(([section, mods]) => {
                const sectionMeta = MODULE_SECTIONS[section] || { label: section, icon: '📄' };
                const allChecked = mods.every(m => form.modules.includes(m.key));
                const someChecked = mods.some(m => form.modules.includes(m.key));
                return (
                  <div key={section} style={{
                    border: '1px solid #e2e8f0', borderRadius: 12,
                    overflow: 'hidden', background: '#fff'
                  }}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                      }}
                      onClick={() => toggleSection(mods)}
                    >
                      <input type="checkbox" checked={allChecked} readOnly
                             style={{ accentColor: '#7c3aed', width: 16, height: 16 }}
                             ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }} />
                      <span style={{ fontSize: 16 }}>{sectionMeta.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('settings.roles_tab.section_' + section, sectionMeta.label)}
                      </span>
                      <span style={{ marginInlineStart: 'auto', fontSize: 12, color: '#94a3b8' }}>
                        {mods.filter(m => form.modules.includes(m.key)).length}/{mods.length}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4, padding: '8px 12px' }}>
                      {mods.map(m => (
                        <label key={m.key} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                          background: form.modules.includes(m.key) ? '#7c3aed10' : 'transparent',
                          transition: 'background 0.15s',
                        }}>
                          <input type="checkbox" checked={form.modules.includes(m.key)}
                                 onChange={() => toggleModule(m.key)}
                                 style={{ accentColor: '#7c3aed', width: 15, height: 15 }} />
                          <span style={{ fontSize: 13, fontWeight: form.modules.includes(m.key) ? 600 : 400, color: '#334155' }}>
                            {m.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingBottom: 20 }}>
              <button type="button" className="stg-btn-ghost" onClick={() => { setEditRole(null); setShowCreate(false); }}>
                {t('settings.roles_tab.cancel')}
              </button>
              <button type="submit" className="stg-btn-primary" disabled={saving}>
                {saving ? t('settings.roles_tab.saving') : editRole ? t('settings.roles_tab.save_changes') : t('settings.roles_tab.create_role')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="stg-section-icon" style={{ background: '#7c3aed20', color: '#7c3aed' }}>
              <ShieldCheck width={18} height={18} />
            </div>
            <div>
              <div className="stg-section-title">{t('settings.roles_tab.title')}</div>
              <div className="stg-section-sub">{t('settings.roles_tab.count', { count: roles.length })}</div>
            </div>
          </div>
          <button className="stg-btn-primary" type="button" onClick={startCreate}>
            <Plus width={15} height={15} /> {t('settings.roles_tab.add_role')}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {roles.map(role => {
            const mCount = Array.isArray(role.modules) ? role.modules.length : 0;
            return (
              <div key={role.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', border: '1px solid #e2e8f0',
                borderRadius: 12, background: '#fff',
                transition: 'box-shadow 0.15s',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: role.is_system ? 'linear-gradient(135deg, #7c3aed33, #7c3aed66)' : 'linear-gradient(135deg, #f9731633, #f9731666)',
                  fontSize: 18, fontWeight: 800,
                  color: role.is_system ? '#7c3aed' : '#f97316',
                }}>
                  {(role.name || '?')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                    {isRTL && role.name_ar ? role.name_ar : role.name}
                    {role.is_system && (
                      <span style={{
                        marginInlineStart: 8, fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 20,
                        background: '#ede9fe', color: '#7c3aed',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {t('settings.roles_tab.system')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {role.description || role.slug}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                      {t('settings.roles_tab.users_count', { count: role.user_count || 0 })}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
                      {t('settings.roles_tab.modules_count', { count: mCount })}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="stg-icon-btn" onClick={() => startEdit(role)} title={t('settings.roles_tab.edit')}>
                    <EditPencil width={14} height={14} />
                  </button>
                  {!role.is_system && (
                    <button className="stg-icon-btn red" onClick={() => handleDelete(role.id)} title={t('settings.roles_tab.delete')}>
                      <Trash width={14} height={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {roles.length === 0 && (
            <div className="stg-empty">
              <ShieldCheck width={36} height={36} />
              <p>{t('settings.roles_tab.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   USERS TAB
═══════════════════════════════════════════════════════════════ */
function UsersTab({ toast }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers]        = useState([]);
  const [roles, setRoles]        = useState([]);
  const [loading, setLoading]    = useState(true);
  const [showModal, setShowModal]= useState(false);
  const [saving, setSaving]      = useState(false);
  const [showPw, setShowPw]      = useState(false);
  const [credentials, setCredentials] = useState(null); // { username, password, email, email_sent }
  const emptyForm = { username:'', full_name:'', email:'', phone:'', password:'', role:'dispatcher', role_id: '' };
  const [form, setForm]          = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, rolesRes] = await Promise.all([
      api.get('/settings/users'),
      api.get('/settings/roles'),
    ]);
    if (usersRes.success) setUsers(usersRes.data || []);
    if (rolesRes.success) {
      const r = rolesRes.data || [];
      setRoles(r);
      // Set default role_id to first non-admin role
      const defaultRole = r.find(x => x.slug === 'dispatcher') || r[0];
      if (defaultRole) setForm(f => ({ ...f, role: defaultRole.slug, role_id: defaultRole.id }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async e => {
    e.preventDefault(); setSaving(true);
    const res = await api.post('/settings/users', form);
    if (res.success) {
      toast('success', t('settings.users.created'));
      setShowModal(false);
      setCredentials({
        full_name: form.full_name,
        username: form.username,
        password: form.password,
        email: form.email,
        email_sent: res.email_sent,
      });
      setForm(emptyForm); load();
    } else {
      toast('error', res.message || t('settings.users.create_failed'));
    }
    setSaving(false);
  };

  const del = async id => {
    if (!confirm(t('settings.users.deactivate_confirm'))) return;
    const res = await api.delete('/settings/users/'+id);
    if (res.success) { toast('success', t('settings.users.deactivated')); load(); }
  };

  if (loading) return <div className="stg-loader">{t('settings.users.loading')}</div>;

  return (
    <div className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="stg-section-icon blue"><User width={18} height={18}/></div>
            <div>
              <div className="stg-section-title">{t('settings.users.title')}</div>
              <div className="stg-section-sub">{t('settings.users.count', { count: users.length })}</div>
            </div>
          </div>
          <button className="stg-btn-primary" type="button" onClick={()=>{ setForm(emptyForm); setShowModal(true); }}>
            <Plus width={15} height={15}/> {t('settings.users.add')}
          </button>
        </div>

        <div className="stg-user-list">
          {users.map(u => {
            const meta = ROLE_META[u.role] || ROLE_META.client;
            const roleObj = roles.find(r => r.slug === u.role);
            const roleName = roleObj ? (isRTL && roleObj.name_ar ? roleObj.name_ar : roleObj.name) : (u.role || 'unknown');
            return (
              <div key={u.id} className="stg-user-row">
                <div className="stg-user-avatar" style={{background:'linear-gradient(135deg,'+meta.badge+'33,'+meta.badge+'66)'}}>
                  <span style={{color:meta.badge,fontWeight:800,fontSize:15}}>
                    {(u.full_name||u.username||'?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="stg-user-info">
                  <div className="stg-user-name">{u.full_name || u.username}</div>
                  <div className="stg-user-meta">{u.email}{u.phone?' · '+u.phone:''}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <span className="stg-role-badge" style={{background:meta.bg,color:meta.badge}}>{roleName}</span>
                  <span className="stg-user-date">{fmtDate(u.created_at)}</span>
                  {u.role !== 'superadmin' && !u.is_owner && String(u.id) !== String(currentUser?.id) && (
                    <button className="stg-icon-btn red" onClick={()=>del(u.id)} title="Deactivate"><Trash width={13} height={13}/></button>
                  )}
                </div>
              </div>
            );
          })}
          {users.length === 0 && <div className="stg-empty"><User width={36} height={36}/><p>{t('settings.users.empty')}</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="stg-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="stg-modal">
            <div className="stg-modal-head">
              <span>{t('settings.users.modal_title')}</span>
              <button type="button" onClick={()=>setShowModal(false)} className="stg-modal-close"><Xmark width={18} height={18}/></button>
            </div>
            <form onSubmit={handleAdd} className="stg-modal-body">
              <div className="stg-grid">
                <div className="stg-field">
                  <label>{t('settings.users.full_name')}</label>
                  <input required value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Ahmed Al Mansoori" />
                </div>
                <div className="stg-field">
                  <label>{t('settings.users.username')}</label>
                  <input required value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="ahmed.mansoori" />
                </div>
                <div className="stg-field">
                  <label>{t('settings.users.email')}</label>
                  <input required type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="ahmed@company.ae" />
                </div>
                <div className="stg-field">
                  <label>{t('settings.users.phone')}</label>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+971 50 000 0000" />
                </div>
                <div className="stg-field">
                  <label>{t('settings.users.password')}</label>
                  <div className="stg-input-wrap" style={{position:'relative'}}>
                    <input required type={showPw?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 characters" style={{[isRTL?'paddingLeft':'paddingRight']:40}} />
                    <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',[isRTL?'left':'right']:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:0}}>
                      {showPw ? <EyeClosed width={15} height={15}/> : <Eye width={15} height={15}/>}
                    </button>
                  </div>
                </div>
                <div className="stg-field">
                  <label>{t('settings.users.role')}</label>
                  <select value={form.role_id} onChange={e => {
                    const selectedRole = roles.find(r => String(r.id) === e.target.value);
                    setForm(f => ({ ...f, role_id: Number(e.target.value), role: selectedRole?.slug || f.role }));
                  }}>
                    {roles.map(r => <option key={r.id} value={r.id}>{isRTL && r.name_ar ? r.name_ar : r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="stg-modal-footer">
                <button type="button" className="stg-btn-ghost" onClick={()=>setShowModal(false)}>{t('settings.users.cancel')}</button>
                <button type="submit" className="stg-btn-primary" disabled={saving}>
                  {saving ? <><span className="stg-spin"/>{t('settings.users.creating')}</> : t('settings.users.create_user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials confirmation modal */}
      {credentials && (
        <div className="stg-overlay" onClick={e => e.target === e.currentTarget && setCredentials(null)}>
          <div className="stg-modal" style={{ maxWidth: 440 }}>
            <div className="stg-modal-head" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff' }}>
              <span>{t('settings.users.credentials_title')}</span>
              <button type="button" onClick={() => setCredentials(null)} className="stg-modal-close" style={{ color: '#fff' }}>
                <Xmark width={18} height={18} />
              </button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0',
              }}>
                <CheckCircle width={20} height={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                  {t('settings.users.account_created_for', { name: credentials.full_name })}
                </span>
              </div>

              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                overflow: 'hidden', marginBottom: 16,
              }}>
                {[
                  { label: t('settings.users.username'), value: credentials.username },
                  { label: t('settings.users.password'), value: credentials.password },
                  { label: t('settings.users.email'), value: credentials.email },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', borderBottom: i < 2 ? '1px solid #e2e8f0' : 'none',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontFamily: "'Courier New', monospace", color: '#111827', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {credentials.email_sent && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe',
                  marginBottom: 16,
                }}>
                  <Mail width={16} height={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#1e40af' }}>
                    {t('settings.users.welcome_email_sent', { email: credentials.email })}
                  </span>
                </div>
              )}

              <div style={{
                padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a',
                marginBottom: 20,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                  <WarningCircle width={14} height={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                  {t('settings.users.credentials_warning')}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="stg-btn-primary" onClick={() => {
                  const text = `Username: ${credentials.username}\nPassword: ${credentials.password}\nEmail: ${credentials.email}`;
                  navigator.clipboard.writeText(text).then(() => toast('success', t('common.copied')));
                  setCredentials(null);
                }}>
                  {t('settings.users.copy_close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:'general',       icon: Building,      color:'#f97316' },
  { id:'delivery',      icon: DeliveryTruck, color:'#3b82f6' },
  { id:'notifications', icon: Bell,          color:'#8b5cf6' },
  { id:'categories',    icon: Tag,           color:'#0d9488' },
  { id:'roles',         icon: ShieldCheck,   color:'#7c3aed' },
  { id:'users',         icon: User,          color:'#f43f5e' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [tab,     setTab]    = useState('general');
  const [data,    setData]   = useState({});
  const [loading, setLoading]= useState(true);
  const [saving,  setSaving] = useState(false);

  const { toasts, showToast } = useToast();

  // Adapter so older (type,msg) call-sites still work:
  const { checkSession } = useContext(AuthContext);
  const toast = useCallback((type, msg) => showToast(msg, type), [showToast]);

  useEffect(() => {
    api.get('/settings').then(res => {
      if (res.success) setData(res.data || {});
      setLoading(false);
    });
  }, []);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    const { settings = {}, name, logo_url, logo_url_white, phone, email, address, city, country, currency, timezone } = data;
    const res = await api.put('/settings', {
      tenant: { name, logo_url, logo_url_white, phone, email, address, city, country, currency, timezone },
      settings,
    });
    if (res.success) {
      showToast(t('settings.save_success'), 'success');
      // Refresh auth context so sidebar/header picks up new logos immediately
      checkSession();
    }
    else showToast(res.message || t('settings.save_failed'), 'error');
    setSaving(false);
  };

  const activeTab = TABS.find(tb => tb.id === tab);

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      <div className="stg-page-header">
        <div className="stg-page-header-left">
          <div className="stg-page-icon">
            <SettingsIcon width={22} height={22}/>
          </div>
          <div>
            <h2 className="stg-page-title">{t('settings.title')}</h2>
            <p className="stg-page-sub">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="stg-loader" style={{minHeight:300}}>{t('settings.loading')}</div>
      ) : (
        <div className="stg-layout">
          <nav className="stg-sidebar">
            {TABS.map(tb => (
              <button
                key={tb.id}
                type="button"
                className={'stg-nav-btn'+(tab===tb.id?' active':'')}
                onClick={() => setTab(tb.id)}
                style={tab===tb.id?{'--acc':tb.color}:undefined}
              >
                <div className="stg-nav-icon" style={tab===tb.id?{background:tb.color+'20',color:tb.color}:undefined}>
                  <tb.icon width={16} height={16}/>
                </div>
                <span>{t('settings.tabs.' + tb.id)}</span>
                {tab===tb.id && <NavArrowRight width={13} height={13} style={{[isRTL?'marginRight':'marginLeft']:'auto',color:tb.color}}/>}
              </button>
            ))}
          </nav>

          <div className="stg-main">
            <div className="stg-tab-header" style={{'--acc': activeTab?.color}}>
              {activeTab && <activeTab.icon width={20} height={20}/>}
              <div>
                <div className="stg-tab-title">{t('settings.tabs.' + tab)}</div>
                <div className="stg-tab-sub">{t('settings.tab_descriptions.' + tab)}</div>
              </div>
            </div>

            {tab==='general'       && <GeneralTab       data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='delivery'      && <DeliveryTab      data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='notifications' && <NotificationsTab data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='categories'    && <CategoriesTab    toast={toast}/>}
            {tab==='roles'         && <RolesTab         toast={toast}/>}
            {tab==='users'         && <UsersTab         toast={toast}/>}
          </div>
        </div>
      )}
    </div>
  );
}
