import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Mail, MessageSquare, Phone, Share2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { KidukaLogo } from '@/components/KidukaLogo';
import { captureElementAsImage, createPdfFromImage, shareOrDownloadFile, type ExportType } from '@/utils/shareExport';

interface ReceiptData {
  transactionId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentData: {
    method: string;
    provider?: string;
    phoneNumber?: string;
  };
  businessName: string;
  customerName?: string;
}

interface DigitalReceiptServiceProps {
  receiptData: ReceiptData;
  onClose: () => void;
}

type ShareTarget = 'whatsapp' | 'email' | 'download';

export const DigitalReceiptService = ({ receiptData, onClose }: DigitalReceiptServiceProps) => {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [format, setFormat] = useState<ExportType>('image');
  const [shareTarget, setShareTarget] = useState<ShareTarget>('whatsapp');
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<{ dataUrl: string; file: File; type: ExportType; target: ShareTarget } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const receiptNo = receiptData.transactionId.slice(0, 8).toUpperCase();
  const receiptDate = new Date().toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' });

  const makeFile = async (type: ExportType) => {
    if (!receiptRef.current) throw new Error('Risiti haijawa tayari');
    const capture = await captureElementAsImage(receiptRef.current);
    if (type === 'pdf') {
      return { capture, file: createPdfFromImage(capture, `kiduka-risiti-${receiptNo}.pdf`) };
    }
    return {
      capture,
      file: new File([capture.blob], `kiduka-risiti-${receiptNo}.png`, { type: 'image/png' }),
    };
  };

  const preparePreview = async (target: ShareTarget) => {
    setShareTarget(target);
    setProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 120));
      const { capture, file } = await makeFile(format);
      setPreview({ dataUrl: capture.dataUrl, file, type: format, target });
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message || 'Imeshindwa kuandaa risiti', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const confirmShare = async () => {
    if (!preview) return;
    setProcessing(true);
    try {
      if (preview.target === 'email' && customerEmail.trim() && !navigator.share) {
        window.location.href = `mailto:${customerEmail.trim()}?subject=${encodeURIComponent(`Risiti ${receiptNo}`)}&body=${encodeURIComponent('Nimepakua risiti kama faili. Tafadhali ambatisha faili lililopakuliwa ikiwa app yako haikuruhusu kushare moja kwa moja.')}`;
      }
      const result = await shareOrDownloadFile(preview.file, `Risiti ${receiptNo} - ${receiptData.businessName}`);
      if (result === 'downloaded') {
        toast({ title: preview.type === 'pdf' ? 'PDF imepakuliwa' : 'Picha imepakuliwa', description: 'Faili halisi la risiti liko tayari kutumwa.' });
      }
      setPreview(null);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        toast({ title: 'Hitilafu', description: e.message || 'Imeshindwa kutuma risiti', variant: 'destructive' });
      }
    } finally {
      setProcessing(false);
    }
  };

  const downloadNow = async () => {
    setProcessing(true);
    try {
      const { file } = await makeFile(format);
      await shareOrDownloadFile(file, `Risiti ${receiptNo} - ${receiptData.businessName}`);
    } catch (e: any) {
      toast({ title: 'Hitilafu', description: e.message || 'Imeshindwa kupakua', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">Tuma Risiti</h1>
          <p className="text-xs text-muted-foreground">Preview kwanza, kisha tuma kama picha au PDF</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mx-auto max-w-md space-y-4 p-4 pb-10">
        <div
          ref={receiptRef}
          className="mx-auto overflow-hidden rounded-3xl border bg-white shadow-sm"
          style={{ width: 360, maxWidth: '100%', color: '#111827' }}
        >
          <div className="p-5">
            <div className="flex items-center justify-center gap-2 border-b pb-4 text-center">
              <KidukaLogo size="md" showText={false} animate={false} />
              <div className="text-left leading-tight">
                <p className="max-w-[230px] truncate text-[16px] font-black text-neutral-900">{receiptData.businessName}</p>
                <p className="text-[10px] font-semibold uppercase text-neutral-500">Risiti ya Mauzo · Kiduka</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 text-xs">
              <div>
                <p className="text-neutral-500">Risiti</p>
                <p className="font-mono font-bold text-neutral-900">#{receiptNo}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500">Tarehe</p>
                <p className="font-semibold text-neutral-900">{receiptDate}</p>
              </div>
              <div>
                <p className="text-neutral-500">Malipo</p>
                <p className="font-semibold uppercase text-neutral-900">{receiptData.paymentData.method}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500">Bidhaa</p>
                <p className="font-semibold text-neutral-900">{receiptData.items.length}</p>
              </div>
            </div>

            <div className="divide-y border-y">
              {receiptData.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.quantity} × TSh {item.price.toLocaleString()}</p>
                  </div>
                  <p className="whitespace-nowrap font-bold text-neutral-900">TSh {item.total.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 py-4 text-sm">
              <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>TSh {receiptData.subtotal.toLocaleString()}</span></div>
              {receiptData.vatAmount > 0 && (
                <div className="flex justify-between text-neutral-600"><span>Kodi</span><span>TSh {receiptData.vatAmount.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between border-t pt-3 text-lg font-black text-neutral-900">
                <span>JUMLA</span><span>TSh {receiptData.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 p-3 text-center text-[11px] text-neutral-600">
              Asante kwa biashara yako · Powered by Kiduka
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={format === 'image' ? 'default' : 'outline'} className="rounded-full" onClick={() => setFormat('image')}>
            Picha
          </Button>
          <Button variant={format === 'pdf' ? 'default' : 'outline'} className="rounded-full" onClick={() => setFormat('pdf')}>
            PDF
          </Button>
        </div>

        <div className="space-y-3 rounded-3xl border bg-card p-4">
          <div className="space-y-2">
            <Label className="text-xs">Simu ya mteja (WhatsApp / mobile share)</Label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0754xxxxxx" className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Email ya mteja</Label>
            <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="mteja@example.com" className="rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="rounded-2xl" disabled={processing} onClick={() => preparePreview('whatsapp')}>
              <MessageSquare className="mr-1 h-4 w-4" /> WhatsApp
            </Button>
            <Button variant="outline" className="rounded-2xl" disabled={processing} onClick={() => preparePreview('email')}>
              <Mail className="mr-1 h-4 w-4" /> Email
            </Button>
          </div>
          <Button variant="outline" className="w-full rounded-2xl" disabled={processing} onClick={downloadNow}>
            <Download className="mr-1 h-4 w-4" /> Pakua faili
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            WhatsApp na Email zitatumia share sheet ya kifaa kutuma faili halisi; si maandishi tu.
          </p>
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-4">
          <DialogHeader>
            <DialogTitle>Hakiki risiti kabla ya kutuma</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="rounded-3xl border bg-muted/30 p-2">
                <img src={preview.dataUrl} alt="Preview ya risiti yenye logo na jina la biashara" className="w-full rounded-2xl bg-white object-contain" />
              </div>
              <Badge variant="secondary" className="rounded-full">
                {preview.type === 'pdf' ? <FileText className="mr-1 h-3 w-3" /> : <Phone className="mr-1 h-3 w-3" />}
                {preview.type === 'pdf' ? 'PDF halisi' : 'Picha halisi'} · {preview.target === 'email' ? 'Email' : preview.target === 'whatsapp' ? 'WhatsApp' : 'Download'}
              </Badge>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setPreview(null)} disabled={processing}>Rudi</Button>
                <Button className="rounded-full" onClick={confirmShare} disabled={processing}>
                  <Share2 className="mr-1 h-4 w-4" /> Tuma
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};