import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, FileText, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { KidukaLogo } from '@/components/KidukaLogo';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';

interface DebtPaymentQRProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerName: string;
  customerPhone?: string | null;
  amount: number;
  reference: string; // transaction id / debt id - makes QR unique per debt
  notes?: string;
}

interface PayNum {
  id: string;
  network: string;
  lipa_namba: string;
  account_name: string | null;
  is_default: boolean;
  instructions: string | null;
}

const NET_LABEL: Record<string, string> = {
  mpesa: 'M-Pesa', tigopesa: 'Tigo Pesa', airtelmoney: 'Airtel Money',
  halopesa: 'HaloPesa', azampesa: 'AzamPesa', other: 'Nyingine',
};

export const DebtPaymentQR = ({ open, onOpenChange, customerName, customerPhone, amount, reference, notes }: DebtPaymentQRProps) => {
  const { user } = useAuth();
  const [nums, setNums] = useState<PayNum[]>([]);
  const [selected, setSelected] = useState<PayNum | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    supabase.from('owner_payment_numbers' as any)
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        const arr = (data as any[]) || [];
        setNums(arr);
        setSelected(arr[0] || null);
      });
  }, [open, user?.id]);

  const payload = selected ? JSON.stringify({
    v: 1,
    type: 'kiduka_debt_payment',
    network: selected.network,
    lipa_namba: selected.lipa_namba,
    account_name: selected.account_name,
    amount,
    customer: customerName,
    customer_phone: customerPhone || null,
    ref: reference,
    owner_id: user?.id,
    ts: Date.now(),
  }) : '';

  const captureShareCard = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    if (!shareCardRef.current) return null;
    const canvas = await html2canvas(shareCardRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
    return blob ? { blob, dataUrl: canvas.toDataURL('image/png') } : null;
  };

  const shareFile = async (file: File) => {
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: 'Kiduka Lipa Namba' });
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(file.type === 'application/pdf' ? 'PDF imepakuliwa' : 'Picha imepakuliwa');
  };

  const sharePaymentImage = async () => {
    if (!selected) return;
    setSharing(true);
    try {
      await new Promise(r => setTimeout(r, 250));
      const capture = await captureShareCard();
      if (!capture) throw new Error('Imeshindwa kutengeneza picha ya malipo');
      await shareFile(new File([capture.blob], `kiduka-malipo-${reference.slice(0, 8)}.png`, { type: 'image/png' }));
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error(e.message || 'Imeshindwa kushare picha');
    } finally {
      setSharing(false);
    }
  };

  const sharePaymentPdf = async () => {
    if (!selected) return;
    setSharing(true);
    try {
      await new Promise(r => setTimeout(r, 250));
      const capture = await captureShareCard();
      if (!capture) throw new Error('Imeshindwa kutengeneza PDF');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.addImage(capture.dataUrl, 'PNG', 22, 18, pageWidth - 44, 154);
      const blob = pdf.output('blob');
      await shareFile(new File([blob], `kiduka-malipo-${reference.slice(0, 8)}.pdf`, { type: 'application/pdf' }));
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error(e.message || 'Imeshindwa kushare PDF');
    } finally {
      setSharing(false);
    }
  };

  const copyPayload = async () => {
    if (!selected) return;
    const txt = `${NET_LABEL[selected.network] || selected.network} ${selected.lipa_namba} - TSh ${amount.toLocaleString()} (Ref ${reference.slice(0,8).toUpperCase()})`;
    await navigator.clipboard.writeText(txt);
    toast.success('Imenakiliwa');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>QR ya Malipo - {customerName}</DialogTitle>
        </DialogHeader>

        {nums.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm">Hujaweka Lipa Namba bado.</p>
            <Button onClick={() => { onOpenChange(false); window.location.href = '/lipa-namba'; }} className="rounded-full">
              Weka Lipa Namba
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {nums.map(n => (
                <Button key={n.id} size="sm" variant={selected?.id === n.id ? 'default' : 'outline'}
                  className="rounded-full text-xs h-7" onClick={() => setSelected(n)}>
                  {NET_LABEL[n.network] || n.network} {n.is_default && '★'}
                </Button>
              ))}
            </div>

            {selected && (
              <>
                <div className="bg-muted/40 rounded-2xl p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Mtandao</span><span className="font-medium">{NET_LABEL[selected.network]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lipa Namba</span><span className="font-bold">{selected.lipa_namba}</span></div>
                  {selected.account_name && <div className="flex justify-between"><span className="text-muted-foreground">Jina</span><span>{selected.account_name}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Kiasi</span><span className="font-bold text-primary">TSh {amount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Kumbukumbu</span><Badge variant="outline" className="font-mono text-[10px]">{reference.slice(0,8).toUpperCase()}</Badge></div>
                </div>

                <div ref={shareCardRef} className="bg-white rounded-3xl p-5 border border-border/50 text-neutral-900">
                  <div className="flex items-center justify-center mb-3">
                    <KidukaLogo size="md" showText={true} animate={false} />
                  </div>
                  <div className="rounded-2xl bg-primary text-primary-foreground text-center py-2 mb-3">
                    <p className="text-xs opacity-90">QR ya Malipo</p>
                    <p className="font-bold">{NET_LABEL[selected.network] || selected.network}</p>
                  </div>
                  <div className="flex justify-center bg-white rounded-2xl p-3 border border-border/50">
                    <QRCodeCanvas value={payload} size={236} level="M" includeMargin={false} />
                  </div>
                  <div className="mt-3 text-center space-y-1">
                    <p className="text-[10px] uppercase text-neutral-500">Lipa Namba</p>
                    <p className="font-mono font-black text-2xl">{selected.lipa_namba}</p>
                    {selected.account_name && <p className="text-sm font-semibold">{selected.account_name}</p>}
                    <p className="font-bold text-primary">TSh {amount.toLocaleString()}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">REF {reference.slice(0,8).toUpperCase()}</Badge>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Mteja akiscan QR hii, ataona maelezo ya malipo yake mahsusi (kiasi, kumbukumbu).
                </p>

                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={copyPayload}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Nakili
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={sharePaymentImage} disabled={sharing}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Picha
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={sharePaymentPdf} disabled={sharing}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                  <Button size="sm" className="rounded-full bg-green-600 hover:bg-green-700" onClick={sharePaymentImage} disabled={sharing}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
