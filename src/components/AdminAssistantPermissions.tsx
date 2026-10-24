import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssistantPermissionsManager } from '@/components/AssistantPermissionsManager';

/** Super admin: pick any business owner and manage their assistants' permissions. */
export const AdminAssistantPermissions = () => {
  const [owners, setOwners] = useState<{ id: string; business_name: string | null; full_name: string | null }[]>([]);
  const [owner, setOwner] = useState<string>('');
  useEffect(() => {
    supabase.from('assistant_permissions').select('owner_id').then(async ({ data }) => {
      const ids = [...new Set((data || []).map(r => r.owner_id))];
      if (!ids.length) return;
      const { data: p } = await supabase.from('profiles').select('id, business_name, full_name').in('id', ids);
      setOwners(p || []);
    });
  }, []);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Ruhusa za wasaidizi</h2>
      <Select value={owner} onValueChange={setOwner}>
        <SelectTrigger aria-label="Chagua biashara" className="max-w-md rounded-2xl"><SelectValue placeholder="Chagua biashara" /></SelectTrigger>
        <SelectContent>{owners.map(o => <SelectItem key={o.id} value={o.id}>{o.business_name || o.full_name || o.id.slice(0, 8)}</SelectItem>)}</SelectContent>
      </Select>
      {owner && <AssistantPermissionsManager key={owner} ownerId={owner} />}
    </section>
  );
};
