import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  HelpCircle, Phone, Mail, MessageCircle, Send, 
  CheckCircle, Headphones
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface HelpSupportWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const HelpSupportWidget = ({ open, onClose }: HelpSupportWidgetProps) => {
  const { user, userProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const SUPPORT_PHONE = '+255 784 813 540';
  const SUPPORT_EMAIL = 'smartshoppos795@gmail.com';

  const handleSendHelpRequest = async () => {
    if (!message.trim()) {
      toast.error('Tafadhali andika ujumbe');
      return;
    }

    setSending(true);
    try {
      // Create admin notification for help request
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          notification_type: 'help_request',
          title: 'Ombi la Msaada',
          message: message,
          data: {
            user_id: user?.id,
            user_email: userProfile?.email || user?.email,
            user_name: userProfile?.full_name,
            business_name: userProfile?.business_name,
            phone: userProfile?.phone,
            requested_at: new Date().toISOString()
          }
        });

      if (error) throw error;

      setSent(true);
      toast.success('Ombi lako limetumwa kwa timu ya msaada');
    } catch (error) {
      console.error('Error sending help request:', error);
      toast.error('Imeshindwa kutuma ombi. Jaribu tena.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Msaada wa Kiduka
          </DialogTitle>
          <DialogDescription>
            Tupo hapa kukusaidia 24/7
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ombi Limetumwa!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Timu yetu itawasiliana nawe haraka iwezekanavyo.
            </p>
            <Button onClick={handleClose}>Funga</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contact Options */}
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => window.open(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`, '_self')}
              >
                <CardContent className="p-3 text-center">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="font-medium text-xs">Piga Simu</p>
                  <p className="text-[10px] text-muted-foreground">{SUPPORT_PHONE}</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
              >
                <CardContent className="p-3 text-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="font-medium text-xs">Tuma Email</p>
                  <p className="text-[10px] text-muted-foreground truncate">{SUPPORT_EMAIL}</p>
                </CardContent>
              </Card>
            </div>

            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => window.open(`https://wa.me/${SUPPORT_PHONE.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-[#25D366]" />
                </div>
                <div>
                  <p className="font-medium text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Tuandikie moja kwa moja</p>
                </div>
              </CardContent>
            </Card>

            {/* Message Form */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Au tuandikie hapa:</p>
              <Textarea
                placeholder="Eleza tatizo lako..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button 
                className="w-full mt-3"
                onClick={handleSendHelpRequest}
                disabled={sending || !message.trim()}
              >
                {sending ? (
                  <>Inatuma...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Tuma Ujumbe
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
