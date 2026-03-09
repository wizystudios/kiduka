import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Plus, Trash2, Edit2, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_location: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export const AdsManagerPage = () => {
  const { user } = useAuth();
  const { dataOwnerId } = useDataAccess();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    display_location: 'both',
    starts_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: '',
  });

  useEffect(() => {
    if (dataOwnerId) fetchAds();
  }, [dataOwnerId]);

  const fetchAds = async () => {
    if (!dataOwnerId) return;
    setLoading(true);
    const { data } = await supabase
      .from('business_ads' as any)
      .select('*')
      .eq('owner_id', dataOwnerId)
      .order('created_at', { ascending: false });
    setAds((data as unknown as Ad[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ title: '', description: '', image_url: '', link_url: '', display_location: 'both', starts_at: format(new Date(), 'yyyy-MM-dd'), expires_at: '' });
    setEditingAd(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataOwnerId || !form.title.trim()) return;

    setSaving(true);
    try {
      const adData = {
        owner_id: dataOwnerId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        display_location: form.display_location,
        starts_at: new Date(form.starts_at).toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('business_ads' as any)
          .update(adData)
          .eq('id', editingAd.id);
        if (error) throw error;
        toast.success('Tangazo limesasishwa!');
      } else {
        const { error } = await supabase
          .from('business_ads' as any)
          .insert([adData]);
        if (error) throw error;
        toast.success('Tangazo limeundwa!');
      }

      setDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (err) {
      toast.error('Imeshindwa kuhifadhi tangazo');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: Ad) => {
    const { error } = await supabase
      .from('business_ads' as any)
      .update({ is_active: !ad.is_active })
      .eq('id', ad.id);
    if (!error) {
      toast.success(ad.is_active ? 'Tangazo limezimwa' : 'Tangazo limewashwa');
      fetchAds();
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta tangazo hili?')) return;
    const { error } = await supabase
      .from('business_ads' as any)
      .delete()
      .eq('id', id);
    if (!error) {
      toast.success('Tangazo limefutwa');
      fetchAds();
    }
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      display_location: ad.display_location,
      starts_at: ad.starts_at ? format(new Date(ad.starts_at), 'yyyy-MM-dd') : '',
      expires_at: ad.expires_at ? format(new Date(ad.expires_at), 'yyyy-MM-dd') : '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Matangazo
          </h1>
          <p className="text-xs text-muted-foreground">Unda matangazo ya biashara yako</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ongeza
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                {editingAd ? 'Hariri Tangazo' : 'Unda Tangazo Jipya'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Kichwa cha Tangazo *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-2xl" required maxLength={100} />
              </div>
              <div>
                <Label className="text-xs">Maelezo</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-2xl" rows={2} maxLength={200} />
              </div>
              <div>
                <Label className="text-xs">Picha URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="rounded-2xl" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Link ya Kufungua</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className="rounded-2xl" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Mahali pa Kuonyesha</Label>
                <Select value={form.display_location} onValueChange={(v) => setForm({ ...form, display_location: v })}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Kiduka & Sokoni</SelectItem>
                    <SelectItem value="kiduka">Kiduka tu</SelectItem>
                    <SelectItem value="sokoni">Sokoni tu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Kuanzia</Label>
                  <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-2xl" />
                </div>
                <div>
                  <Label className="text-xs">Kuisha</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="rounded-2xl" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-full">Ghairi</Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingAd ? 'Sasisha' : 'Unda'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {ads.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Bado huna matangazo</p>
          <p className="text-xs text-muted-foreground mt-1">Unda tangazo la biashara yako litaonyeshwa kwenye Kiduka na Sokoni</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-background">
              {ad.image_url ? (
                <img src={ad.image_url} alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ad.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-[10px] rounded-full">
                    {ad.is_active ? 'Hai' : 'Imezimwa'}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {ad.display_location === 'both' ? 'Kiduka & Sokoni' : ad.display_location === 'kiduka' ? 'Kiduka' : 'Sokoni'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(ad)}>
                  {ad.is_active ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ad)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdsManagerPage;
