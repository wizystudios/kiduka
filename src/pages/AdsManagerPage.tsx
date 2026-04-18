import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, Plus, Trash2, Edit2, Loader2, Eye, EyeOff, Upload, Video } from 'lucide-react';
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

const AD_PRICING = [
  { days: 7, label: '1 Wiki', price: 5000 },
  { days: 14, label: '2 Wiki', price: 8000 },
  { days: 30, label: '1 Mwezi', price: 15000 },
  { days: 90, label: '3 Miezi', price: 35000 },
];

const isUploadedMediaUrl = (value: string | null) => !!value && value.includes('/storage/v1/object/public/');

export const AdsManagerPage = () => {
  const { user } = useAuth();
  const { dataOwnerId } = useDataAccess();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);

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
    setSelectedPlan(0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dataOwnerId) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Picha ni kubwa sana. Ukubwa wa juu ni 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `ads/${dataOwnerId}/${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Picha imepakiwa!');
    } catch (err) {
      toast.error('Imeshindwa kupakia picha');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataOwnerId || !form.title.trim()) return;

    setSaving(true);
    try {
      const plan = AD_PRICING[selectedPlan];
      const startDate = new Date(form.starts_at);
      const expiresAt = editingAd ? (form.expires_at ? new Date(form.expires_at).toISOString() : null) : new Date(startDate.getTime() + plan.days * 24 * 60 * 60 * 1000).toISOString();

      const adData = {
        owner_id: dataOwnerId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        display_location: form.display_location,
        starts_at: startDate.toISOString(),
        expires_at: expiresAt,
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
        toast.success(`Tangazo limeundwa! Kipindi: ${plan.label} (TSh ${plan.price.toLocaleString()})`);
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

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
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
          <p className="text-xs text-muted-foreground">Tangaza biashara yako kwa wateja</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ongeza
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                {editingAd ? 'Hariri Tangazo' : 'Unda Tangazo Jipya'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Image Upload */}
              <div>
                <Label className="text-xs">Picha ya Tangazo</Label>
                <div className="mt-1">
                  {form.image_url ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/50">
                      <img src={form.image_url} alt="" className="w-full h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
                      >×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Pakia picha au logo</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG - Max 5MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs">Kichwa cha Tangazo *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-2xl" required maxLength={100} />
              </div>
              <div>
                <Label className="text-xs">Maelezo</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-2xl" rows={2} maxLength={200} />
              </div>
              {/* Video upload */}
              <div>
                <Label className="text-xs">Video ya Tangazo (Hiari)</Label>
                <label className="flex items-center gap-2 mt-1 px-3 py-2 border border-dashed border-border/50 rounded-2xl cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Pakia video (max 10MB)</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !dataOwnerId) return;
                      if (file.size > 10 * 1024 * 1024) { toast.error('Video ni kubwa sana. Max 10MB'); return; }
                      setUploading(true);
                      try {
                        const ext = file.name.split('.').pop();
                        const fileName = `ads/${dataOwnerId}/video_${Date.now()}.${ext}`;
                        const { data, error } = await supabase.storage.from('product-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
                        setForm(prev => ({ ...prev, link_url: urlData.publicUrl }));
                        toast.success('Video imepakiwa!');
                      } catch { toast.error('Imeshindwa kupakia video'); }
                      finally { setUploading(false); }
                    }}
                    disabled={uploading}
                  />
                </label>
                {form.link_url && form.link_url.includes('/ads/') && (
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Video imepakiwa</Badge>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, link_url: '' }))} className="text-[10px] text-destructive">Ondoa</button>
                  </div>
                )}
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

              {/* Pricing Plans - only for new ads */}
              {!editingAd && (
                <div>
                  <Label className="text-xs mb-2 block">Kipindi cha Tangazo & Bei</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AD_PRICING.map((plan, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPlan(i)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedPlan === i 
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                            : 'border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <p className="text-xs font-bold text-foreground">{plan.label}</p>
                        <p className="text-sm font-bold text-primary">TSh {plan.price.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Kuanzia</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-2xl" />
              </div>

              {editingAd && (
                <div>
                  <Label className="text-xs">Kuisha</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="rounded-2xl" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-full">Ghairi</Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingAd ? 'Sasisha' : `Unda (TSh ${AD_PRICING[selectedPlan].price.toLocaleString()})`}
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
          {ads.map((ad) => {
            const daysLeft = getDaysRemaining(ad.expires_at);
            return (
              <div key={ad.id} className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                {/* Preview image */}
                {ad.image_url && (
                  <div className="relative h-20 overflow-hidden">
                    <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}
                <div className="flex items-center gap-3 p-3">
                  {!ad.image_url && (
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ad.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-[10px] rounded-full">
                        {ad.is_active ? 'Hai' : 'Imezimwa'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {ad.display_location === 'both' ? 'Kiduka & Sokoni' : ad.display_location === 'kiduka' ? 'Kiduka' : 'Sokoni'}
                      </span>
                      {daysLeft !== null && (
                        <Badge variant={daysLeft > 3 ? 'outline' : 'destructive'} className="text-[10px] rounded-full">
                          {daysLeft > 0 ? `Siku ${daysLeft}` : 'Imeisha'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(ad)}>
                      {ad.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ad)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAd(ad.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdsManagerPage;
