import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, Mail, MessageSquare, Headphones
} from 'lucide-react';
import { KidukaLogo } from './KidukaLogo';
import { ChatSupport } from './ChatSupport';

interface HelpSupportWidgetProps {
  open: boolean;
  onClose: () => void;
}

export const HelpSupportWidget = ({ open, onClose }: HelpSupportWidgetProps) => {
  const [chatOpen, setChatOpen] = useState(false);

  const SUPPORT_PHONE = '+255 784 813 540';
  const SUPPORT_EMAIL = 'smartshoppos795@gmail.com';

  return (
    <>
      <Dialog open={open && !chatOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          {/* Header matching subscription design */}
          <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6 text-center border-b border-border">
            <KidukaLogo size="sm" />
            <h2 className="text-lg font-bold mt-3 flex items-center justify-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Msaada wa Kiduka
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Tupo hapa kukusaidia 24/7</p>
          </div>

          <div className="p-6 space-y-3">
            {/* Live Chat - Primary */}
            <Card 
              className="cursor-pointer hover:bg-primary/5 transition-colors border-primary/30 rounded-2xl"
              onClick={() => { setChatOpen(true); }}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Zungumza na Msaada</p>
                  <p className="text-xs text-muted-foreground">Tuma ujumbe na upate msaada wa moja kwa moja</p>
                </div>
              </CardContent>
            </Card>

            {/* Phone */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-border rounded-2xl"
              onClick={() => window.open(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`, '_self')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Piga Simu</p>
                  <p className="text-xs text-muted-foreground">{SUPPORT_PHONE}</p>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card 
              className="cursor-pointer hover:bg-muted/50 transition-colors border-border rounded-2xl"
              onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Tuma Email</p>
                  <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ChatSupport open={chatOpen} onClose={() => { setChatOpen(false); onClose(); }} />
    </>
  );
};
