import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Fingerprint, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORE_KEY = 'kiduka_quick_login';

interface QuickConfig {
  email: string;
  salt: string;
  iv: string;
  ct: string;
  bio?: { credentialId: string; secret: string; iv: string; ct: string };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const deriveKey = async (secret: string, salt: Uint8Array) => {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 150_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptWith = async (secret: string, salt: Uint8Array, plain: string) => {
  const key = await deriveKey(secret, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return { iv: toB64(iv), ct: toB64(ct) };
};

const decryptWith = async (secret: string, salt: Uint8Array, ivB64: string, ctB64: string) => {
  const key = await deriveKey(secret, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivB64) as unknown as BufferSource },
    key,
    fromB64(ctB64) as unknown as BufferSource
  );
  return dec.decode(plain);
};

const readConfig = (): QuickConfig | null => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as QuickConfig) : null;
  } catch {
    return null;
  }
};

export const QuickSignIn = () => {
  const [config, setConfig] = useState<QuickConfig | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  // setup fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBio, setEnableBio] = useState(true);

  // unlock field
  const [unlockPin, setUnlockPin] = useState('');

  useEffect(() => {
    setConfig(readConfig());
    (async () => {
      try {
        const ok =
          typeof window !== 'undefined' &&
          !!window.PublicKeyCredential &&
          (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
        setBioAvailable(!!ok);
      } catch {
        setBioAvailable(false);
      }
    })();
  }, []);

  const finishSignIn = async (mail: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass });
    if (error) throw new Error('Taarifa zimebadilika. Ingia kwa nywila kisha weka upya kuingia haraka.');
    toast.success('Karibu tena!');
    window.location.href = '/dashboard';
  };

  const registerBiometric = async (mail: string) => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Kiduka', id: window.location.hostname },
        user: { id: userId, name: mail, displayName: mail },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!cred) throw new Error('bio_failed');
    return toB64(cred.rawId);
  };

  const handleSetup = async () => {
    if (!email.trim() || !password) {
      toast.error('Jaza barua pepe na nywila');
      return;
    }
    if (pin.length < 4) {
      toast.error('PIN lazima iwe angalau tarakimu 4');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('PIN hazifanani');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error('Barua pepe au nywila si sahihi');

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const pinPart = await encryptWith(pin, salt, password);
      const next: QuickConfig = { email: email.trim(), salt: toB64(salt), iv: pinPart.iv, ct: pinPart.ct };

      if (enableBio && bioAvailable) {
        try {
          const credentialId = await registerBiometric(email.trim());
          const bioSecret = toB64(crypto.getRandomValues(new Uint8Array(32)));
          const bioPart = await encryptWith(bioSecret, salt, password);
          next.bio = { credentialId, secret: bioSecret, iv: bioPart.iv, ct: bioPart.ct };
        } catch {
          toast.message('Alama ya kidole haikuwekwa, lakini PIN imewekwa.');
        }
      }

      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      setConfig(next);
      setSetupOpen(false);
      toast.success('Kuingia haraka kumewekwa');
      window.location.href = '/dashboard';
    } catch (e: any) {
      toast.error(e.message || 'Imeshindikana kuweka kuingia haraka');
    } finally {
      setBusy(false);
    }
  };

  const handlePinUnlock = async () => {
    if (!config) return;
    setBusy(true);
    try {
      const password = await decryptWith(unlockPin, fromB64(config.salt), config.iv, config.ct).catch(() => null);
      if (!password) throw new Error('PIN si sahihi');
      await finishSignIn(config.email, password);
    } catch (e: any) {
      toast.error(e.message || 'PIN si sahihi');
    } finally {
      setBusy(false);
      setUnlockPin('');
    }
  };

  const handleBioUnlock = async () => {
    if (!config?.bio) return;
    setBusy(true);
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ id: fromB64(config.bio.credentialId), type: 'public-key' }],
          userVerification: 'required',
          timeout: 60_000,
          rpId: window.location.hostname,
        },
      });
      if (!assertion) throw new Error('Alama ya kidole haikuthibitishwa');
      const password = await decryptWith(config.bio.secret, fromB64(config.salt), config.bio.iv, config.bio.ct);
      await finishSignIn(config.email, password);
    } catch (e: any) {
      toast.error(e.message || 'Alama ya kidole haikuthibitishwa');
    } finally {
      setBusy(false);
    }
  };

  const forget = () => {
    localStorage.removeItem(STORE_KEY);
    setConfig(null);
    toast.success('Kuingia haraka kumeondolewa kwenye kifaa hiki');
  };

  return (
    <>
      {config ? (
        <div className="w-full space-y-2.5">
          <div className="rounded-3xl border bg-background/70 backdrop-blur px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Kuingia haraka</p>
            <p className="text-sm font-semibold truncate">{config.email}</p>
          </div>
          {config.bio && (
            <Button className="h-12 w-full rounded-full text-base font-semibold" disabled={busy} onClick={handleBioUnlock}>
              {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Fingerprint className="h-5 w-5 mr-2" />}
              Ingia kwa alama ya kidole
            </Button>
          )}
          <Button
            variant="outline"
            className="h-12 w-full rounded-full text-base font-semibold"
            onClick={() => setPinOpen(true)}
          >
            <KeyRound className="h-5 w-5 mr-2" /> Ingia kwa PIN
          </Button>
          <button onClick={forget} className="mx-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <Trash2 className="h-3 w-3" /> Ondoa kuingia haraka
          </button>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="h-12 w-full rounded-full text-base font-semibold"
          onClick={() => setSetupOpen(true)}
        >
          <Fingerprint className="h-5 w-5 mr-2" /> Weka PIN / Alama ya kidole
        </Button>
      )}

      <Sheet open={pinOpen} onOpenChange={setPinOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Ingiza PIN</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              placeholder="PIN yako"
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              className="rounded-2xl h-12 text-center text-lg tracking-[0.4em]"
            />
            <Button className="w-full rounded-full h-11" disabled={busy || unlockPin.length < 4} onClick={handlePinUnlock}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Ingia
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Kuingia Haraka</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Thibitisha akaunti yako mara moja, kisha utaingia kwa PIN au alama ya kidole kwenye kifaa hiki.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Barua pepe</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="rounded-2xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nywila</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rounded-2xl h-11" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">PIN mpya</Label>
                <Input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" className="rounded-2xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thibitisha PIN</Label>
                <Input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} type="password" inputMode="numeric" className="rounded-2xl h-11" />
              </div>
            </div>
            {bioAvailable && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enableBio} onChange={(e) => setEnableBio(e.target.checked)} />
                Washa alama ya kidole kwenye kifaa hiki
              </label>
            )}
            <Button className="w-full rounded-full h-11" disabled={busy} onClick={handleSetup}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Hifadhi na Ingia
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QuickSignIn;
