import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Download, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

  const qrUrl = payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payload)}`
    : '';

  const sendWhatsApp = () => {
    if (!customerPhone) { toast.error('Hakuna namba ya simu ya mteja'); return; }
    if (!selected) return;
    const msg = `Habari ${customerName}, lipa deni TSh ${amount.toLocaleString()} kwa:\n` +
      `${NET_LABEL[selected.network] || selected.network}: *${selected.lipa_namba}*\n` +
      `${selected.account_name ? `Jina: ${selected.account_name}\n` : ''}` +
      `Kumbukumbu: ${reference.slice(0, 8).toUpperCase()}\n` +
      `${selected.instructions || ''}`;
    const phone = customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
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

                <div className="flex justify-center bg-white rounded-2xl p-3 border border-border/50">
                  <img src={qrUrl} alt="QR ya malipo" className="w-64 h-64" />
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Mteja akiscan QR hii, ataona maelezo ya malipo yake mahsusi (kiasi, kumbukumbu).
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={copyPayload}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Nakili
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" asChild>
                    <a href={qrUrl} download={`qr-${reference.slice(0,8)}.png`}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Pakua
                    </a>
                  </Button>
                  <Button size="sm" className="rounded-full bg-green-600 hover:bg-green-700" onClick={sendWhatsApp}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> WA
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
