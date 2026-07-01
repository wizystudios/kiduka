import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Smartphone, QrCode, Trash2, Star, Sparkles, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { KidukaLogo } from '@/components/KidukaLogo';
import html2canvas from 'html2canvas';


interface PaymentNumber {
  id: string;
  network: string;
  lipa_namba: string;
  account_name: string | null;
  is_default: boolean;
  is_active: boolean;
  instructions: string | null;
}

const NETWORKS = [
  { value: 'mpesa', label: 'M-Pesa (Vodacom)', color: 'bg-red-500' },
  { value: 'tigopesa', label: 'Tigo Pesa / Mixx', color: 'bg-blue-500' },
  { value: 'airtelmoney', label: 'Airtel Money', color: 'bg-red-600' },
  { value: 'halopesa', label: 'HaloPesa', color: 'bg-orange-500' },
  { value: 'azampesa', label: 'AzamPesa', color: 'bg-green-600' },
  { value: 'other', label: 'Nyingine', color: 'bg-gray-500' },
];

export default function LipaNambaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PaymentNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrFor, setQrFor] = useState<PaymentNumber | null>(null);
  const [form, setForm] = useState({
    network: 'mpesa',
    lipa_namba: '',
    account_name: '',
    instructions: '',
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);


  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('owner_payment_numbers' as any)
      .select('*')
      .eq('owner_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!user?.id || !form.lipa_namba.trim()) {
      toast.error('Jaza Lipa Namba');
      return;
    }
    setSaving(true);
    try {
      if (form.is_default) {
        await supabase.from('owner_payment_numbers' as any).update({ is_default: false }).eq('owner_id', user.id);
      }
      const { error } = await supabase.from('owner_payment_numbers' as any).insert({
        owner_id: user.id,
        network: form.network,
        lipa_namba: form.lipa_namba.trim(),
        account_name: form.account_name.trim() || null,
        instructions: form.instructions.trim() || null,
        is_default: form.is_default,
      });
      if (error) throw error;
      toast.success('Lipa Namba imehifadhiwa');
      setDialogOpen(false);
      setForm({ network: 'mpesa', lipa_namba: '', account_name: '', instructions: '', is_default: false });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Imeshindwa');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!user?.id) return;
    await supabase.from('owner_payment_numbers' as any).update({ is_default: false }).eq('owner_id', user.id);
    await supabase.from('owner_payment_numbers' as any).update({ is_default: true }).eq('id', id);
    toast.success('Imewekwa kuwa namba kuu');
    load();
  };

  const toggleActive = async (item: PaymentNumber) => {
    await supabase.from('owner_payment_numbers' as any).update({ is_active: !item.is_active }).eq('id', item.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta Lipa Namba hii?')) return;
    await supabase.from('owner_payment_numbers' as any).delete().eq('id', id);
    toast.success('Imefutwa');
    load();
  };

  const buildQrUrl = (item: PaymentNumber) => {
    const payload = `Network:${item.network}\nLipa Namba:${item.lipa_namba}\n${item.account_name ? `Jina:${item.account_name}` : ''}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(payload)}&margin=10`;
  };

  const captureShareCard = async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    const canvas = await html2canvas(shareCardRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  };

  const shareQrImage = async () => {
    if (!qrFor) return;
    setSharing(true);
    try {
      // give the QR <img> a moment to fully load
      await new Promise(r => setTimeout(r, 300));
      const blob = await captureShareCard();
      if (!blob) throw new Error('Imeshindwa kutengeneza picha');
      const file = new File([blob], `kiduka-lipa-namba-${qrFor.lipa_namba}.png`, { type: 'image/png' });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: 'Lipa Namba - Kiduka',
          text: `Lipa kwa ${NETWORKS.find(n => n.value === qrFor.network)?.label}: ${qrFor.lipa_namba}`,
        });
      } else {
        // fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
        toast.success('Picha imepakuliwa');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error(e.message || 'Imeshindwa kushare');
    } finally {
      setSharing(false);
    }
  };

  const downloadQrImage = async () => {
    setSharing(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const blob = await captureShareCard();
      if (!blob || !qrFor) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kiduka-lipa-namba-${qrFor.lipa_namba}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Picha imepakuliwa');
    } finally {
      setSharing(false);
    }
  };


  return (
    <div className="p-4 pb-24 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <BackButton />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Lipa Namba Zangu</h1>
            <Badge className="bg-gradient-to-r from-amber-500 to-pink-500 text-white border-0 animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" /> MPYA
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Wateja watalipa madeni kwa kutumia Lipa Namba zako</p>
        </div>
      </div>

      {/* MPYA info banner */}
      <Card className="rounded-3xl border-0 bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="p-4 flex gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-semibold mb-1">Kipengele Kipya — Lipa kwa QR</p>
            <p className="text-xs text-muted-foreground">
              Ongeza Lipa Namba zako za M-Pesa, Tigo Pesa, Airtel Money n.k. Mteja akiwa anataka kulipa deni,
              QR code itazalishwa moja kwa moja kulingana na mtandao alionao.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => setDialogOpen(true)} className="rounded-full w-full">
        <Plus className="h-4 w-4 mr-1" /> Ongeza Lipa Namba
      </Button>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Inapakia...</div>
      ) : items.length === 0 ? (
        <Card className="rounded-3xl"><CardContent className="text-center py-10">
          <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Bado huja-ongeza Lipa Namba</p>
          <p className="text-xs text-muted-foreground mt-1">Ongeza ya kwanza ili kuanza kupokea malipo</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const net = NETWORKS.find(n => n.value === item.network);
            return (
              <Card key={item.id} className="rounded-2xl overflow-hidden">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl ${net?.color || 'bg-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <Smartphone className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{net?.label}</span>
                      {item.is_default && <Badge className="text-[10px] bg-amber-500"><Star className="h-2.5 w-2.5 mr-0.5" />KUU</Badge>}
                      {!item.is_active && <Badge variant="secondary" className="text-[10px]">Imezimwa</Badge>}
                    </div>
                    <p className="text-sm font-mono">{item.lipa_namba}</p>
                    {item.account_name && <p className="text-xs text-muted-foreground">{item.account_name}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setQrFor(item)}>
                      <QrCode className="h-4 w-4" />
                    </Button>
                    {!item.is_default && (
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setDefault(item.id)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => remove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Ongeza Lipa Namba</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Mtandao</Label>
              <Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lipa Namba</Label>
              <Input value={form.lipa_namba} onChange={(e) => setForm({ ...form, lipa_namba: e.target.value })}
                placeholder="mfano 1234567" className="rounded-2xl" />
            </div>
            <div>
              <Label className="text-xs">Jina la Akaunti (hiari)</Label>
              <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="Jina linavyoonekana" className="rounded-2xl" />
            </div>
            <div>
              <Label className="text-xs">Maelekezo (hiari)</Label>
              <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="mfano: Tuma uthibitisho baada ya kulipa" className="rounded-2xl" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Weka kuwa namba kuu</Label>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>Ghairi</Button>
            <Button className="rounded-full" disabled={saving} onClick={save}>{saving ? 'Inahifadhi...' : 'Hifadhi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>QR ya Lipa Namba</DialogTitle></DialogHeader>
          {qrFor && (
            <div className="flex flex-col items-center gap-3 py-2">
              <img src={buildQrUrl(qrFor)} alt="QR" className="w-64 h-64 rounded-2xl border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{NETWORKS.find(n => n.value === qrFor.network)?.label}</p>
                <p className="font-mono font-bold">{qrFor.lipa_namba}</p>
                {qrFor.account_name && <p className="text-sm">{qrFor.account_name}</p>}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Mteja akinasa QR atapata maelekezo ya kulipa kwa mtandao husika.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
