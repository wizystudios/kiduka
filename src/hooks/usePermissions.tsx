import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface AssistantPermissions {
  can_view_products: boolean;
  can_edit_products: boolean;
  can_delete_products: boolean;
  can_view_sales: boolean;
  can_create_sales: boolean;
  can_view_customers: boolean;
  can_edit_customers: boolean;
  can_view_reports: boolean;
  can_view_inventory: boolean;
  can_edit_inventory: boolean;
  owner_id?: string;
}

export const usePermissions = () => {
  const { user, userProfile } = useAuth();
  const [permissions, setPermissions] = useState<AssistantPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      }

      // Owners and super_admins have all permissions
      if (userProfile.role === 'owner' || userProfile.role === 'super_admin') {
        setPermissions({
          can_view_products: true,
          can_edit_products: true,
          can_delete_products: true,
          can_view_sales: true,
          can_create_sales: true,
          can_view_customers: true,
          can_edit_customers: true,
          can_view_reports: true,
          can_view_inventory: true,
          can_edit_inventory: true,
        });
        setOwnerId(user.id); // Owner is their own owner
        setLoading(false);
        return;
      }

      // For assistants, fetch their specific permissions and owner_id
      if (userProfile.role === 'assistant') {
        try {
          const { data, error } = await supabase
            .from('assistant_permissions')
            .select('*')
            .eq('assistant_id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            setPermissions({
              can_view_products: data.can_view_products,
              can_edit_products: data.can_edit_products,
              can_delete_products: data.can_delete_products,
              can_view_sales: data.can_view_sales,
              can_create_sales: data.can_create_sales,
              can_view_customers: data.can_view_customers,
              can_edit_customers: data.can_edit_customers,
              can_view_reports: data.can_view_reports,
              can_view_inventory: data.can_view_inventory,
              can_edit_inventory: data.can_edit_inventory,
              owner_id: data.owner_id,
            });
            setOwnerId(data.owner_id); // Set the owner_id for data access
          } else {
            // Default permissions for assistants without explicit permissions
            setPermissions({
              can_view_products: true,
              can_edit_products: false,
              can_delete_products: false,
              can_view_sales: true,
              can_create_sales: true,
              can_view_customers: true,
              can_edit_customers: false,
              can_view_reports: false,
              can_view_inventory: true,
              can_edit_inventory: false,
            });
          }
        } catch (error) {
          console.error('Error fetching permissions:', error);
        }
      }

      setLoading(false);
    };

    fetchPermissions();
  }, [user, userProfile]);

  // Helper function to get the effective owner_id for data queries
  // For owners: use their own id
  // For assistants: use their linked owner_id
  const getEffectiveOwnerId = () => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'super_admin') {
      return user?.id;
    }
    return ownerId;
  };

  return { permissions, loading, ownerId, getEffectiveOwnerId };
};
