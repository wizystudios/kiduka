import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useBusinessGovernance } from '@/hooks/useBusinessGovernance';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, ShieldAlert } from 'lucide-react';

export const TopAlertBar = () => {
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { status } = useBusinessGovernance();
  const navigate = useNavigate();

  if (!user || !userProfile) return null;
  if (userProfile.role === 'super_admin') return null;

  const alerts: { key: string; icon: React.ReactNode; text: string; action: () => void }[] = [];

  // Registration / compliance missing
  if (userProfile.role === 'owner' && (status.complianceMissing || !status.contractSigned)) {
    alerts.push({
      key: 'registration',
      icon: <ShieldAlert className="h-3 w-3" />,
      text: 'Kamilisha usajili',
      action: () => navigate('/settings?tab=registration'),
    });
  }

  // Subscription ending in 3 days or less
  if (subscription && subscription.is_active && subscription.days_remaining <= 3 && subscription.days_remaining > 0) {
    alerts.push({
      key: 'sub_ending',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: `Usajili siku ${subscription.days_remaining}`,
      action: () => navigate('/subscription'),
    });
  }

  // Subscription expired
  if (subscription && !subscription.is_active && subscription.requires_payment) {
    alerts.push({
      key: 'sub_expired',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: 'Lipia usajili',
      action: () => navigate('/subscription'),
    });
  }

  // Location not set
  if (!userProfile.location_set) {
    alerts.push({
      key: 'location',
      icon: <MapPin className="h-3 w-3" />,
      text: 'Weka eneo lako',
      action: () => navigate('/settings?tab=profile&focus=location'),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
      {alerts.map((alert) => (
        <button
          key={alert.key}
          onClick={alert.action}
          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-full bg-destructive text-destructive-foreground whitespace-nowrap flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          {alert.icon}
          <span>{alert.text}</span>
        </button>
      ))}
    </div>
  );
};
