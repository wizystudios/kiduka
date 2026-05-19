import { createContext, useContext, useEffect, useState, ReactNode, FC, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type BusinessRole =
  | 'owner'
  | 'co_owner'
  | 'branch_manager'
  | 'cashier'
  | 'salesperson'
  | 'inventory_officer'
  | 'accountant'
  | 'assistant';

export interface BusinessMembership {
  business_id: string;
  business_name: string;
  role: BusinessRole;
  branch_id: string | null;
  is_active: boolean;
}

interface BusinessContextValue {
  businesses: BusinessMembership[];
  currentBusinessId: string | null;
  currentRole: BusinessRole | null;
  setCurrentBusinessId: (id: string) => void;
  loading: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<BusinessContextValue | undefined>(undefined);

const STORAGE_KEY = 'kiduka.currentBusinessId';

export const BusinessProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessMembership[]>([]);
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setCurrentBusinessIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('business_members')
      .select('business_id, role, branch_id, is_active, businesses!inner(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('useBusinessContext load error', error);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    const mapped: BusinessMembership[] = (data || []).map((row: any) => ({
      business_id: row.business_id,
      business_name: row.businesses?.name || 'Biashara',
      role: row.role,
      branch_id: row.branch_id,
      is_active: row.is_active,
    }));

    // Sort: owner first, then co_owner, etc.
    const order: Record<BusinessRole, number> = {
      owner: 1, co_owner: 2, branch_manager: 3, accountant: 4,
      inventory_officer: 5, cashier: 6, salesperson: 7, assistant: 8,
    };
    mapped.sort((a, b) => (order[a.role] || 99) - (order[b.role] || 99));

    setBusinesses(mapped);

    // Pick current: localStorage if still valid, else first
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && mapped.some(m => m.business_id === stored) ? stored : (mapped[0]?.business_id ?? null);
    setCurrentBusinessIdState(valid);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setCurrentBusinessId = useCallback((id: string) => {
    setCurrentBusinessIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const currentRole = businesses.find(b => b.business_id === currentBusinessId)?.role ?? null;

  return (
    <Ctx.Provider value={{
      businesses,
      currentBusinessId,
      currentRole,
      setCurrentBusinessId,
      loading,
      isReady: !loading && !!currentBusinessId,
      refresh: load,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useBusinessContext = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBusinessContext must be used inside BusinessProvider');
  return v;
};
