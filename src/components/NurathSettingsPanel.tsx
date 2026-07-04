import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const KEY = 'kiduka_nurath_globally_enabled';

export const NurathSettingsPanel = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, enabled ? '1' : '0');
      window.dispatchEvent(new Event('kiduka:nurath-toggle'));
    } catch {}
  }, [enabled]);

  const onToggle = (v: boolean) => {
    setEnabled(v);
    toast.success(v ? 'Nurath imewashwa' : 'Nurath imezimwa');
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="rounded-3xl">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-sm">Nurath AI</h3>
              <Switch checked={enabled} onCheckedChange={onToggle} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Msaidizi wa sauti wa Kiduka. Ukiwasha, utaona kishikizo cha Nurath kwenye kurasa zote na
              utaweza kutumia amri za sauti (mfano: “Nurath, fungua mauzo”). Kimezimwa kwa default.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NurathSettingsPanel;
