/**
 * UpgradeModal.jsx — Module D.6 — In-app plan upgrade flow
 * Shows plan comparison when user hits a limit or clicks "Upgrade"
 */
import usePlanUsage from '../../hooks/usePlanUsage';
import './PlanBadge.css';

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    price: '750',
    currency: 'AED',
    period: '/month',
    limits: { drivers: 10, users: 5, orders: '1,000/mo' },
    features: [
      'Dedicated Company Portal',
      'Basic Dashboard',
      'General Reporting',
      'Barcode / QR Management',
      'Basic Map Integration',
      'Standard Support',
    ],
  },
  {
    slug: 'professional',
    name: 'Pro',
    price: '1,350',
    currency: 'AED',
    period: '/month',
    recommended: true,
    limits: { drivers: 50, users: 15, orders: '5,000/mo' },
    features: [
      'Everything in Starter',
      'Advanced Reporting & Analytics',
      'Route Optimization',
      'Custom SMS Sender',
      'Branded Tracking Page',
      'API Access & Webhooks',
      'Priority Support',
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: '2,500',
    currency: 'AED',
    period: '/month',
    limits: { drivers: 'Unlimited', users: 'Unlimited', orders: 'Unlimited' },
    features: [
      'Everything in Pro',
      'Mobile App for Drivers',
      'Live Tracking',
      'Full Branding Customization',
      'API Integration',
      'Dedicated Account Manager',
      'SLA Priority Support',
    ],
  },
];

export default function UpgradeModal({ onClose, triggerReason = null }) {
  const { plan: currentPlan, planName, usage } = usePlanUsage();

  return (
    <div className="upgrade-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upgrade-modal" style={{ position: 'relative' }}>
        <button className="upgrade-close" onClick={onClose}>&times;</button>

        <div className="upgrade-modal-header">
          <h2>{triggerReason ? 'Upgrade Required' : 'Choose Your Plan'}</h2>
          <p>
            {triggerReason
              ? `You've reached the limit on your ${planName} plan. Upgrade to unlock more.`
              : `You're currently on the ${planName} plan. Compare options below.`}
          </p>
          {triggerReason && (
            <p style={{ color: '#dc2626', fontWeight: 600, marginTop: 8, fontSize: 13 }}>
              {triggerReason}
            </p>
          )}
        </div>

        <div className="upgrade-plans-grid">
          {PLANS.map((p) => {
            const isCurrent = p.slug === currentPlan;
            const isRecommended = p.recommended && !isCurrent;

            return (
              <div
                key={p.slug}
                className={`upgrade-plan-card ${isCurrent ? 'current' : ''} ${isRecommended ? 'recommended' : ''}`}
              >
                {isCurrent && <div className="upgrade-plan-current-tag">Current Plan</div>}
                <div className="upgrade-plan-name">{p.name}</div>
                <div className="upgrade-plan-price">
                  {p.currency} {p.price} <span>{p.period}</span>
                </div>

                <div className="upgrade-plan-limits">
                  <div><strong>{p.limits.drivers}</strong> Drivers</div>
                  <div><strong>{p.limits.users}</strong> Users</div>
                  <div><strong>{p.limits.orders}</strong> Orders</div>
                </div>

                <div className="upgrade-plan-features">
                  {p.features.map((f, i) => (
                    <div key={i}>{f}</div>
                  ))}
                </div>

                {isCurrent ? (
                  <button className="upgrade-plan-btn current-btn" disabled>
                    Current Plan
                  </button>
                ) : (
                  <a
                    href={`https://trasealla.com/pricing?plan=${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`upgrade-plan-btn ${isRecommended ? 'primary' : 'secondary'}`}
                    style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
                  >
                    {isRecommended ? 'Upgrade Now' : 'Select Plan'}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="upgrade-modal-footer">
          Need a custom plan? <a href="mailto:sales@trasealla.com">Contact our sales team</a>
        </div>
      </div>
    </div>
  );
}
