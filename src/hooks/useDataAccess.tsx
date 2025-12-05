import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that provides the correct owner_id for data access
 * - For owners: returns their own id
 * - For assistants: returns their linked owner_id
 * This ensures assistants access their owner's data, not their own
 */
export const useDataAccess = () => {
  const { user, userProfile } = useAuth();
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
  const [ownerBusinessName, setOwnerBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssistant, setIsAssistant] = useState(false);

  useEffect(() => {
    const fetchDataOwnerId = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      }

      // Owners and super_admins access their own data
      if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
        setDataOwnerId(user.id);
        setOwnerBusinessName(userProfile.business_name || null);
        setIsAssistant(false);
        setLoading(false);
        return;
      }

      // Assistants need to fetch their owner_id from assistant_permissions
      if (userProfile.role === 'assistant') {
        setIsAssistant(true);
        try {
          const { data, error } = await supabase
            .from('assistant_permissions')
            .select('owner_id')
            .eq('assistant_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching assistant owner:', error);
            // Fallback to user's own ID (won't see any data but won't crash)
            setDataOwnerId(user.id);
          } else if (data?.owner_id) {
            setDataOwnerId(data.owner_id);
            
            // Fetch owner's business name
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('business_name')
              .eq('id', data.owner_id)
              .single();
            
            setOwnerBusinessName(ownerProfile?.business_name || null);
          } else {
            setDataOwnerId(user.id);
          }
        } catch (error) {
          console.error('Error in assistant data access:', error);
          setDataOwnerId(user.id);
        }
      } else {
        // Unknown role, use own id
        setDataOwnerId(user.id);
      }

      setLoading(false);
    };

    fetchDataOwnerId();
  }, [user, userProfile]);

  return { 
    dataOwnerId, 
    ownerBusinessName,
    loading, 
    isAssistant,
    isReady: !loading && !!dataOwnerId 
  };
};
