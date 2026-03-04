import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Phone, Mail, Send, CheckCircle, Headphones, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { KidukaLogo } from './KidukaLogo';

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
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Header with gradient matching subscription page */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 text-center border-b border-border">
          <KidukaLogo size="sm" />
          <h2 className="text-lg font-bold mt-3 flex items-center justify-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Msaada wa Kiduka
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Tupo hapa kukusaidia 24/7</p>
        </div>

        {sent ? (
          <div className="text-center py-10 px-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ombi Limetumwa!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Timu yetu itawasiliana nawe haraka iwezekanavyo.
            </p>
            <Button onClick={handleClose} className="rounded-2xl">Funga</Button>
          </div>
        ) : (
          <div className="p-6">
            {/* Split contact cards */}
            <div className="flex gap-3 mb-6">
              <Card 
                className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 rounded-2xl"
                onClick={() => window.open(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`, '_self')}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Piga Simu</p>
                  <p className="text-xs text-muted-foreground mt-1">{SUPPORT_PHONE}</p>
                </CardContent>
              </Card>

              <Card 
                className="flex-1 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 rounded-2xl"
                onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Tuma Email</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{SUPPORT_EMAIL}</p>
                </CardContent>
              </Card>
            </div>

            {/* Divider with icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                au tuandikie
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Message Form */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Ujumbe wako</Label>
              <Textarea
                placeholder="Eleza tatizo lako hapa..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none rounded-2xl"
              />
              <Button 
                className="w-full rounded-2xl h-11"
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
