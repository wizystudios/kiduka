import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { KidukaLogo } from '@/components/KidukaLogo';

interface ReceiptOrder {
  id: string;
  tracking_code: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_address: string;
  customer_phone: string;
  customer_name?: string;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number }>;
  seller_id: string;
  business_name?: string;
}

export default function ReceiptPrintPage() {
  const { trackingCode } = useParams();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const navigate = useNavigate();
  const [order, setOrder] = useState<ReceiptOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      if (!trackingCode) return;
      try {
        const { data, error } = await supabase.rpc('track_sokoni_order' as any, {
          p_phone: phone || '',
          p_tracking_code: trackingCode,
        });
        if (error) throw error;
        const rows = (data as any[]) || [];
        if (rows.length === 0) { setLoading(false); return; }
        const o = rows[0];
        let business_name: string | undefined;
        if (o.seller_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('business_name, full_name')
            .eq('id', o.seller_id)
            .maybeSingle();
          business_name = p?.business_name || p?.full_name || undefined;
        }
        setOrder({ ...o, business_name });
      } catch (e: any) {
        toast.error(e.message || 'Imeshindikana kupakia risiti');
      } finally {
        setLoading(false);
      }
    })();
  }, [trackingCode, phone]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !order) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`Risiti-${order.tracking_code}.pdf`);
      toast.success('Risiti imepakuliwa');
    } catch (e: any) {
      toast.error('Imeshindikana kupakua PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Risiti haijapatikana</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-full">
          <ArrowLeft className="h-4 w-4 mr-1" /> Rudi
        </Button>
      </div>
    );
  }

  const date = new Date(order.created_at);
  const trackUrl = `${window.location.origin}/track-order?code=${order.tracking_code}&phone=${order.customer_phone}`;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 print:bg-white print:p-0">
      {/* Action bar — hidden on print */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-4 w-4 mr-1" /> Rudi
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full">
            <Printer className="h-4 w-4 mr-1" /> Chapisha
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={downloading} className="rounded-full">
            {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Pakua PDF
          </Button>
        </div>
      </div>

      <Card ref={receiptRef} className="max-w-2xl mx-auto p-8 print:shadow-none print:border-0 rounded-3xl bg-white">
        <div className="flex items-start justify-between mb-6 pb-6 border-b">
          <div className="flex items-center gap-3">
            <KidukaLogo size="md" />
            <div>
              <h1 className="text-xl font-bold">{order.business_name || 'Biashara'}</h1>
              <p className="text-xs text-muted-foreground">Risiti ya Oda</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tracking</p>
            <p className="font-mono text-sm font-bold">{order.tracking_code}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Mteja</p>
            <p className="font-medium">{order.customer_name || '—'}</p>
            <p className="text-xs">{order.customer_phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Tarehe</p>
            <p className="font-medium">{date.toLocaleDateString('sw-TZ')}</p>
            <p className="text-xs">{date.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Anwani ya kupokea</p>
            <p className="text-sm">{order.delivery_address}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-xs text-muted-foreground font-medium">Bidhaa</th>
              <th className="text-center py-2 text-xs text-muted-foreground font-medium">Idadi</th>
              <th className="text-right py-2 text-xs text-muted-foreground font-medium">Bei</th>
              <th className="text-right py-2 text-xs text-muted-foreground font-medium">Jumla</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{it.product_name}</td>
                <td className="text-center py-2">{it.quantity}</td>
                <td className="text-right py-2">{Number(it.unit_price).toLocaleString()}</td>
                <td className="text-right py-2 font-medium">
                  {(Number(it.quantity) * Number(it.unit_price)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right font-semibold">JUMLA</td>
              <td className="pt-3 text-right font-bold text-lg">
                TSh {Number(order.total_amount).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="flex items-end justify-between pt-6 border-t">
          <div className="space-y-1 text-xs">
            <p><span className="text-muted-foreground">Malipo:</span> <span className="font-medium uppercase">{order.payment_method}</span></p>
            <p><span className="text-muted-foreground">Hali:</span> <span className="font-medium uppercase">{order.payment_status}</span></p>
            <p><span className="text-muted-foreground">Oda:</span> <span className="font-medium uppercase">{order.order_status}</span></p>
          </div>
          <div className="text-center">
            <QRCodeSVG value={trackUrl} size={88} level="M" />
            <p className="text-[10px] text-muted-foreground mt-1">Scan kufuatilia</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">
          Asante kwa kununua. Powered by Kiduka
        </p>
      </Card>
    </div>
  );
}
