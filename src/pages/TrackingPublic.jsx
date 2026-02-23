import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const STATUS_STEPS = ['pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered'];

const STATUS_LABELS = {
  pending:    'Order Placed',
  confirmed:  'Confirmed',
  assigned:   'Driver Assigned',
  picked_up:  'Picked Up',
  in_transit: 'On The Way',
  delivered:  'Delivered',
  failed:     'Failed',
  returned:   'Returned',
  cancelled:  'Cancelled',
};

export default function TrackingPublic() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    if (!token) { setError('Invalid tracking link'); setLoading(false); return; }
    fetch(`${apiBase}/tracking/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setOrder(data.data);
        else setError(data.message || 'Order not found');
      })
      .catch(() => setError('Unable to load tracking info'))
      .finally(() => setLoading(false));
  }, [token]);

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isFinal = order && ['delivered', 'failed', 'returned', 'cancelled'].includes(order.status);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#f97316', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>🚚</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>Trasealla</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Delivery Tracking</div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
            <div style={{ color: '#64748b', fontSize: 18 }}>Loading tracking info...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <div style={{ color: '#dc2626', fontSize: 18, fontWeight: 600 }}>{error}</div>
            <div style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Please check your tracking link or contact support</div>
          </div>
        )}

        {order && (
          <>
            {/* Status Badge */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {order.status === 'delivered' ? '✅' : order.status === 'cancelled' ? '❌' : order.status === 'in_transit' ? '🚗' : '📦'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{STATUS_LABELS[order.status] || order.status}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>Order #{order.id}</div>
            </div>

            {/* Progress Steps */}
            {!isFinal && currentStep >= 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  {/* Progress line */}
                  <div style={{ position: 'absolute', top: 16, left: '10%', right: '10%', height: 2, background: '#e2e8f0' }} />
                  <div style={{ position: 'absolute', top: 16, left: '10%', height: 2, background: '#f97316', width: `${(currentStep / (STATUS_STEPS.length - 1)) * 80}%`, transition: 'width 0.5s' }} />
                  {/* Steps */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const done = idx <= currentStep;
                      return (
                        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? '#f97316' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: done ? '#fff' : '#94a3b8', transition: 'all 0.3s', border: idx === currentStep ? '3px solid #ea580c' : 'none', zIndex: 1, position: 'relative' }}>
                            {done ? (idx === currentStep ? '•' : '✓') : idx + 1}
                          </div>
                          <div style={{ fontSize: 10, textAlign: 'center', color: done ? '#f97316' : '#94a3b8', fontWeight: done ? 600 : 400, maxWidth: 60 }}>
                            {STATUS_LABELS[step]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Order Details */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>📦 Order Details</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: 'Recipient', value: order.recipient_name },
                  { label: 'Phone', value: order.recipient_phone },
                  { label: 'Address', value: order.recipient_address },
                  { label: 'Emirate', value: order.recipient_emirate },
                  { label: 'Order Type', value: order.order_type },
                  { label: 'Payment', value: order.payment_method },
                  order.cod_amount > 0 ? { label: 'COD Amount', value: `AED ${order.cod_amount}` } : null,
                ].filter(Boolean).map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ fontSize: 14, color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Info */}
            {order.driver_name && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700, color: '#c2410c' }}>🚚 Your Driver</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700 }}>
                    {order.driver_name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{order.driver_name}</div>
                    {order.driver_phone && <div style={{ color: '#64748b', fontSize: 14 }}>{order.driver_phone}</div>}
                    {order.vehicle_type && <div style={{ color: '#f97316', fontSize: 13, marginTop: 2, fontWeight: 600 }}>{order.vehicle_type} · {order.vehicle_plate}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Status History */}
            {order.status_logs?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>🕐 Status History</h3>
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: '#f1f5f9' }} />
                  {order.status_logs.map((log, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: 16 }}>
                      <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: idx === 0 ? '#f97316' : '#cbd5e1' }} />
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{STATUS_LABELS[log.status] || log.status}</div>
                      {log.notes && <div style={{ fontSize: 13, color: '#64748b' }}>{log.notes}</div>}
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 13 }}>
        Powered by Trasealla Delivery Platform
      </div>
    </div>
  );
}
