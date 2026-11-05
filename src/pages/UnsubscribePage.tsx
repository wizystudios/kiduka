import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail } from 'lucide-react';

// Unsubscribe is now hosted by the email service itself: every email carries
// its own one-click unsubscribe link. Old links land here with guidance.
export default function UnsubscribePage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <KidukaLogo />
          <p className="text-xs text-muted-foreground">Mipangilio ya Email</p>
        </div>
        <div className="space-y-3 py-4">
          <Mail className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Link hii imebadilishwa</h1>
          <p className="text-sm text-muted-foreground">
            Kuacha kupokea email, fungua email ya hivi karibuni kutoka Kiduka na ubonyeze link ya kujiondoa
            iliyo chini kabisa. Unaweza pia kuzima email ndani ya Mipangilio ya app.
          </p>
        </div>
      </div>
    </div>
  );
}
