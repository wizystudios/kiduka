import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
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
import { QRCodeCanvas } from 'qrcode.react';
import { captureElementAsImage, createPdfFromImage, shareOrDownloadFile, type ExportType } from '@/utils/shareExport';


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
  const { ownerBusinessName } = useDataAccess();
  const businessName = ownerBusinessName || 'Kiduka';
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
  const [sharePreview, setSharePreview] = useState<{
    type: ExportType;
    dataUrl: string;
    file: File;
  } | null>(null);


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

  const buildQrPayload = (item: PaymentNumber) => {
    return `Network:${item.network}\nLipa Namba:${item.lipa_namba}\n${item.account_name ? `Jina:${item.account_name}` : ''}`;
  };

  const captureShareCard = async () => {
    if (!shareCardRef.current) throw new Error('Preview haijawa tayari');
    return captureElementAsImage(shareCardRef.current);
  };

  const createPdfFile = async (item: PaymentNumber): Promise<File> => {
    const capture = await captureShareCard();
    return createPdfFromImage(capture, `kiduka-lipa-namba-${item.lipa_namba}.pdf`);
  };

  const shareFile = async (file: File) => {
    const result = await shareOrDownloadFile(file, 'Lipa Namba - Kiduka');
    if (result === 'downloaded') toast.success(file.type === 'application/pdf' ? 'PDF imepakuliwa' : 'Picha imepakuliwa');
  };

  const prepareSharePreview = async (type: ExportType) => {
    if (!qrFor) return;
    setSharing(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const capture = await captureShareCard();
      const file = type === 'pdf'
        ? createPdfFromImage(capture, `kiduka-lipa-namba-${qrFor.lipa_namba}.pdf`)
        : new File([capture.blob], `kiduka-lipa-namba-${qrFor.lipa_namba}.png`, { type: 'image/png' });
      setSharePreview({ type, dataUrl: capture.dataUrl, file });
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error(e.message || 'Imeshindwa kuandaa preview');
    } finally {
      setSharing(false);
    }
  };

  const confirmSharePreview = async () => {
    if (!sharePreview) return;
    setSharing(true);
    try {
      await shareFile(sharePreview.file);
      setSharePreview(null);
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
      const capture = await captureShareCard();
        if (!qrFor) return;
      const url = URL.createObjectURL(capture.blob);
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

  const shareQrPdf = async () => {
    await prepareSharePreview('pdf');
  };

  const shareQrImage = async () => {
    await prepareSharePreview('image');
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
        <DialogContent className="rounded-3xl max-w-sm p-4">
          <DialogHeader><DialogTitle>Shiriki Lipa Namba</DialogTitle></DialogHeader>
          {qrFor && (
            <div className="space-y-3">
              {/* Branded share card — fixed pixel width so html2canvas exports a full, un-cropped image */}
              <div
                ref={shareCardRef}
                className="rounded-3xl overflow-hidden border shadow-inner mx-auto"
                style={{
                  width: 360,
                  padding: 20,
                  background: 'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Brand row: Kiduka logo + business name */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <KidukaLogo size="md" showText={false} animate={false} />
                  <div className="text-left leading-tight">
                    <p className="text-[15px] font-black text-neutral-900 truncate max-w-[220px]">{businessName}</p>
                    <p className="text-[10px] text-neutral-500">Kiduka · Biashara Smart</p>
                  </div>
                </div>

                <div className={`rounded-2xl ${NETWORKS.find(n => n.value === qrFor.network)?.color || 'bg-gray-500'} text-white text-center py-2 mb-3`}>
                  <p className="text-xs font-semibold opacity-95">{NETWORKS.find(n => n.value === qrFor.network)?.label}</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-2xl border-4 border-white shadow-lg">
                    <QRCodeCanvas
                      value={buildQrPayload(qrFor)}
                      size={220}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500 mt-1">Lipa Namba</p>
                  <p className="font-mono font-black text-3xl tracking-wide text-neutral-900">{qrFor.lipa_namba}</p>
                  {qrFor.account_name && (
                    <p className="text-sm font-semibold text-neutral-700">{qrFor.account_name}</p>
                  )}
                </div>

                <div className="text-center mt-3 pt-3 border-t border-dashed border-neutral-300">
                  <p className="text-[10px] text-neutral-500">Scan QR au ingiza Lipa Namba kulipa</p>
                  <p className="text-[10px] font-semibold text-neutral-700 mt-0.5">{businessName}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="rounded-full" disabled={sharing} onClick={downloadQrImage}>
                  <Download className="h-4 w-4 mr-1" /> Pakua
                </Button>
                <Button variant="outline" className="rounded-full" disabled={sharing} onClick={shareQrPdf}>
                  <Share2 className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button className="rounded-full" disabled={sharing} onClick={shareQrImage}>
                  <Share2 className="h-4 w-4 mr-1" /> Picha
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Utashiriki picha yenye QR code na jina lako la biashara — sio maandishi tu.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sharePreview} onOpenChange={(open) => !open && setSharePreview(null)}>
        <DialogContent className="rounded-3xl max-w-sm p-4">
          <DialogHeader>
            <DialogTitle>Hakiki kabla ya kutuma</DialogTitle>
          </DialogHeader>
          {sharePreview && (
            <div className="space-y-3">
              <div className="rounded-3xl border bg-muted/30 p-2">
                <img
                  src={sharePreview.dataUrl}
                  alt="Preview ya Lipa Namba yenye nembo ya Kiduka na jina la biashara"
                  className="w-full rounded-2xl bg-white object-contain"
                />
              </div>
              <Badge variant="secondary" className="rounded-full">
                {sharePreview.type === 'pdf' ? 'Itatumwa kama PDF halisi' : 'Itatumwa kama picha halisi'} · {businessName}
              </Badge>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setSharePreview(null)} disabled={sharing}>
                  Rudi
                </Button>
                <Button className="rounded-full" onClick={confirmSharePreview} disabled={sharing}>
                  <Share2 className="h-4 w-4 mr-1" /> Tuma
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
