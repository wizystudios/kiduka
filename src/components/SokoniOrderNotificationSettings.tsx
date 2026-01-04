import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, MessageSquare, Phone, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'sokoni_notification_settings';

export interface SokoniNotificationSettings {
  enabled: boolean;
  method: 'toast' | 'sms' | 'whatsapp';
  phone: string;
}

const DEFAULT_SETTINGS: SokoniNotificationSettings = {
  enabled: true,
  method: 'toast',
  phone: ''
};

export const getSokoniNotificationSettings = (): SokoniNotificationSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSokoniNotificationSettings = (settings: SokoniNotificationSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
};

export const SokoniOrderNotificationSettings = () => {
  const [settings, setSettings] = useState<SokoniNotificationSettings>(getSokoniNotificationSettings);

  const handleSave = () => {
    // Validate phone if SMS or WhatsApp selected
    if ((settings.method === 'sms' || settings.method === 'whatsapp') && !settings.phone) {
      toast.error('Ingiza namba ya simu kwa kupokea arifa');
      return;
    }

    saveSokoniNotificationSettings(settings);
    toast.success('Mipangilio imehifadhiwa!');
  };

  const handleMethodChange = (method: string) => {
    setSettings(prev => ({ ...prev, method: method as 'toast' | 'sms' | 'whatsapp' }));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Mipangilio ya Arifa za Oda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled" className="text-sm">Arifa za Oda Mpya</Label>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Notification Method */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Njia ya Kupokea Arifa</Label>
              <RadioGroup
                value={settings.method}
                onValueChange={handleMethodChange}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded-md p-2">
                  <RadioGroupItem value="toast" id="toast" />
                  <Label htmlFor="toast" className="text-xs flex items-center gap-1 cursor-pointer">
                    <Bell className="h-3 w-3" />
                    Toast
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-2">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms" className="text-xs flex items-center gap-1 cursor-pointer">
                    <Phone className="h-3 w-3" />
                    SMS
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-2">
                  <RadioGroupItem value="whatsapp" id="whatsapp" />
                  <Label htmlFor="whatsapp" className="text-xs flex items-center gap-1 cursor-pointer">
                    <MessageSquare className="h-3 w-3" />
                    WhatsApp
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Phone Number (for SMS/WhatsApp) */}
            {(settings.method === 'sms' || settings.method === 'whatsapp') && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Namba ya Simu</Label>
                <Input
                  id="phone"
                  placeholder="0712 345 678"
                  value={settings.phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {settings.method === 'sms' 
                    ? 'Utapokea SMS kila oda mpya inapoingia'
                    : 'Utapokea ujumbe wa WhatsApp kila oda mpya inapoingia'
                  }
                </p>
                <p className="text-xs text-amber-600">
                  ⚠️ {settings.method === 'sms' ? 'SMS' : 'WhatsApp'} inahitaji API key. Sasa hivi inaonyesha toast tu.
                </p>
              </div>
            )}
          </>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Hifadhi Mipangilio
        </Button>
      </CardContent>
    </Card>
  );
};
