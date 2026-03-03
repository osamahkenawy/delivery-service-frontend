/* ══════════════════════════════════════════════════════════════
 * ClientCreateOrder.jsx — Order Creation Form (C.8)
 * Auto-fills sender from profile, saved addresses dropdown
 * ══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../App';
import { Plus, ArrowLeft, QrCode, MapPin } from 'iconoir-react';
import api from '../../lib/api';
import './ClientPages.css';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];

export default function ClientCreateOrder() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [useScan, setUseScan] = useState(false);
  const [scanToken, setScanToken] = useState('');

  const [form, setForm] = useState({
    sender_name: '', sender_phone: '', sender_address: '',
    recipient_name: '', recipient_phone: '', recipient_email: '',
    recipient_address: '', recipient_area: '', recipient_emirate: 'Dubai',
    order_type: 'standard', category: 'parcel',
    payment_method: 'cod', cod_amount: '', delivery_fee: '',
    weight_kg: '', description: '', special_instructions: '', notes: '',
    zone_id: '',
  });

  // Load profile & saved addresses
  useEffect(() => {
    (async () => {
      try {
        const [profileRes, addrRes] = await Promise.all([
          api.get('/client-portal/profile'),
          api.get('/client-portal/saved-addresses'),
        ]);
        if (profileRes.success && profileRes.data) {
          const p = profileRes.data;
          setForm(f => ({
            ...f,
            sender_name: p.full_name || p.company_name || '',
            sender_phone: p.phone || '',
            sender_address: p.address_line1 || '',
          }));
        }
        if (addrRes.success) setSavedAddresses(addrRes.data || []);
      } catch { /* */ }
    })();
  }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectSavedAddress = (addrId) => {
    const addr = savedAddresses.find(a => a.id === parseInt(addrId));
    if (addr) {
      setForm(f => ({
        ...f,
        sender_name: addr.contact_name || f.sender_name,
        sender_phone: addr.contact_phone || f.sender_phone,
        sender_address: addr.address_line1 || '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        ...form,
        cod_amount: parseFloat(form.cod_amount) || 0,
        delivery_fee: parseFloat(form.delivery_fee) || 0,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        zone_id: form.zone_id ? parseInt(form.zone_id) : null,
      };
      if (useScan && scanToken) body.pregenerated_token = scanToken;

      const res = await api.post('/client-portal/orders', body);
      if (res.success) {
        setSuccess(res.data);
      } else {
        setError(res.message || 'Failed to create order');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="cp-page">
        <div className="cp-success-page">
          <div className="cp-success-icon-lg">✅</div>
          <h2>Order Created Successfully!</h2>
          <p className="cp-detail-sub">Order Number: <strong>{success.order_number}</strong></p>
          <p className="cp-detail-sub">Tracking: <strong>{success.tracking_token}</strong></p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="cp-btn cp-btn-primary" onClick={() => navigate(`/merchant/orders/${success.id}`)}>View Order</button>
            <button className="cp-btn cp-btn-outline" onClick={() => { setSuccess(null); setForm(f => ({ ...f, recipient_name: '', recipient_phone: '', recipient_email: '', recipient_address: '', recipient_area: '', cod_amount: '', description: '', special_instructions: '', notes: '' })); }}>Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="cp-back-btn" onClick={() => navigate('/merchant/orders')}><ArrowLeft width={18} height={18} /></button>
          <h1 className="cp-page-title" style={{ margin: 0 }}>Create New Order</h1>
        </div>
      </div>

      {error && <div className="ca-alert ca-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form className="cp-create-form" onSubmit={handleSubmit}>
        {/* Barcode Scan Toggle */}
        <div className="cp-scan-toggle">
          <button type="button" className={`cp-toggle-btn ${!useScan ? 'active' : ''}`} onClick={() => setUseScan(false)}>
            <Plus width={16} height={16} /> New Barcode
          </button>
          <button type="button" className={`cp-toggle-btn ${useScan ? 'active' : ''}`} onClick={() => setUseScan(true)}>
            <QrCode width={16} height={16} /> Use Pre-printed Barcode
          </button>
        </div>

        {useScan && (
          <div className="cp-form-section">
            <label className="cp-form-label">Pre-printed Barcode Token</label>
            <input className="cp-form-input" value={scanToken} onChange={e => setScanToken(e.target.value.toUpperCase())} placeholder="Enter or scan barcode token e.g. A1B2C3D4E5F6" />
          </div>
        )}

        {/* Sender Section */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">
            <MapPin width={18} height={18} /> Pickup (Sender)
          </h3>
          {savedAddresses.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <select className="cp-form-input" onChange={e => selectSavedAddress(e.target.value)} defaultValue="">
                <option value="">-- Select saved address --</option>
                {savedAddresses.map(a => (
                  <option key={a.id} value={a.id}>{a.label} — {a.address_line1}</option>
                ))}
              </select>
            </div>
          )}
          <div className="cp-form-grid-3">
            <div>
              <label className="cp-form-label">Sender Name</label>
              <input className="cp-form-input" value={form.sender_name} onChange={e => update('sender_name', e.target.value)} />
            </div>
            <div>
              <label className="cp-form-label">Phone</label>
              <input className="cp-form-input" value={form.sender_phone} onChange={e => update('sender_phone', e.target.value)} />
            </div>
            <div>
              <label className="cp-form-label">Address</label>
              <input className="cp-form-input" value={form.sender_address} onChange={e => update('sender_address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Recipient Section */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">📍 Delivery (Recipient)</h3>
          <div className="cp-form-grid-2">
            <div>
              <label className="cp-form-label">Recipient Name *</label>
              <input className="cp-form-input" value={form.recipient_name} onChange={e => update('recipient_name', e.target.value)} required />
            </div>
            <div>
              <label className="cp-form-label">Phone *</label>
              <input className="cp-form-input" value={form.recipient_phone} onChange={e => update('recipient_phone', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="cp-form-label">Address *</label>
            <input className="cp-form-input" value={form.recipient_address} onChange={e => update('recipient_address', e.target.value)} required />
          </div>
          <div className="cp-form-grid-3">
            <div>
              <label className="cp-form-label">Area</label>
              <input className="cp-form-input" value={form.recipient_area} onChange={e => update('recipient_area', e.target.value)} />
            </div>
            <div>
              <label className="cp-form-label">Emirate</label>
              <select className="cp-form-input" value={form.recipient_emirate} onChange={e => update('recipient_emirate', e.target.value)}>
                {EMIRATES.map(em => <option key={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <label className="cp-form-label">Email</label>
              <input className="cp-form-input" type="email" value={form.recipient_email} onChange={e => update('recipient_email', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Shipment Details */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">📦 Shipment Details</h3>
          <div className="cp-form-grid-3">
            <div>
              <label className="cp-form-label">Order Type</label>
              <select className="cp-form-input" value={form.order_type} onChange={e => update('order_type', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="express">Express</option>
                <option value="same_day">Same Day</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div>
              <label className="cp-form-label">Category</label>
              <select className="cp-form-input" value={form.category} onChange={e => update('category', e.target.value)}>
                {['parcel', 'document', 'food', 'grocery', 'medicine', 'electronics', 'fragile', 'other'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="cp-form-label">Weight (kg)</label>
              <input className="cp-form-input" type="number" step="0.1" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="cp-form-label">Description</label>
            <input className="cp-form-input" value={form.description} onChange={e => update('description', e.target.value)} placeholder="What's in the package?" />
          </div>
          <div>
            <label className="cp-form-label">Special Instructions</label>
            <textarea className="cp-form-input cp-textarea" value={form.special_instructions} onChange={e => update('special_instructions', e.target.value)} placeholder="Delivery instructions, fragile notes..." />
          </div>
        </div>

        {/* Payment */}
        <div className="cp-form-section">
          <h3 className="cp-form-section-title">💳 Payment</h3>
          <div className="cp-form-grid-3">
            <div>
              <label className="cp-form-label">Payment Method</label>
              <select className="cp-form-input" value={form.payment_method} onChange={e => update('payment_method', e.target.value)}>
                <option value="cod">Cash on Delivery</option>
                <option value="prepaid">Prepaid</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            {form.payment_method === 'cod' && (
              <div>
                <label className="cp-form-label">COD Amount (AED)</label>
                <input className="cp-form-input" type="number" step="0.01" value={form.cod_amount} onChange={e => update('cod_amount', e.target.value)} />
              </div>
            )}
            <div>
              <label className="cp-form-label">Delivery Fee (AED)</label>
              <input className="cp-form-input" type="number" step="0.01" value={form.delivery_fee} onChange={e => update('delivery_fee', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="cp-form-actions">
          <button type="button" className="cp-btn cp-btn-outline" onClick={() => navigate('/merchant/orders')}>Cancel</button>
          <button type="submit" className="cp-btn cp-btn-primary" disabled={loading}>
            {loading ? <span className="cp-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><Plus width={16} height={16} /> Create Order</>}
          </button>
        </div>
      </form>
    </div>
  );
}
