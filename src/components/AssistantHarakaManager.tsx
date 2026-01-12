import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Assistant {
  id: string;
  email: string;
  full_name: string;
}

// All available haraka items
const ALL_HARAKA_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Bidhaa' },
  { key: 'scanner', label: 'Scanner' },
  { key: 'sales', label: 'Mauzo' },
  { key: 'quick_sale', label: 'Mauzo Haraka' },
  { key: 'calculator', label: 'Calculator' },
  { key: 'customers', label: 'Wateja' },
  { key: 'loans', label: 'Mikopo' },
  { key: 'expenses', label: 'Matumizi' },
  { key: 'inventory', label: 'Hesabu' },
  { key: 'discounts', label: 'Punguzo' },
  { key: 'reports', label: 'Ripoti' },
  { key: 'profit_loss', label: 'Faida/Hasara' },
  { key: 'import_products', label: 'Ingiza Bidhaa' },
  { key: 'notifications', label: 'Arifa' },
  { key: 'sokoni_orders', label: 'Oda Sokoni' },
  { key: 'settings', label: 'Mipangilio' },
];

// Default items for assistants
const DEFAULT_HARAKA_ITEMS = ['dashboard', 'products', 'scanner', 'sales', 'calculator', 'customers', 'loans', 'settings'];

interface HarakaPermissions {
  [key: string]: boolean;
}

export const AssistantHarakaManager = () => {
  const { user } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [harakaPerms, setHarakaPerms] = useState<HarakaPermissions>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAssistants();
    }
  }, [user, open]);

  useEffect(() => {
    if (selectedAssistant) {
      fetchHarakaPermissions(selectedAssistant);
    }
  }, [selectedAssistant]);

  const fetchAssistants = async () => {
    if (!user) return;

    setLoading(true);
    try {
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

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', assistantIds);

      if (error) throw error;
      setAssistants(data || []);
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast.error('Imeshindwa kupakia wasaidizi');
    } finally {
      setLoading(false);
    }
  };

  const fetchHarakaPermissions = async (assistantId: string) => {
    if (!user) return;

    try {
      // For now, we'll store haraka permissions in localStorage per assistant
      // In a real app, this would be stored in the database
      const stored = localStorage.getItem(`haraka_perms_${user.id}_${assistantId}`);
      
      if (stored) {
        setHarakaPerms(JSON.parse(stored));
      } else {
        // Default permissions
        const defaultPerms: HarakaPermissions = {};
        ALL_HARAKA_ITEMS.forEach(item => {
          defaultPerms[item.key] = DEFAULT_HARAKA_ITEMS.includes(item.key);
        });
        setHarakaPerms(defaultPerms);
      }
    } catch (error) {
      console.error('Error fetching haraka permissions:', error);
    }
  };

  const saveHarakaPermissions = async () => {
    if (!user || !selectedAssistant) return;

    setSaving(true);
    try {
      // Store in localStorage for now
      localStorage.setItem(
        `haraka_perms_${user.id}_${selectedAssistant}`,
        JSON.stringify(harakaPerms)
      );

      toast.success('Ruhusa za Haraka zimehifadhiwa');
    } catch (error) {
      console.error('Error saving haraka permissions:', error);
      toast.error('Imeshindwa kuhifadhi');
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (enable: boolean) => {
    const newPerms: HarakaPermissions = {};
    ALL_HARAKA_ITEMS.forEach(item => {
      newPerms[item.key] = enable;
    });
    setHarakaPerms(newPerms);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Simamia Haraka
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ruhusa za Haraka</SheetTitle>
          <SheetDescription>
            Chagua vitu vya haraka ambavyo msaidizi anaweza kuona
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : assistants.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Hakuna wasaidizi. Ongeza wasaidizi kwanza.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Assistant Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chagua Msaidizi</Label>
                <div className="flex flex-wrap gap-2">
                  {assistants.map((assistant) => (
                    <Button
                      key={assistant.id}
                      variant={selectedAssistant === assistant.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedAssistant(assistant.id)}
                    >
                      {assistant.full_name || assistant.email}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Haraka Permissions */}
              {selectedAssistant && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Vitu vya Haraka
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleAll(true)}
                        >
                          Weka Zote
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleAll(false)}
                        >
                          Ondoa Zote
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4">
                    {ALL_HARAKA_ITEMS.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm">
                          {label}
                        </Label>
                        <Switch
                          id={key}
                          checked={harakaPerms[key] ?? false}
                          onCheckedChange={(checked) =>
                            setHarakaPerms({ ...harakaPerms, [key]: checked })
                          }
                        />
                      </div>
                    ))}

                    <Button
                      onClick={saveHarakaPermissions}
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AssistantHarakaManager;
