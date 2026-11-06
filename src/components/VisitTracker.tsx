import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Records anonymous page visits (no personal data) for the admin Wageni panel.
const sid = () => {
  let s = sessionStorage.getItem('kd_visit_sid');
  if (!s) { s = crypto.randomUUID().replace(/-/g, ''); sessionStorage.setItem('kd_visit_sid', s); }
  return s;
};

export const VisitTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (location.hostname === 'localhost') return;
    try {
      const q = new URLSearchParams(location.search);
      const ref = document.referrer ? new URL(document.referrer).hostname : null;
      const path = pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').slice(0, 200);
      void supabase.from('site_visits' as any).insert({
        session_id: sid(), path,
        referrer_host: ref && ref !== location.hostname ? ref.slice(0, 120) : null,
        utm_source: q.get('utm_source')?.slice(0, 80) || null,
        utm_medium: q.get('utm_medium')?.slice(0, 80) || null,
        utm_campaign: q.get('utm_campaign')?.slice(0, 120) || null,
        device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      } as any);
    } catch { /* ignore */ }
  }, [pathname]);
  return null;
};
