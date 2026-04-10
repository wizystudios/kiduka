import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin } from 'lucide-react';

export const TopAlertBar = () => {
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  if (!user || !userProfile) return null;
  if (userProfile.role === 'super_admin') return null;

  const alerts: { key: string; icon: React.ReactNode; text: string; action: () => void }[] = [];

  // Subscription ending in 3 days or less
  if (subscription && subscription.is_active && subscription.days_remaining <= 3 && subscription.days_remaining > 0) {
    alerts.push({
      key: 'sub_ending',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: `Usajili unakwisha siku ${subscription.days_remaining}`,
      action: () => navigate('/subscription'),
    });
  }

  // Subscription expired
  if (subscription && !subscription.is_active && subscription.requires_payment) {
    alerts.push({
      key: 'sub_expired',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: 'Kamilisha usajili',
      action: () => navigate('/subscription'),
    });
  }

  // Location not set
  if (!userProfile.location_set) {
    alerts.push({
      key: 'location',
      icon: <MapPin className="h-3 w-3" />,
      text: 'Weka eneo lako',
      action: () => navigate('/settings'),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
      {alerts.map((alert) => (
        <button
          key={alert.key}
          onClick={alert.action}
          className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-full bg-destructive/15 text-destructive border border-destructive/30 whitespace-nowrap flex-shrink-0 hover:bg-destructive/25 transition-colors"
        >
          {alert.icon}
          <span>{alert.text}</span>
        </button>
      ))}
    </div>
  );
};
