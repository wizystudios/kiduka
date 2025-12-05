import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Assistant {
  id: string;
  email: string;
  full_name: string;
}

interface PermissionState {
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
}

export const AssistantPermissionsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssistants();
  }, [user]);

  useEffect(() => {
    if (selectedAssistant) {
      fetchPermissions(selectedAssistant);
    }
  }, [selectedAssistant]);

  const fetchAssistants = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get assistant IDs from permissions table for this owner
      const { data: permissions, error: permError } = await supabase
        .from('assistant_permissions')
        .select('assistant_id')
        .eq('owner_id', user.id);

      if (permError) throw permError;

      const assistantIds = permissions?.map(p => p.assistant_id) || [];
      
      if (assistantIds.length === 0) {
        setAssistants([]);
        setLoading(false);
        return;
      }

      // Then fetch profiles for these assistants
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', assistantIds);

      if (error) throw error;
      setAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia wasaidizi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (assistantId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('owner_id', user.id)
        .eq('assistant_id', assistantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

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
        });
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const savePermissions = async () => {
    if (!user || !selectedAssistant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assistant_permissions')
        .upsert({
          owner_id: user.id,
          assistant_id: selectedAssistant,
          ...permissions,
        });

      if (error) throw error;

      toast({
        title: 'Imefanikiwa',
        description: 'Ruhusa zimehifadhiwa',
      });
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuhifadhi ruhusa',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const permissionLabels = [
    { key: 'can_view_products', label: 'Angalia Bidhaa' },
    { key: 'can_edit_products', label: 'Hariri Bidhaa' },
    { key: 'can_delete_products', label: 'Futa Bidhaa' },
    { key: 'can_view_sales', label: 'Angalia Mauzo' },
    { key: 'can_create_sales', label: 'Unda Mauzo' },
    { key: 'can_view_customers', label: 'Angalia Wateja' },
    { key: 'can_edit_customers', label: 'Hariri Wateja' },
    { key: 'can_view_reports', label: 'Angalia Ripoti' },
    { key: 'can_view_inventory', label: 'Angalia Hesabu' },
    { key: 'can_edit_inventory', label: 'Hariri Hesabu' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assistants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Hakuna wasaidizi waliosajiliwa. Unda akaunti za wasaidizi kwanza.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chagua Msaidizi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {assistants.map((assistant) => (
              <Button
                key={assistant.id}
                variant={selectedAssistant === assistant.id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setSelectedAssistant(assistant.id)}
              >
                {assistant.full_name || assistant.email}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAssistant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ruhusa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissionLabels.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={permissions[key as keyof PermissionState]}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, [key]: checked })
                  }
                />
              </div>
            ))}
            <Button
              onClick={savePermissions}
              disabled={saving}
              className="w-full mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inahifadhi...
                </>
              ) : (
                'Hifadhi Ruhusa'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
