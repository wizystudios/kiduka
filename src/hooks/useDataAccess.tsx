import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that provides the correct owner_id for data access
 * - For owners: returns their own id
 * - For assistants: returns their linked owner_id from assistant_permissions
 * This ensures assistants access their owner's data, not their own
 */
export const useDataAccess = () => {
  const { user, userProfile } = useAuth();
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const [ownerBusinessName, setOwnerBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssistant, setIsAssistant] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [branchRole, setBranchRole] = useState<string | null>(null);
  const [branchFeatures, setBranchFeatures] = useState<Record<string, boolean> | null>(null);

  const [branchLoading, setBranchLoading] = useState(true);
  // Do not render/query operational data until the current user's scope resolves.
  useEffect(() => {
    let current = true;
    setBranchId(null); setBranchName(null); setBranchRole(null); setBranchFeatures(null);
    setBranchLoading(true);
    if (!user || !userProfile) { setBranchLoading(false); return; }
    if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
      setBranchLoading(false); return;
    }
    (async () => {
      const { data, error } = await supabase.from('branch_staff')
        .select('branch_id, role, business_branches(branch_name, features, is_active)')
        .eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (!current) return;
      if (error) { console.error('Branch scope lookup failed', error); return; }
      setBranchId((data as any)?.branch_id ?? null);
      setBranchName((data as any)?.business_branches?.branch_name ?? null);
      setBranchRole((data as any)?.role ?? null);
      setBranchFeatures((data as any)?.business_branches?.features ?? null);
      setBranchLoading(false);
    })();
    return () => { current = false; };
  }, [user?.id, userProfile?.role]);

  useEffect(() => {
    let current = true;
    setLoading(true); setDataOwnerId(null); setOwnerBusinessName(null);
    setIsAssistant(userProfile?.role === 'assistant');
    if (!user || !userProfile) { setLoading(false); return; }
    if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
      setDataOwnerId(user.id); setOwnerBusinessName(userProfile.business_name || null); setLoading(false); return;
    }
    (async () => {
      const { data, error } = await supabase.from('assistant_permissions').select('owner_id').eq('assistant_id', user.id).eq('is_active', true).maybeSingle();
      if (!current) return;
      if (error || !data?.owner_id) { setLoading(false); return; }
      const { data: owner } = await supabase.from('profiles').select('business_name').eq('id', data.owner_id).maybeSingle();
      if (!current) return;
      setDataOwnerId(data.owner_id); setOwnerBusinessName(owner?.business_name || null); setLoading(false);
    })();
    return () => { current = false; };
  }, [user?.id, userProfile?.role, userProfile?.business_name]);

  return { 
    dataOwnerId, 
    ownerBusinessName: branchName ? `${ownerBusinessName || ''} · Tawi: ${branchName}` : ownerBusinessName,
    branchId,
    branchName,
    branchRole,
    branchFeatures,
    isBranchStaff: !!branchId,
    loading: loading || branchLoading, 
    isAssistant,
    isReady: !loading && !branchLoading && !!dataOwnerId
  };
};
