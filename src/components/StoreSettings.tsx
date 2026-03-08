import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Store, Copy, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const StoreSettings = () => {
  const { user } = useAuth();
  const [storeSlug, setStoreSlug] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [googlePixelId, setGooglePixelId] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('store_slug, store_description, google_pixel_id, facebook_pixel_id')
      .eq('id', user!.id)
      .maybeSingle();
    
    if (data) {
      setStoreSlug((data as any).store_slug || '');
      setStoreDescription((data as any).store_description || '');
      setGooglePixelId((data as any).google_pixel_id || '');
      setFacebookPixelId((data as any).facebook_pixel_id || '');
    }
    setLoaded(true);
  };

  const saveSettings = async () => {
    if (!storeSlug) {
      toast.error('Jaza jina la duka (slug)');
      return;
    }

    const slug = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        store_slug: slug,
        store_description: storeDescription || null,
        google_pixel_id: googlePixelId || null,
        facebook_pixel_id: facebookPixelId || null,
      } as any)
      .eq('id', user!.id);

    if (error) {
      if (error.code === '23505') toast.error('Slug hii tayari ipo. Chagua nyingine.');
      else toast.error('Imeshindwa kuhifadhi');
    } else {
      toast.success('Imehifadhiwa!');
      setStoreSlug(slug);
    }
    setSaving(false);
  };

  const storeUrl = storeSlug ? `${window.location.origin}/duka/${storeSlug}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success('Link imenakiliwa!');
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            Duka Langu la Mtandaoni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">Jina la Duka (slug)</label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/duka/</span>
                <Input
                  value={storeSlug}
                  onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="jina-la-duka"
                  className="pl-14 text-xs"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Maelezo ya Duka</label>
            <Input
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Tunapatikana na bidhaa bora..."
              className="mt-1 text-xs"
            />
          </div>

          {storeUrl && (
            <div className="p-2 bg-muted/50 rounded-lg flex items-center justify-between gap-2">
              <code className="text-xs text-primary truncate">{storeUrl}</code>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyLink}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(storeUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={saveSettings} disabled={saving}>
            {saving ? 'Inahifadhi...' : 'Hifadhi'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Tracking Pixels (Matangazo)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium">Google Analytics / Ads Pixel ID</label>
            <Input
              value={googlePixelId}
              onChange={(e) => setGooglePixelId(e.target.value)}
              placeholder="G-XXXXXXXXXX au AW-XXXXXXXXXX"
              className="mt-1 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Facebook Pixel ID</label>
            <Input
              value={facebookPixelId}
              onChange={(e) => setFacebookPixelId(e.target.value)}
              placeholder="XXXXXXXXXXXXXXXXXX"
              className="mt-1 text-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Pixels zinafanya kazi kwenye ukurasa wa duka lako (/duka/{storeSlug || 'jina'}) - wateja watakapoingia kwenye duka lako, pixels zitafuatilia.
          </p>
          <Button className="w-full" onClick={saveSettings} disabled={saving}>
            {saving ? 'Inahifadhi...' : 'Hifadhi Pixels'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
