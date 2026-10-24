import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ALL_PERMISSION_KEYS, mergePermissionRow } from '@/lib/permissionCatalog';

/** Fail-closed map of every catalog permission key. */
export type AssistantPermissions = Record<string, boolean>;

export const usePermissions = () => {
  const { user, userProfile } = useAuth();
  const [permissions, setPermissions] = useState<AssistantPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setPermissions(null); setOwnerId(null); setLoading(true);
    const run = async () => {
      if (!user || !userProfile) { setLoading(false); return; }
      if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
        setPermissions(Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, true])));
        setOwnerId(user.id);
        setLoading(false);
        return;
      }
      if (userProfile.role === 'assistant') {
        const { data, error } = await supabase.from('assistant_permissions').select('*')
          .eq('assistant_id', user.id).eq('is_active', true).maybeSingle();
        if (!current) return;
        if (error) console.error('Error fetching permissions:', error);
        setPermissions(mergePermissionRow(data as Record<string, unknown> | null));
        if (data) setOwnerId(data.owner_id);
      } else {
        setPermissions(mergePermissionRow(null));
      }
      if (current) setLoading(false);
    };
    run();
    const channel = user ? supabase.channel(`permissions:${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'assistant_permissions', filter: `assistant_id=eq.${user.id}` }, () => { setPermissions(null); setLoading(true); run(); }).subscribe() : null;
    return () => { current = false; if (channel) supabase.removeChannel(channel); };
  }, [user, userProfile]);

  const getEffectiveOwnerId = () =>
    userProfile?.role === 'owner' || userProfile?.role === 'super_admin' ? user?.id : ownerId;

  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'super_admin';
  const can = useCallback((key: string) => isOwner || permissions?.[key] === true, [isOwner, permissions]);

  return { permissions, loading, ownerId, getEffectiveOwnerId, can };
};
