import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BusinessContract {
  id: string;
  owner_id: string;
  status: 'pending' | 'signed' | 'expired' | 'revoked';
  contract_version: string;
  admin_notes?: string | null;
  full_legal_name: string | null;
  signature_data: string | null;
  agreed_terms: boolean;
  signed_at: string | null;
  expires_at: string | null;
  required_by: string | null;
  review_later_until: string | null;
}

interface BusinessCompliance {
  id: string;
  owner_id: string;
  tin_number: string | null;
  nida_number: string | null;
  business_license: string | null;
  required_after: string;
  block_mode: 'none' | 'temporary' | 'permanent';
  block_until: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface AdminBusinessSession {
  id: string;
  owner_id: string;
  admin_id: string;
  active: boolean;
  reason?: string | null;
  consent_status?: string;
  started_at: string;
  ended_at: string | null;
}

const isFuture = (value?: string | null) => (value ? new Date(value).getTime() > Date.now() : false);

export const useBusinessGovernance = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<BusinessContract | null>(null);
  const [compliance, setCompliance] = useState<BusinessCompliance | null>(null);
  const [activeAdminSession, setActiveAdminSession] = useState<AdminBusinessSession | null>(null);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isOwner = userProfile?.role === 'owner';
  const isAssistant = userProfile?.role === 'assistant';

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Assistants and super_admins don't need contract/compliance checks
    if (isAssistant || isSuperAdmin) {
      // Only check admin sessions for owners
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [contractRes, complianceRes, adminSessionRes] = await Promise.all([
        supabase.from('business_contracts' as any).select('*').eq('owner_id', user.id).maybeSingle(),
        supabase.from('business_compliance' as any).select('*').eq('owner_id', user.id).maybeSingle(),
        supabase
          .from('admin_business_sessions' as any)
          .select('*')
          .eq('owner_id', user.id)
          .eq('active', true)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!contractRes.error) setContract(contractRes.data as unknown as BusinessContract | null);
      if (!complianceRes.error) setCompliance(complianceRes.data as unknown as BusinessCompliance | null);
      if (!adminSessionRes.error) setActiveAdminSession((adminSessionRes.data as unknown as AdminBusinessSession | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAssistant, isSuperAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveContract = useCallback(
    async ({
      fullLegalName,
      signatureData,
      agree,
      reviewLater,
    }: {
      fullLegalName?: string;
      signatureData?: string;
      agree: boolean;
      reviewLater?: boolean;
    }) => {
      if (!user?.id) return { success: false };

      const payload: Record<string, any> = {
        owner_id: user.id,
        full_legal_name: fullLegalName ?? contract?.full_legal_name ?? null,
      };

      if (reviewLater) {
        payload.review_later_until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (agree && signatureData) {
        payload.signature_data = signatureData;
        payload.agreed_terms = true;
        payload.status = 'signed';
        payload.signed_at = new Date().toISOString();
        payload.expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        payload.review_later_until = null;
      }

      const { error } = await supabase.from('business_contracts' as any).upsert(payload, { onConflict: 'owner_id' });
      if (error) return { success: false, error };

      await refresh();
      return { success: true };
    },
    [user?.id, contract?.full_legal_name, refresh],
  );

  const saveCompliance = useCallback(
    async (values: { tin_number?: string; nida_number?: string; business_license?: string }) => {
      if (!user?.id) return { success: false };

      const nextTin = values.tin_number ?? compliance?.tin_number ?? null;
      const nextNida = values.nida_number ?? compliance?.nida_number ?? null;
      const nextLicense = values.business_license ?? compliance?.business_license ?? null;
      const done = !!nextTin && !!nextNida && !!nextLicense;

      const { error } = await supabase.from('business_compliance' as any).upsert(
        {
          owner_id: user.id,
          tin_number: nextTin,
          nida_number: nextNida,
          business_license: nextLicense,
          completed_at: done ? new Date().toISOString() : null,
        },
        { onConflict: 'owner_id' },
      );

      if (error) return { success: false, error };
      await refresh();
      return { success: true };
    },
    [user?.id, compliance?.tin_number, compliance?.nida_number, compliance?.business_license, refresh],
  );

  const status = useMemo(() => {
    // Assistants and super_admins never have compliance/contract requirements
    if (isAssistant || isSuperAdmin) {
      return {
        contractSigned: true,
        contractOverdue: false,
        canReviewLater: false,
        complianceMissing: false,
        complianceOverdue: false,
        complianceBlocked: false,
        missingComplianceFields: { tin: false, nida: false, license: false },
      };
    }

    const missingComplianceFields = {
      tin: !compliance?.tin_number,
      nida: !compliance?.nida_number,
      license: !compliance?.business_license,
    };

    const complianceMissing = Object.values(missingComplianceFields).some(Boolean);
    const complianceOverdue = complianceMissing && !!compliance?.required_after && new Date(compliance.required_after).getTime() < Date.now();
    const complianceBlocked =
      compliance?.block_mode === 'permanent' ||
      (compliance?.block_mode === 'temporary' && isFuture(compliance.block_until));

    const contractSigned = contract?.status === 'signed' && !!contract?.agreed_terms;
    const contractOverdue = !contractSigned && !!contract?.required_by && new Date(contract.required_by).getTime() < Date.now();
    const canReviewLater = !contractSigned && isFuture(contract?.review_later_until);

    return {
      contractSigned,
      contractOverdue,
      canReviewLater,
      complianceMissing,
      complianceOverdue,
      complianceBlocked,
      missingComplianceFields,
    };
  }, [contract, compliance, isAssistant, isSuperAdmin]);

  const enterBusinessAsAdmin = useCallback(
    async (ownerId: string, reason?: string) => {
      if (!user?.id || !isSuperAdmin) return { success: false };
      const { data, error } = await supabase
        .from('admin_business_sessions' as any)
        .insert({ owner_id: ownerId, admin_id: user.id, active: true, consent_status: 'pending', reason: reason || 'Msaada wa kiufundi' })
        .select('*')
        .single();

      if (error) return { success: false, error };
      return { success: true, session: data as unknown as AdminBusinessSession };
    },
    [user?.id, isSuperAdmin],
  );

  return {
    loading,
    contract,
    compliance,
    activeAdminSession,
    status,
    refresh,
    saveContract,
    saveCompliance,
    enterBusinessAsAdmin,
    isSuperAdmin,
  };
};