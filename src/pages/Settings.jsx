import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../App';
import {
  Settings as SettingsIcon, User, Building, DeliveryTruck, Mail, Bell,
  Label as Tag, Plus, Trash, CheckCircle, WarningCircle, Globe, Phone,
  MapPin, Wallet, Clock, EditPencil, Xmark, Upload, Eye, EyeClosed,
  NavArrowRight, SwitchOn as ToggleOn,
} from 'iconoir-react';
import api from '../lib/api';
import Toast, { useToast } from '../components/Toast';
import './Settings.css';

/* ── helpers ──────────────────────────────────────────────── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const ROLE_META = {
  superadmin: { badge:'#7c3aed', bg:'#ede9fe', label:'Super Admin' },
  admin:      { badge:'#1d4ed8', bg:'#dbeafe', label:'Admin'       },
  dispatcher: { badge:'#0d9488', bg:'#ccfbf1', label:'Dispatcher'  },
  driver:     { badge:'#d97706', bg:'#fef3c7', label:'Driver'      },
  client:     { badge:'#64748b', bg:'#f1f5f9', label:'Client'      },
};

const EMIRATE_OPTIONS = ['Dubai','Abu Dhabi','Sharjah','Ajman','RAK','Fujairah','UAQ'];
const TIMEZONE_OPTIONS = ['Asia/Dubai','Asia/Riyadh','Asia/Kuwait','Europe/London','America/New_York'];
const CURRENCY_OPTIONS = ['AED','USD','SAR','KWD','BHD','EUR'];
const CATEGORY_COLORS  = ['#f97316','#3b82f6','#8b5cf6','#16a34a','#ec4899','#ef4444','#0d9488','#64748b','#f59e0b','#06b6d4','#84cc16','#a855f7'];

/* ── Toggle switch ────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
      background: on ? '#f97316' : '#e2e8f0', position:'relative', transition:'background .2s', flexShrink:0,
    }}>
      <span style={{
        position:'absolute', top:3, left: on ? 22 : 2,
        width:18, height:18, borderRadius:'50%', background:'#fff',
        boxShadow:'0 1px 4px rgba(0,0,0,.2)', transition:'left .2s',
        display:'block',
      }}/>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   GENERAL TAB
═══════════════════════════════════════════════════════════════ */
function GeneralTab({ data, setData, onSave, saving }) {
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const setTenant = (k, v) => setData(d => ({ ...d, [k]: v }));

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon orange"><Building width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">Company Information</div>
            <div className="stg-section-sub">Your business identity and contact details</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>Company Name</label>
            <div className="stg-input-wrap"><Building width={15} height={15} className="stg-input-icon"/>
              <input value={data.name||''} onChange={e=>setTenant('name',e.target.value)} placeholder="Trasealla Delivery Co." />
            </div>
          </div>
          <div className="stg-field">
            <label>Company Phone</label>
            <div className="stg-input-wrap"><Phone width={15} height={15} className="stg-input-icon"/>
              <input value={data.phone||''} onChange={e=>setTenant('phone',e.target.value)} placeholder="+971 4 000 0000" />
            </div>
          </div>
          <div className="stg-field">
            <label>Company Email</label>
            <div className="stg-input-wrap"><Mail width={15} height={15} className="stg-input-icon"/>
              <input type="email" value={data.email||''} onChange={e=>setTenant('email',e.target.value)} placeholder="info@company.ae" />
            </div>
          </div>
          <div className="stg-field">
            <label>Website</label>
            <div className="stg-input-wrap"><Globe width={15} height={15} className="stg-input-icon"/>
              <input value={s.website||''} onChange={e=>set('website',e.target.value)} placeholder="www.company.ae" />
            </div>
          </div>
          <div className="stg-field stg-span">
            <label>Company Address</label>
            <div className="stg-input-wrap"><MapPin width={15} height={15} className="stg-input-icon"/>
              <input value={data.address||''} onChange={e=>setTenant('address',e.target.value)} placeholder="Office 123, Business Bay, Dubai" />
            </div>
          </div>
          <div className="stg-field">
            <label>City</label>
            <input value={data.city||''} onChange={e=>setTenant('city',e.target.value)} placeholder="Dubai" />
          </div>
          <div className="stg-field">
            <label>VAT Number</label>
            <div className="stg-input-wrap"><Wallet width={15} height={15} className="stg-input-icon"/>
              <input value={s.vat_number||''} onChange={e=>set('vat_number',e.target.value)} placeholder="100XXXXXXXXX003" />
            </div>
          </div>
          <div className="stg-field">
            <label>Logo URL</label>
            <div className="stg-input-wrap"><Upload width={15} height={15} className="stg-input-icon"/>
              <input value={data.logo_url||''} onChange={e=>setTenant('logo_url',e.target.value)} placeholder="https://cdn.example.com/logo.png" />
            </div>
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon blue"><Globe width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">Regional Settings</div>
            <div className="stg-section-sub">Timezone, currency and locale</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>Timezone</label>
            <select value={data.timezone||'Asia/Dubai'} onChange={e=>setTenant('timezone',e.target.value)}>
              {TIMEZONE_OPTIONS.map(tz=><option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>Currency</label>
            <select value={data.currency||'AED'} onChange={e=>setTenant('currency',e.target.value)}>
              {CURRENCY_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>Country</label>
            <input value={data.country||''} onChange={e=>setTenant('country',e.target.value)} placeholder="United Arab Emirates" />
          </div>
          <div className="stg-field">
            <label>Default Language</label>
            <select value={s.default_language||'en'} onChange={e=>set('default_language',e.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic (العربية)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stg-save-bar">
        <button type="submit" className="stg-btn-primary" disabled={saving}>
          {saving ? <><span className="stg-spin"/>Saving…</> : <><CheckCircle width={16} height={16}/>Save Changes</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   DELIVERY TAB
═══════════════════════════════════════════════════════════════ */
function DeliveryTab({ data, setData, onSave, saving }) {
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon orange"><DeliveryTruck width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">Delivery Defaults</div>
            <div className="stg-section-sub">Default values applied to new orders</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>Default Emirate</label>
            <select value={s.default_emirate||'Dubai'} onChange={e=>set('default_emirate',e.target.value)}>
              {EMIRATE_OPTIONS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="stg-field">
            <label>Default Delivery Fee (AED)</label>
            <div className="stg-input-wrap"><span className="stg-prefix">AED</span>
              <input type="number" min="0" step="0.01" value={s.default_delivery_fee||''} onChange={e=>set('default_delivery_fee',e.target.value)} placeholder="15.00" style={{paddingLeft:52}} />
            </div>
          </div>
          <div className="stg-field">
            <label>Max COD Amount (AED)</label>
            <div className="stg-input-wrap"><span className="stg-prefix">AED</span>
              <input type="number" min="0" value={s.max_cod_amount||''} onChange={e=>set('max_cod_amount',e.target.value)} placeholder="5000" style={{paddingLeft:52}} />
            </div>
          </div>
          <div className="stg-field">
            <label>Driver Commission (%)</label>
            <div className="stg-input-wrap"><span className="stg-prefix">%</span>
              <input type="number" min="0" max="100" step="0.1" value={s.driver_commission_percent||''} onChange={e=>set('driver_commission_percent',e.target.value)} placeholder="20" style={{paddingLeft:36}} />
            </div>
          </div>
          <div className="stg-field">
            <label>Expected Delivery Days</label>
            <div className="stg-input-wrap"><Clock width={15} height={15} className="stg-input-icon"/>
              <input type="number" min="1" value={s.expected_delivery_days||''} onChange={e=>set('expected_delivery_days',e.target.value)} placeholder="1" />
            </div>
          </div>
          <div className="stg-field">
            <label>Max Weight (kg)</label>
            <div className="stg-input-wrap"><span className="stg-prefix">kg</span>
              <input type="number" min="0" step="0.1" value={s.max_weight_kg||''} onChange={e=>set('max_weight_kg',e.target.value)} placeholder="30" style={{paddingLeft:38}} />
            </div>
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon purple"><ToggleOn width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">Feature Toggles</div>
            <div className="stg-section-sub">Enable or disable platform features</div>
          </div>
        </div>
        <div className="stg-toggles">
          {[
            { key:'cod_enabled',           label:'Cash on Delivery (COD)',         desc:'Allow orders to be paid on delivery' },
            { key:'return_enabled',        label:'Return Orders',                  desc:'Enable return/reverse logistics' },
            { key:'express_enabled',       label:'Express Delivery',               desc:'Allow same-day / express order types' },
            { key:'sms_tracking_enabled',  label:'SMS Tracking Notifications',     desc:'Send automated SMS when status changes' },
            { key:'email_tracking_enabled',label:'Email Tracking Notifications',   desc:'Send automated emails when status changes' },
            { key:'driver_tip_enabled',    label:'Driver Tips',                    desc:'Allow recipients to tip the driver' },
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
          {saving ? <><span className="stg-spin"/>Saving…</> : <><CheckCircle width={16} height={16}/>Save Changes</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS TAB
═══════════════════════════════════════════════════════════════ */
function NotificationsTab({ data, setData, onSave, saving }) {
  const s = data.settings || {};
  const set = (k, v) => setData(d => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const [showPass, setShowPass] = useState(false);

  return (
    <form onSubmit={onSave} className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon blue"><Mail width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">Email / SMTP</div>
            <div className="stg-section-sub">Configure outbound email delivery</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>SMTP Host</label>
            <input value={s.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.office365.com" />
          </div>
          <div className="stg-field">
            <label>SMTP Port</label>
            <input type="number" value={s.smtp_port||''} onChange={e=>set('smtp_port',e.target.value)} placeholder="587" />
          </div>
          <div className="stg-field">
            <label>SMTP Username</label>
            <div className="stg-input-wrap"><Mail width={15} height={15} className="stg-input-icon"/>
              <input value={s.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="noreply@company.ae" />
            </div>
          </div>
          <div className="stg-field">
            <label>SMTP Password</label>
            <div className="stg-input-wrap" style={{position:'relative'}}>
              <input type={showPass?'text':'password'} value={s.smtp_pass||''} onChange={e=>set('smtp_pass',e.target.value)} placeholder="••••••••••" style={{paddingRight:40}} />
              <button type="button" onClick={()=>setShowPass(p=>!p)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:0}}>
                {showPass ? <EyeClosed width={15} height={15}/> : <Eye width={15} height={15}/>}
              </button>
            </div>
          </div>
          <div className="stg-field">
            <label>From Name</label>
            <input value={s.email_from_name||''} onChange={e=>set('email_from_name',e.target.value)} placeholder="Trasealla Delivery" />
          </div>
          <div className="stg-field">
            <label>Reply-To Email</label>
            <input type="email" value={s.email_reply_to||''} onChange={e=>set('email_reply_to',e.target.value)} placeholder="support@company.ae" />
          </div>
        </div>
      </div>

      <div className="stg-section">
        <div className="stg-section-head">
          <div className="stg-section-icon green"><Bell width={18} height={18}/></div>
          <div>
            <div className="stg-section-title">SMS Settings</div>
            <div className="stg-section-sub">Configure SMS gateway for notifications</div>
          </div>
        </div>
        <div className="stg-grid">
          <div className="stg-field">
            <label>SMS Sender ID</label>
            <input value={s.sms_sender_id||''} onChange={e=>set('sms_sender_id',e.target.value)} placeholder="TRASEALLA" maxLength={11} />
          </div>
          <div className="stg-field">
            <label>Twilio Account SID</label>
            <input value={s.twilio_sid||''} onChange={e=>set('twilio_sid',e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div className="stg-field">
            <label>Twilio Auth Token</label>
            <input type="password" value={s.twilio_token||''} onChange={e=>set('twilio_token',e.target.value)} placeholder="••••••••••••••••••••••••••••••••" />
          </div>
          <div className="stg-field">
            <label>Twilio Phone Number</label>
            <div className="stg-input-wrap"><Phone width={15} height={15} className="stg-input-icon"/>
              <input value={s.twilio_phone||''} onChange={e=>set('twilio_phone',e.target.value)} placeholder="+12015550123" />
            </div>
          </div>
        </div>
        <div className="stg-info-box">
          <Bell width={14} height={14}/>
          SMS notifications are sent automatically when an order status changes if <strong>SMS Tracking</strong> is enabled in Delivery settings.
        </div>
      </div>

      <div className="stg-save-bar">
        <button type="submit" className="stg-btn-primary" disabled={saving}>
          {saving ? <><span className="stg-spin"/>Saving…</> : <><CheckCircle width={16} height={16}/>Save Changes</>}
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES TAB
═══════════════════════════════════════════════════════════════ */
function CategoriesTab({ toast }) {
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
      toast('success', editing ? 'Category updated' : 'Category created');
      setShowModal(false); load();
    } else {
      toast('error', res.message || 'Failed to save category');
    }
    setSaving(false);
  };

  const handleDelete = async cat => {
    if (!confirm('Delete category "'+cat.name+'"?')) return;
    const res = await api.delete('/settings/categories/'+cat.id);
    if (res.success) { toast('success', 'Category deleted'); load(); }
    else toast('error', 'Failed to delete category');
  };

  const handleToggle = async cat => {
    await api.put('/settings/categories/'+cat.id, { ...cat, is_active: !cat.is_active });
    load();
  };

  if (loading) return <div className="stg-loader">Loading categories…</div>;

  return (
    <div className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="stg-section-icon purple"><Tag width={18} height={18}/></div>
            <div>
              <div className="stg-section-title">Order Categories</div>
              <div className="stg-section-sub">{categories.length} categories · Used to classify shipments</div>
            </div>
          </div>
          <button className="stg-btn-primary" type="button" onClick={openAdd}>
            <Plus width={15} height={15}/> Add Category
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
            <div className="stg-empty"><Tag width={36} height={36}/><p>No categories yet</p></div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="stg-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="stg-modal">
            <div className="stg-modal-head">
              <span>{editing ? 'Edit Category' : 'New Category'}</span>
              <button type="button" onClick={()=>setShowModal(false)} className="stg-modal-close"><Xmark width={18} height={18}/></button>
            </div>
            <form onSubmit={handleSave} className="stg-modal-body">
              <div className="stg-grid">
                <div className="stg-field">
                  <label>Name (English) *</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Electronics" />
                </div>
                <div className="stg-field">
                  <label>Name (Arabic)</label>
                  <input dir="rtl" value={form.name_ar} onChange={e=>setForm(f=>({...f,name_ar:e.target.value}))} placeholder="إلكترونيات" />
                </div>
                <div className="stg-field stg-span">
                  <label>Description</label>
                  <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Short description (optional)" />
                </div>
                <div className="stg-field stg-span">
                  <label>Color</label>
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
                <button type="button" className="stg-btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="stg-btn-primary" disabled={saving}>
                  {saving ? <><span className="stg-spin"/>Saving…</> : (editing ? 'Update' : 'Create')}
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
   USERS TAB
═══════════════════════════════════════════════════════════════ */
function UsersTab({ toast }) {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers]        = useState([]);
  const [loading, setLoading]    = useState(true);
  const [showModal, setShowModal]= useState(false);
  const [saving, setSaving]      = useState(false);
  const [showPw, setShowPw]      = useState(false);
  const emptyForm = { username:'', full_name:'', email:'', phone:'', password:'', role:'dispatcher' };
  const [form, setForm]          = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/settings/users');
    if (res.success) setUsers(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async e => {
    e.preventDefault(); setSaving(true);
    const res = await api.post('/settings/users', form);
    if (res.success) {
      toast('success', 'User created successfully');
      setShowModal(false); setForm(emptyForm); load();
    } else {
      toast('error', res.message || 'Failed to create user');
    }
    setSaving(false);
  };

  const del = async id => {
    if (!confirm('Deactivate this user?')) return;
    const res = await api.delete('/settings/users/'+id);
    if (res.success) { toast('success', 'User deactivated'); load(); }
  };

  if (loading) return <div className="stg-loader">Loading team…</div>;

  return (
    <div className="stg-content">
      <div className="stg-section">
        <div className="stg-section-head" style={{justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="stg-section-icon blue"><User width={18} height={18}/></div>
            <div>
              <div className="stg-section-title">Team Members</div>
              <div className="stg-section-sub">{users.length} user{users.length!==1?'s':''} in your workspace</div>
            </div>
          </div>
          <button className="stg-btn-primary" type="button" onClick={()=>{ setForm(emptyForm); setShowModal(true); }}>
            <Plus width={15} height={15}/> Add User
          </button>
        </div>

        <div className="stg-user-list">
          {users.map(u => {
            const meta = ROLE_META[u.role] || ROLE_META.client;
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
                  <span className="stg-role-badge" style={{background:meta.bg,color:meta.badge}}>{meta.label}</span>
                  <span className="stg-user-date">{fmtDate(u.created_at)}</span>
                  {u.role !== 'superadmin' && !u.is_owner && String(u.id) !== String(currentUser?.id) && (
                    <button className="stg-icon-btn red" onClick={()=>del(u.id)} title="Deactivate"><Trash width={13} height={13}/></button>
                  )}
                </div>
              </div>
            );
          })}
          {users.length === 0 && <div className="stg-empty"><User width={36} height={36}/><p>No team members yet</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="stg-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="stg-modal">
            <div className="stg-modal-head">
              <span>Add Team Member</span>
              <button type="button" onClick={()=>setShowModal(false)} className="stg-modal-close"><Xmark width={18} height={18}/></button>
            </div>
            <form onSubmit={handleAdd} className="stg-modal-body">
              <div className="stg-grid">
                <div className="stg-field">
                  <label>Full Name *</label>
                  <input required value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Ahmed Al Mansoori" />
                </div>
                <div className="stg-field">
                  <label>Username *</label>
                  <input required value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="ahmed.mansoori" />
                </div>
                <div className="stg-field">
                  <label>Email *</label>
                  <input required type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="ahmed@company.ae" />
                </div>
                <div className="stg-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+971 50 000 0000" />
                </div>
                <div className="stg-field">
                  <label>Password *</label>
                  <div className="stg-input-wrap" style={{position:'relative'}}>
                    <input required type={showPw?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 characters" style={{paddingRight:40}} />
                    <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:0}}>
                      {showPw ? <EyeClosed width={15} height={15}/> : <Eye width={15} height={15}/>}
                    </button>
                  </div>
                </div>
                <div className="stg-field">
                  <label>Role</label>
                  <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    {['admin','dispatcher','driver','client'].map(r=><option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
                  </select>
                </div>
              </div>
              <div className="stg-modal-footer">
                <button type="button" className="stg-btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="stg-btn-primary" disabled={saving}>
                  {saving ? <><span className="stg-spin"/>Creating…</> : 'Create User'}
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
   MAIN SETTINGS PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { id:'general',       label:'General',       icon: Building,      color:'#f97316' },
  { id:'delivery',      label:'Delivery',      icon: DeliveryTruck, color:'#3b82f6' },
  { id:'notifications', label:'Notifications', icon: Bell,          color:'#8b5cf6' },
  { id:'categories',    label:'Categories',    icon: Tag,           color:'#0d9488' },
  { id:'users',         label:'Users',         icon: User,          color:'#f43f5e' },
];

export default function Settings() {
  const [tab,     setTab]    = useState('general');
  const [data,    setData]   = useState({});
  const [loading, setLoading]= useState(true);
  const [saving,  setSaving] = useState(false);

  const { toasts, showToast } = useToast();

  // Adapter so older (type,msg) call-sites still work:
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
    const { settings = {}, name, logo_url, phone, email, address, city, country, currency, timezone } = data;
    const res = await api.put('/settings', {
      tenant: { name, logo_url, phone, email, address, city, country, currency, timezone },
      settings,
    });
    if (res.success) showToast('Settings saved successfully', 'success');
    else showToast(res.message || 'Failed to save settings', 'error');
    setSaving(false);
  };

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      <div className="stg-page-header">
        <div className="stg-page-header-left">
          <div className="stg-page-icon">
            <SettingsIcon width={22} height={22}/>
          </div>
          <div>
            <h2 className="stg-page-title">Settings</h2>
            <p className="stg-page-sub">Configure your delivery platform</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="stg-loader" style={{minHeight:300}}>Loading settings…</div>
      ) : (
        <div className="stg-layout">
          <nav className="stg-sidebar">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                className={'stg-nav-btn'+(tab===t.id?' active':'')}
                onClick={() => setTab(t.id)}
                style={tab===t.id?{'--acc':t.color}:undefined}
              >
                <div className="stg-nav-icon" style={tab===t.id?{background:t.color+'20',color:t.color}:undefined}>
                  <t.icon width={16} height={16}/>
                </div>
                <span>{t.label}</span>
                {tab===t.id && <NavArrowRight width={13} height={13} style={{marginLeft:'auto',color:t.color}}/>}
              </button>
            ))}
          </nav>

          <div className="stg-main">
            <div className="stg-tab-header" style={{'--acc': activeTab?.color}}>
              {activeTab && <activeTab.icon width={20} height={20}/>}
              <div>
                <div className="stg-tab-title">{activeTab?.label}</div>
                <div className="stg-tab-sub">
                  {tab==='general'       && 'Company info, branding and regional preferences'}
                  {tab==='delivery'      && 'Delivery defaults, COD rules and feature toggles'}
                  {tab==='notifications' && 'Email SMTP and SMS gateway configuration'}
                  {tab==='categories'    && 'Manage order categories and shipment types'}
                  {tab==='users'         && 'Manage team members and their roles'}
                </div>
              </div>
            </div>

            {tab==='general'       && <GeneralTab       data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='delivery'      && <DeliveryTab      data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='notifications' && <NotificationsTab data={data} setData={setData} onSave={handleSave} saving={saving}/>}
            {tab==='categories'    && <CategoriesTab    toast={toast}/>}
            {tab==='users'         && <UsersTab         toast={toast}/>}
          </div>
        </div>
      )}
    </div>
  );
}
