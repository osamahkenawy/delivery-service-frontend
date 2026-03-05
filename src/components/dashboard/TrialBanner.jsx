/**
 * TrialBanner.jsx — Module D.5 — Top banner for trial expiry warning
 * Shows when trial is expiring soon or has expired (grace period)
 */
import { useState } from 'react';
import usePlanUsage from '../../hooks/usePlanUsage';
import UpgradeModal from './UpgradeModal';
import './PlanBadge.css';

export default function TrialBanner() {
  const { isTrial, trialDaysRemaining, trialExpired, isTrialExpiring, planName } = usePlanUsage();
  const [dismissed, setDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Only show for trial users with expiry info
  if (!isTrial || trialDaysRemaining === null || dismissed) return null;
  // Don't show if more than 7 days remaining
  if (trialDaysRemaining > 7 && !trialExpired) return null;

  const isExpired = trialExpired || trialDaysRemaining <= 0;

  return (
    <>
      <div className={`trial-banner ${isExpired ? 'expired' : ''}`}>
        <span className="trial-banner-text">
          {isExpired
            ? `⚠️ Your trial has expired. Subscribe to a plan to continue using the platform.`
            : `⏰ Your trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}. Subscribe now to avoid interruption.`
          }
        </span>
        <button className="trial-banner-btn" onClick={() => setShowUpgrade(true)}>
          {isExpired ? 'Subscribe Now' : 'View Plans'}
        </button>
        {!isExpired && (
          <button className="trial-banner-close" onClick={() => setDismissed(true)} title="Dismiss">
            &times;
          </button>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          triggerReason={isExpired ? 'Your trial period has ended.' : null}
        />
      )}
    </>
  );
}
