import { ReactNode } from 'react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  // Temporarily allow all access - subscription system coming soon
  return <>{children}</>;
};