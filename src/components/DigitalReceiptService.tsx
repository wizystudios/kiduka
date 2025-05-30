
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, MessageSquare, Download, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export const DigitalReceiptService = ({ receiptData, onClose }: DigitalReceiptServiceProps) => {
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingMethod, setSendingMethod] = useState<'sms' | 'qr'>('sms');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const { toast } = useToast();

  const generateReceiptSummary = () => {
    const itemsList = receiptData.items.map(item => 
      `${item.name} x${item.quantity} = TZS ${item.total.toLocaleString()}`
    ).join('\n');
    
    return `
${receiptData.businessName}
Receipt: ${receiptData.transactionId}
Date: ${new Date().toLocaleDateString('sw-TZ')}

ITEMS:
${itemsList}

Subtotal: TZS ${receiptData.subtotal.toLocaleString()}
VAT (18%): TZS ${receiptData.vatAmount.toLocaleString()}
TOTAL: TZS ${receiptData.total.toLocaleString()}

Payment: ${receiptData.paymentData.method.toUpperCase()}
${receiptData.paymentData.provider ? `Provider: ${receiptData.paymentData.provider}` : ''}

Asante kwa Biashara Yako!
Powered by Kiduka POS
    `.trim();
  };

  const sendSMSReceipt = async () => {
    if (!customerPhone.trim()) {
      toast({
        title: 'Namba ya Simu Inahitajika',
        description: 'Tafadhali ingiza namba ya simu ya mteja',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: customerPhone,
          message: generateReceiptSummary(),
          transactionId: receiptData.transactionId
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Risiti Imetumwa!',
        description: `Risiti imetumwa kwa namba ${customerPhone}`,
      });

      console.log('SMS sent successfully:', data);
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma risiti kwa SMS. Hakikisha namba sahihi.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateQRCode = () => {
    const receiptUrl = `${window.location.origin}/receipt/${receiptData.transactionId}`;
    setQrCodeData(receiptUrl);
    
    // Generate QR code using a real QR service
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(receiptUrl)}`;
    
    toast({
      title: 'QR Code Imeundwa',
      description: 'Mteja anaweza kupiga picha QR code kupata risiti',
    });

    // Display the QR code
    const img = document.createElement('img');
    img.src = qrCodeUrl;
    img.style.width = '200px';
    img.style.height = '200px';
    img.style.margin = '20px auto';
    img.style.display = 'block';
    img.style.border = '2px solid #0284c7';
    img.style.borderRadius = '10px';
    
    const qrContainer = document.getElementById('qr-container');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      qrContainer.appendChild(img);
    }
  };

  const downloadReceipt = () => {
    const receiptContent = generateReceiptSummary();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData.transactionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Tuma Risiti kwa Mteja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={sendingMethod === 'sms' ? 'default' : 'outline'}
            onClick={() => setSendingMethod('sms')}
            className="flex items-center"
          >
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </Button>
          <Button
            variant={sendingMethod === 'qr' ? 'default' : 'outline'}
            onClick={() => setSendingMethod('qr')}
            className="flex items-center"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
        </div>

        {/* SMS Option */}
        {sendingMethod === 'sms' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone">Namba ya Simu ya Mteja</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="255xxxxxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <Button 
              onClick={sendSMSReceipt}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Inatuma...' : 'Tuma Risiti kwa SMS'}
            </Button>
          </div>
        )}

        {/* QR Code Option */}
        {sendingMethod === 'qr' && (
          <div className="space-y-3">
            <Button 
              onClick={generateQRCode}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Unda QR Code
            </Button>
            <div id="qr-container" className="text-center"></div>
            {qrCodeData && (
              <p className="text-sm text-gray-600 text-center">
                Mteja anaweza kupiga picha QR code ili kupata risiti
              </p>
            )}
          </div>
        )}

        {/* Additional Options */}
        <div className="border-t pt-3 space-y-2">
          <Button 
            onClick={downloadReceipt}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Pakua Risiti
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Funga
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
