import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Eye, Trash2, ToggleLeft, ToggleRight, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  display_location: string;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  owner_id: string;
  owner_name?: string;
  business_name?: string;
  created_at: string;
}

export const AdminAdsPanel = () => {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<AdminAd | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAd, setNewAd] = useState({
    title: '', description: '', image_url: '', link_url: '',
    display_location: 'both', starts_at: '', expires_at: ''
  });

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const adsList = (data as any[]) || [];
      const ownerIds = [...new Set(adsList.map(a => a.owner_id))];
      
      let profiles: any[] = [];
      if (ownerIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name, business_name').in('id', ownerIds);
        profiles = p || [];
      }

      setAds(adsList.map(ad => {
        const profile = profiles.find(p => p.id === ad.owner_id);
        return {
          ...ad,
          owner_name: profile?.full_name || 'N/A',
          business_name: profile?.business_name || 'N/A'
        };
      }));
    } catch {
      toast.error('Imeshindwa kupakia matangazo');
    } finally {
      setLoading(false);
    }
  };

  const toggleAd = async (ad: AdminAd) => {
    const { error } = await supabase
      .from('business_ads')
      .update({ is_active: !ad.is_active } as any)
      .eq('id', ad.id);
    if (error) {
      toast.error('Imeshindwa kubadili hali');
    } else {
      toast.success(ad.is_active ? 'Tangazo limezimwa' : 'Tangazo limewashwa');
      fetchAds();
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta tangazo hili?')) return;
    const { error } = await supabase.from('business_ads').delete().eq('id', id);
    if (error) {
      toast.error('Imeshindwa kufuta');
    } else {
      toast.success('Tangazo limefutwa');
      fetchAds();
    }
  };

  const createAd = async () => {
    if (!newAd.title) { toast.error('Jina la tangazo linahitajika'); return; }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('business_ads').insert({
      title: newAd.title,
      description: newAd.description || null,
      image_url: newAd.image_url || null,
      link_url: newAd.link_url || null,
      display_location: newAd.display_location,
      starts_at: newAd.starts_at || new Date().toISOString(),
      expires_at: newAd.expires_at || null,
      owner_id: user.id,
      is_active: true
    } as any);

    if (error) {
      toast.error('Imeshindwa kuunda tangazo');
    } else {
      toast.success('Tangazo limeundwa');
      setCreateOpen(false);
      setNewAd({ title: '', description: '', image_url: '', link_url: '', display_location: 'both', starts_at: '', expires_at: '' });
      fetchAds();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Matangazo ({ads.length})
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-full">
          <Plus className="h-4 w-4 mr-1" /> Unda Tangazo
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ads.map(ad => (
          <Card key={ad.id} className="overflow-hidden">
            {ad.image_url && (
              <div className="aspect-video bg-muted">
                <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{ad.business_name}</p>
                </div>
                <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                  {ad.is_active ? 'Active' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>📍 {ad.display_location}</span>
                {ad.expires_at && <span>• Hadi {new Date(ad.expires_at).toLocaleDateString('sw-TZ')}</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="flex-1 h-7 text-xs rounded-full" onClick={() => toggleAd(ad)}>
                  {ad.is_active ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                  {ad.is_active ? 'Zima' : 'Washa'}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-full text-destructive" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ads.length === 0 && (
        <div className="text-center py-12">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Hakuna matangazo bado</p>
        </div>
      )}

      {/* Create Ad Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unda Tangazo Jipya</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Jina</Label>
              <Input value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} placeholder="Jina la tangazo" />
            </div>
            <div>
              <Label>Maelezo</Label>
              <Textarea value={newAd.description} onChange={e => setNewAd({...newAd, description: e.target.value})} placeholder="Maelezo mafupi" />
            </div>
            <div>
              <Label>URL ya Picha</Label>
              <Input value={newAd.image_url} onChange={e => setNewAd({...newAd, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input value={newAd.link_url} onChange={e => setNewAd({...newAd, link_url: e.target.value})} placeholder="https://..." />
            </div>
            <div>
              <Label>Eneo la Kuonyesha</Label>
              <Select value={newAd.display_location} onValueChange={v => setNewAd({...newAd, display_location: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Kiduka & Sokoni</SelectItem>
                  <SelectItem value="kiduka">Kiduka tu</SelectItem>
                  <SelectItem value="sokoni">Sokoni tu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Kuanzia</Label>
                <Input type="date" value={newAd.starts_at} onChange={e => setNewAd({...newAd, starts_at: e.target.value})} />
              </div>
              <div>
                <Label>Hadi</Label>
                <Input type="date" value={newAd.expires_at} onChange={e => setNewAd({...newAd, expires_at: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Ghairi</Button>
            <Button onClick={createAd}>Unda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
