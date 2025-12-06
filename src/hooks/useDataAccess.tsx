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

  useEffect(() => {
    const fetchDataOwnerId = async () => {
      if (!user || !userProfile) {
        console.log('useDataAccess: No user or profile yet');
        setLoading(false);
        return;
      }

      console.log('useDataAccess: User role is', userProfile.role);

      // Owners and super_admins access their own data
      if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
        console.log('useDataAccess: Owner/super_admin - using own ID:', user.id);
        setDataOwnerId(user.id);
        setOwnerBusinessName(userProfile.business_name || null);
        setIsAssistant(false);
        setLoading(false);
        return;
      }

      // Assistants need to fetch their owner_id from assistant_permissions
      if (userProfile.role === 'assistant') {
        console.log('useDataAccess: Assistant - fetching owner_id from permissions...');
        setIsAssistant(true);
        
        try {
          const { data, error } = await supabase
            .from('assistant_permissions')
            .select('owner_id')
            .eq('assistant_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching assistant owner:', error);
            // Fallback: check user metadata for owner_id
            const metadataOwnerId = user.user_metadata?.owner_id;
            if (metadataOwnerId) {
              console.log('useDataAccess: Using owner_id from metadata:', metadataOwnerId);
              setDataOwnerId(metadataOwnerId);
              
              // Try to fetch owner's business name
              const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('business_name')
                .eq('id', metadataOwnerId)
                .maybeSingle();
              
              setOwnerBusinessName(ownerProfile?.business_name || null);
            } else {
              console.error('No owner_id found for assistant');
              setDataOwnerId(null);
            }
          } else if (data?.owner_id) {
            console.log('useDataAccess: Found owner_id in permissions:', data.owner_id);
            setDataOwnerId(data.owner_id);
            
            // Fetch owner's business name
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('business_name')
              .eq('id', data.owner_id)
              .maybeSingle();
            
            setOwnerBusinessName(ownerProfile?.business_name || null);
          } else {
            console.log('useDataAccess: No permissions record found for assistant');
            // Fallback to metadata
            const metadataOwnerId = user.user_metadata?.owner_id;
            if (metadataOwnerId) {
              console.log('useDataAccess: Fallback to metadata owner_id:', metadataOwnerId);
              setDataOwnerId(metadataOwnerId);
            } else {
              setDataOwnerId(null);
            }
          }
        } catch (error) {
          console.error('Error in assistant data access:', error);
          setDataOwnerId(null);
        }
      } else {
        // Unknown role, use own id
        console.log('useDataAccess: Unknown role, using own ID');
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
    isReady: !loading && (!!dataOwnerId || userProfile?.role === 'assistant')
  };
};
