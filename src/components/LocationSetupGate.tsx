import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tanzania regions and their districts
const TANZANIA_REGIONS: Record<string, string[]> = {
  'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
  'Arusha': ['Arusha City', 'Arusha DC', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
  'Dodoma': ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
  'Geita': ['Geita', 'Bukombe', 'Chato', 'Mbogwe', 'Nyang\'hwale'],
  'Iringa': ['Iringa MC', 'Iringa DC', 'Kilolo', 'Mafinga', 'Mufindi'],
  'Kagera': ['Bukoba MC', 'Bukoba DC', 'Biharamulo', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
  'Katavi': ['Mpanda MC', 'Mpanda DC', 'Mlele'],
  'Kigoma': ['Kigoma MC', 'Kigoma DC', 'Buhigwe', 'Kakonko', 'Kasulu MC', 'Kasulu DC', 'Kibondo', 'Uvinza'],
  'Kilimanjaro': ['Moshi MC', 'Moshi DC', 'Hai', 'Rombo', 'Same', 'Siha', 'Mwanga'],
  'Lindi': ['Lindi MC', 'Lindi DC', 'Kilwa', 'Liwale', 'Nachingwea', 'Ruangwa'],
  'Manyara': ['Babati MC', 'Babati DC', 'Hanang', 'Kiteto', 'Mbulu MC', 'Mbulu DC', 'Simanjiro'],
  'Mara': ['Musoma MC', 'Musoma DC', 'Bunda', 'Butiama', 'Rorya', 'Serengeti', 'Tarime MC', 'Tarime DC'],
  'Mbeya': ['Mbeya City', 'Mbeya DC', 'Busokelo', 'Chunya', 'Mbarali', 'Rungwe'],
  'Morogoro': ['Morogoro MC', 'Morogoro DC', 'Gairo', 'Ifakara', 'Kilombero', 'Kilosa', 'Mvomero', 'Ulanga', 'Malinyi'],
  'Mtwara': ['Mtwara MC', 'Mtwara DC', 'Masasi MC', 'Masasi DC', 'Nanyumbu', 'Newala', 'Tandahimba'],
  'Mwanza': ['Mwanza City', 'Ilemela', 'Nyamagana', 'Kwimba', 'Magu', 'Misungwi', 'Sengerema', 'Ukerewe'],
  'Njombe': ['Njombe MC', 'Njombe DC', 'Ludewa', 'Makambako', 'Makete', 'Wanging\'ombe'],
  'Pemba Kaskazini': ['Wete', 'Micheweni'],
  'Pemba Kusini': ['Chake Chake', 'Mkoani'],
  'Pwani': ['Kibaha MC', 'Kibaha DC', 'Bagamoyo', 'Chalinze', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji'],
  'Rukwa': ['Sumbawanga MC', 'Sumbawanga DC', 'Kalambo', 'Nkasi'],
  'Ruvuma': ['Songea MC', 'Songea DC', 'Mbinga MC', 'Mbinga DC', 'Namtumbo', 'Nyasa', 'Tunduru'],
  'Shinyanga': ['Shinyanga MC', 'Shinyanga DC', 'Kahama MC', 'Kahama DC', 'Kishapu', 'Ushetu'],
  'Simiyu': ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
  'Singida': ['Singida MC', 'Singida DC', 'Ikungi', 'Iramba', 'Manyoni', 'Mkalama'],
  'Songwe': ['Tunduma', 'Ileje', 'Mbozi', 'Momba', 'Songwe'],
  'Tabora': ['Tabora MC', 'Igunga', 'Kaliua', 'Nzega', 'Sikonge', 'Urambo', 'Uyui'],
  'Tanga': ['Tanga City', 'Handeni MC', 'Handeni DC', 'Kilindi', 'Korogwe MC', 'Korogwe DC', 'Lushoto', 'Mkinga', 'Muheza', 'Pangani', 'Bumbuli'],
  'Unguja Kaskazini': ['Kaskazini A', 'Kaskazini B'],
  'Unguja Kusini': ['Kati', 'Kusini'],
  'Unguja Mjini Magharibi': ['Mjini', 'Magharibi A', 'Magharibi B'],
};

const REGIONS = Object.keys(TANZANIA_REGIONS).sort();

export const LocationSetupGate = ({ children }: { children: React.ReactNode }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    country: 'Tanzania',
    region: '',
    district: '',
    ward: '',
    street: '',
  });

  useEffect(() => {
    if (user && userProfile && !userProfile.location_set) {
      setOpen(true);
      // Pre-fill from existing data if any
      if (userProfile.region) setForm(f => ({ ...f, region: userProfile.region }));
      if (userProfile.district) setForm(f => ({ ...f, district: userProfile.district }));
      if (userProfile.ward) setForm(f => ({ ...f, ward: userProfile.ward }));
      if (userProfile.street) setForm(f => ({ ...f, street: userProfile.street }));
    }
  }, [user, userProfile]);

  const districts = form.region ? TANZANIA_REGIONS[form.region] || [] : [];

  const handleSave = async () => {
    if (!form.region || !form.district) {
      toast.error('Tafadhali chagua mkoa na wilaya');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country: form.country,
          region: form.region,
          district: form.district,
          ward: form.ward || null,
          street: form.street || null,
          location_set: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', user!.id);

      if (error) throw error;
      toast.success('Eneo limehifadhiwa!');
      setOpen(false);
      await refreshProfile();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Imeshindwa kuhifadhi eneo');
    } finally {
      setSaving(false);
    }
  };

  // Don't gate super_admin
  if (userProfile?.role === 'super_admin') return <>{children}</>;

  return (
    <>
      <Dialog open={open} onOpenChange={() => {/* prevent close without saving */}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Weka Eneo Lako
            </DialogTitle>
            <DialogDescription>
              Tafadhali jaza eneo lako ili wateja wa Sokoni waweze kukupata kwa urahisi. Hii husaidia wateja kuona bidhaa zilizo karibu nao.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nchi</Label>
              <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tanzania">Tanzania 🇹🇿</SelectItem>
                  <SelectItem value="Kenya">Kenya 🇰🇪</SelectItem>
                  <SelectItem value="Uganda">Uganda 🇺🇬</SelectItem>
                  <SelectItem value="Rwanda">Rwanda 🇷🇼</SelectItem>
                  <SelectItem value="Burundi">Burundi 🇧🇮</SelectItem>
                  <SelectItem value="DRC">DRC 🇨🇩</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mkoa *</Label>
              <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v, district: '' }))}>
                <SelectTrigger><SelectValue placeholder="Chagua mkoa..." /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Wilaya *</Label>
              <Select value={form.district} onValueChange={v => setForm(f => ({ ...f, district: v }))} disabled={!form.region}>
                <SelectTrigger><SelectValue placeholder="Chagua wilaya..." /></SelectTrigger>
                <SelectContent>
                  {districts.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ward */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Kata / Ward</Label>
              <Input
                placeholder="Mfano: Mwananyamala"
                value={form.ward}
                onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}
              />
            </div>

            {/* Street */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mtaa</Label>
              <Input
                placeholder="Mfano: Mtaa wa Uhuru"
                value={form.street}
                onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
              />
            </div>

            <Button onClick={handleSave} disabled={saving || !form.region || !form.district} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {saving ? 'Inahifadhi...' : 'Hifadhi Eneo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
};
