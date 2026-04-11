import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  User, ClipboardList, Heart, Settings, LogOut, Store, Package, 
  ChevronRight, MapPin, Phone, Edit2, Save, ArrowLeft, Briefcase,
  ShieldCheck
} from 'lucide-react';
import { useSokoniCustomer } from '@/hooks/useSokoniCustomer';
import { useWishlist } from '@/hooks/useWishlist';
import { SokoniLogo } from './SokoniLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompanyProductsFooter } from './CompanyProductsFooter';

interface CustomerDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthOpen: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  'Tanzania': '🇹🇿',
  'Kenya': '🇰🇪',
  'Uganda': '🇺🇬',
  'Rwanda': '🇷🇼',
  'Burundi': '🇧🇮',
  'DRC': '🇨🇩',
  'Mozambique': '🇲🇿',
  'Malawi': '🇲🇼',
  'Zambia': '🇿🇲',
  'South Africa': '🇿🇦',
  'Nigeria': '🇳🇬',
  'Ghana': '🇬🇭',
  'Ethiopia': '🇪🇹',
  'Somalia': '🇸🇴',
};

export const CustomerDashboard = ({ open, onOpenChange, onAuthOpen }: CustomerDashboardProps) => {
  const navigate = useNavigate();
  const { customer, isLoggedIn, logout, updateName, customerPhone } = useSokoniCustomer();
  const { wishlistCount } = useWishlist();
  const [activeView, setActiveView] = useState<'main' | 'profile' | 'upgrade'>('main');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  // Business upgrade fields
  const [upgradeData, setUpgradeData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    fullName: '',
  });
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (customer?.name) setNameInput(customer.name);
  }, [customer]);

  useEffect(() => {
    if (isLoggedIn && customerPhone) {
      // Count orders for this customer
      const orders = JSON.parse(localStorage.getItem('sokoni_guest_orders') || '[]');
      const myOrders = orders.filter((o: any) => o.customer_phone === customerPhone);
      setOrderCount(myOrders.length);

      // Load customer profile data
      loadCustomerProfile();
    }
  }, [isLoggedIn, customerPhone]);

  const loadCustomerProfile = async () => {
    if (!customer?.id) return;
    const { data } = await supabase
      .from('sokoni_customers' as any)
      .select('*')
      .eq('id', customer.id)
      .single();
    if (data) {
      const d = data as any;
      setCountry(d.country || '');
      setRegion(d.region || '');
      setDistrict(d.district || '');
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    const ok = await updateName(nameInput.trim());
    if (ok) {
      toast.success('Jina limehifadhiwa');
      setEditingName(false);
    } else {
      toast.error('Imeshindwa kuhifadhi');
    }
  };

  const handleSaveProfile = async () => {
    if (!customer?.id) return;
    setSavingProfile(true);
    try {
      await supabase
        .from('sokoni_customers' as any)
        .update({ 
          name: nameInput.trim() || customer.name,
          country: country || null,
          region: region || null, 
          district: district || null 
        })
        .eq('id', customer.id);
      toast.success('Taarifa zimehifadhiwa');
      setActiveView('main');
    } catch {
      toast.error('Imeshindwa kuhifadhi');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpgradeToOwner = async () => {
    const { email, password, confirmPassword, businessName, fullName } = upgradeData;
    
    if (!email || !password || !fullName) {
      toast.error('Tafadhali jaza taarifa zote zinazohitajika');
      return;
    }
    if (password.length < 8) {
      toast.error('Nywila lazima iwe angalau herufi 8');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Nywila hazifanani');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Barua pepe si sahihi');
      return;
    }

    setUpgrading(true);
    try {
      // Sign up as business owner
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: businessName || fullName,
          }
        }
      });

      if (authError) throw authError;

      toast.success('Akaunti ya biashara imeundwa! Angalia barua pepe yako kuthibitisha.');
      setActiveView('main');
      onOpenChange(false);
      navigate('/auth');
    } catch (error: any) {
      toast.error(error.message || 'Imeshindwa kuunda akaunti');
    } finally {
      setUpgrading(false);
    }
  };

  const flag = COUNTRY_FLAGS[country] || '🌍';

  if (!isLoggedIn) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Akaunti Yangu
            </SheetTitle>
          </SheetHeader>
          <div className="py-6 text-center space-y-4">
            <User className="h-16 w-16 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Ingia au jisajili kuona oda, vipendwa, na mipangilio yako</p>
            <Button className="w-full rounded-full h-12" onClick={() => { onOpenChange(false); onAuthOpen(); }}>
              <ShieldCheck className="h-5 w-5 mr-2" />
              Ingia / Jisajili
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setActiveView('main'); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {activeView === 'main' && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Akaunti Yangu
              </SheetTitle>
            </SheetHeader>

            {/* Customer Info */}
            <div className="py-3 flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                {flag}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{customer?.name || 'Mteja'}</p>
                <p className="text-sm text-muted-foreground">{customer?.phone}</p>
                {country && <p className="text-xs text-muted-foreground">{flag} {country}{region ? `, ${region}` : ''}</p>}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 py-3">
              <div className="text-center p-3 bg-muted/50 rounded-2xl">
                <p className="text-2xl font-bold text-primary">{orderCount}</p>
                <p className="text-xs text-muted-foreground">Oda Zangu</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-2xl">
                <p className="text-2xl font-bold text-primary">{wishlistCount}</p>
                <p className="text-xs text-muted-foreground">Vipendwa</p>
              </div>
            </div>

            {/* Menu */}
            <div className="space-y-1 py-2">
              <Button variant="ghost" className="w-full justify-between h-12 rounded-2xl" onClick={() => { navigate('/track-order'); onOpenChange(false); }}>
                <span className="flex items-center gap-3"><ClipboardList className="h-5 w-5" /> Oda Zangu</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" className="w-full justify-between h-12 rounded-2xl" onClick={() => { navigate('/sokoni/favorites'); onOpenChange(false); }}>
                <span className="flex items-center gap-3"><Heart className="h-5 w-5" /> Vipendwa</span>
                <div className="flex items-center gap-2">
                  {wishlistCount > 0 && <Badge variant="secondary">{wishlistCount}</Badge>}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-between h-12 rounded-2xl" onClick={() => setActiveView('profile')}>
                <span className="flex items-center gap-3"><Settings className="h-5 w-5" /> Mipangilio</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" className="w-full justify-between h-12 rounded-2xl" onClick={() => setActiveView('upgrade')}>
                <span className="flex items-center gap-3"><Briefcase className="h-5 w-5" /> Kuwa Mfanyabiashara</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>

              <div className="pt-2">
                <Button variant="outline" className="w-full rounded-full h-11 text-destructive border-destructive/30" onClick={() => { logout(); onOpenChange(false); }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Toka
                </Button>
              </div>
            </div>

            <CompanyProductsFooter />
          </>
        )}

        {activeView === 'profile' && (
          <>
            <div className="flex items-center gap-3 py-3">
              <Button variant="ghost" size="icon" onClick={() => setActiveView('main')} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-bold text-lg">Mipangilio ya Akaunti</h2>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Jina</Label>
                <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Jina lako" className="rounded-2xl" />
              </div>
              <div>
                <Label className="text-xs">Nchi</Label>
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Chagua nchi</option>
                  {Object.entries(COUNTRY_FLAGS).map(([name, fl]) => (
                    <option key={name} value={name}>{fl} {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Mkoa</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Mkoa" className="rounded-2xl" />
              </div>
              <div>
                <Label className="text-xs">Wilaya</Label>
                <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Wilaya" className="rounded-2xl" />
              </div>

              <Button className="w-full rounded-full" onClick={handleSaveProfile} disabled={savingProfile}>
                <Save className="h-4 w-4 mr-2" />
                {savingProfile ? 'Inahifadhi...' : 'Hifadhi'}
              </Button>
            </div>

            <CompanyProductsFooter />
          </>
        )}

        {activeView === 'upgrade' && (
          <>
            <div className="flex items-center gap-3 py-3">
              <Button variant="ghost" size="icon" onClick={() => setActiveView('main')} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="font-bold text-lg">Kuwa Mfanyabiashara</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Fungua akaunti ya biashara na anza kuuza bidhaa kupitia Kiduka na Sokoni.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Jina Kamili *</Label>
                <Input 
                  value={upgradeData.fullName} 
                  onChange={(e) => setUpgradeData(d => ({...d, fullName: e.target.value}))} 
                  placeholder="Jina lako kamili" className="rounded-2xl" 
                />
              </div>
              <div>
                <Label className="text-xs">Jina la Biashara</Label>
                <Input 
                  value={upgradeData.businessName} 
                  onChange={(e) => setUpgradeData(d => ({...d, businessName: e.target.value}))} 
                  placeholder="Jina la duka/biashara" className="rounded-2xl" 
                />
              </div>
              <div>
                <Label className="text-xs">Barua Pepe *</Label>
                <Input 
                  type="email"
                  value={upgradeData.email} 
                  onChange={(e) => setUpgradeData(d => ({...d, email: e.target.value}))} 
                  placeholder="email@example.com" className="rounded-2xl" 
                />
              </div>
              <div>
                <Label className="text-xs">Nywila * (angalau herufi 8)</Label>
                <Input 
                  type="password"
                  value={upgradeData.password} 
                  onChange={(e) => setUpgradeData(d => ({...d, password: e.target.value}))} 
                  placeholder="Nywila" className="rounded-2xl" 
                />
              </div>
              <div>
                <Label className="text-xs">Thibitisha Nywila *</Label>
                <Input 
                  type="password"
                  value={upgradeData.confirmPassword} 
                  onChange={(e) => setUpgradeData(d => ({...d, confirmPassword: e.target.value}))} 
                  placeholder="Rudia nywila" className="rounded-2xl" 
                />
              </div>

              <Button className="w-full rounded-full h-12" onClick={handleUpgradeToOwner} disabled={upgrading}>
                <Briefcase className="h-5 w-5 mr-2" />
                {upgrading ? 'Inaunda...' : 'Unda Akaunti ya Biashara'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
