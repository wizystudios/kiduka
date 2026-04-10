import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, FileText, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

export const TopAlertBar = () => {
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { unreadCount } = useRealTimeNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  if (!user || !userProfile) return null;
  if (userProfile.role === 'super_admin') return null;

  const alerts: { key: string; icon: React.ReactNode; text: string; action: () => void; variant: 'warning' | 'danger' | 'info' }[] = [];

  // 1. Subscription ending in 3 days or less
  if (subscription && subscription.is_active && subscription.days_remaining <= 3 && subscription.days_remaining > 0) {
    alerts.push({
      key: 'sub_ending',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: `Usajili unakwisha siku ${subscription.days_remaining}`,
      action: () => navigate('/subscription'),
      variant: 'warning',
    });
  }

  // 2. Subscription expired
  if (subscription && !subscription.is_active && subscription.requires_payment) {
    alerts.push({
      key: 'sub_expired',
      icon: <AlertTriangle className="h-3 w-3" />,
      text: 'Usajili haujakamilika',
      action: () => navigate('/subscription'),
      variant: 'danger',
    });
  }

  // 3. Location not set
  if (!userProfile.location_set) {
    alerts.push({
      key: 'location',
      icon: <MapPin className="h-3 w-3" />,
      text: 'Chagua eneo lako kwenye mipangilio',
      action: () => navigate('/settings'),
      variant: 'info',
    });
  }

  const visibleAlerts = alerts.filter(a => !dismissed[a.key]);

  if (visibleAlerts.length === 0) return null;

  const variantStyles = {
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    info: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <div className="flex flex-col gap-0.5">
      {visibleAlerts.map((alert) => (
        <button
          key={alert.key}
          onClick={alert.action}
          className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-md border transition-all hover:scale-[1.01] active:scale-[0.99] ${variantStyles[alert.variant]}`}
        >
          {alert.icon}
          <span className="truncate">{alert.text}</span>
          <X
            className="h-3 w-3 ml-auto flex-shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(prev => ({ ...prev, [alert.key]: true }));
            }}
          />
        </button>
      ))}
    </div>
  );
};
