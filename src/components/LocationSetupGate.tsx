import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COUNTRIES = [
  { value: 'Tanzania', label: 'Tanzania', flag: '🇹🇿' },
  { value: 'Kenya', label: 'Kenya', flag: '🇰🇪' },
  { value: 'Uganda', label: 'Uganda', flag: '🇺🇬' },
  { value: 'Rwanda', label: 'Rwanda', flag: '🇷🇼' },
  { value: 'Burundi', label: 'Burundi', flag: '🇧🇮' },
  { value: 'DRC', label: 'DRC', flag: '🇨🇩' },
];

const TANZANIA_REGIONS: Record<string, string[]> = {
  'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
  'Arusha': ['Arusha City', 'Arusha DC', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
  'Dodoma': ['Dodoma City', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kongwa', 'Mpwapwa'],
  'Geita': ['Geita', 'Bukombe', 'Chato', 'Mbogwe', "Nyang'hwale"],
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
  'Njombe': ['Njombe MC', 'Njombe DC', 'Ludewa', 'Makambako', 'Makete', "Wanging'ombe"],
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
  const [skipped, setSkipped] = useState(false);
  const [form, setForm] = useState({
    country: 'Tanzania',
    region: '',
    district: '',
    ward: '',
    street: '',
  });

  useEffect(() => {
    if (user && userProfile && !userProfile.location_set && !skipped) {
      // Check if user already skipped this session
      const sessionSkipped = sessionStorage.getItem(`kiduka_location_skipped_${user.id}`);
      if (sessionSkipped) {
        setSkipped(true);
        return;
      }
      setOpen(true);
      if (userProfile.region) setForm(f => ({ ...f, region: userProfile.region }));
      if (userProfile.district) setForm(f => ({ ...f, district: userProfile.district }));
      if (userProfile.ward) setForm(f => ({ ...f, ward: userProfile.ward }));
      if (userProfile.street) setForm(f => ({ ...f, street: userProfile.street }));
    }
  }, [user, userProfile, skipped]);

  const districts = form.region ? TANZANIA_REGIONS[form.region] || [] : [];
  const selectedCountry = COUNTRIES.find(c => c.value === form.country);

  const handleSkip = () => {
    if (user) sessionStorage.setItem(`kiduka_location_skipped_${user.id}`, 'true');
    setSkipped(true);
    setOpen(false);
  };

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

  if (userProfile?.role === 'super_admin') return <>{children}</>;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold">Weka Eneo Lako</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSkip}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="px-4 text-xs text-muted-foreground mb-3">
              Husaidia wateja kukupata. Unaweza kujaza baadaye kwenye mipangilio.
            </p>

            <div className="px-4 pb-4 space-y-3">
              {/* Country */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Nchi</Label>
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue>
                      {selectedCountry && `${selectedCountry.flag} ${selectedCountry.label}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.flag} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Mkoa *</Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v, district: '' }))}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Chagua mkoa..." /></SelectTrigger>
                  <SelectContent className="z-[250] max-h-60">
                    {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Wilaya *</Label>
                <Select value={form.district} onValueChange={v => setForm(f => ({ ...f, district: v }))} disabled={!form.region}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="Chagua wilaya..." /></SelectTrigger>
                  <SelectContent className="z-[250] max-h-60">
                    {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Ward & Street in a row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Kata</Label>
                  <Input className="h-9 rounded-xl text-sm" placeholder="Mfano: Mwananyamala" value={form.ward} onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mtaa</Label>
                  <Input className="h-9 rounded-xl text-sm" placeholder="Mfano: Uhuru" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={handleSkip}>
                  Ruka kwa sasa
                </Button>
                <Button onClick={handleSave} disabled={saving || !form.region || !form.district} className="flex-1 rounded-xl gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {saving ? 'Inahifadhi...' : 'Hifadhi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
};
