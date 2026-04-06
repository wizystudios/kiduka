import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileSignature, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useBusinessGovernance } from '@/hooks/useBusinessGovernance';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const CONTRACT_PAGES = [
  {
    title: 'Utangulizi',
    content: [
      'Kiduka ni mfumo wa usimamizi wa biashara unaowezesha bidhaa, mauzo, stoku, ripoti na huduma za biashara kuendeshwa sehemu moja.',
      'Sokoni ni sehemu ya kuuza bidhaa mtandaoni iliyounganishwa na mfumo huu kwa biashara zinazohitaji wateja wa ziada.',
    ],
  },
  {
    title: 'Matumizi ya Mfumo',
    content: [
      'Mmiliki wa biashara anawajibika kuweka taarifa sahihi na kutumia mfumo kwa kufuata sheria za biashara za Tanzania.',
      'Ni marufuku kutumia mfumo kwa udanganyifu, biashara haramu, au shughuli zinazoathiri usalama wa watumiaji wengine.',
    ],
  },
  {
    title: 'Usalama na Faragha',
    content: [
      'Data ya biashara inalindwa na mfumo, lakini mmiliki anapaswa kulinda nywila na ruhusa za watumiaji wake.',
      'Admin anaweza kuomba ruhusa ya kusaidia akaunti; ruhusa hiyo lazima ikubaliwe na mmiliki wa biashara kabla ya kuendelea.',
    ],
  },
  {
    title: 'Ada na Makubaliano',
    content: [
      'Huduma za kulipia, matawi, matangazo, na vipengele maalum vinaweza kuwa na ada kulingana na mpango wa biashara.',
      'Kwa kusaini, unathibitisha kuwa umesoma mkataba wote, unakubali masharti, na taarifa za biashara ulizoingiza ni sahihi.',
    ],
  },
];

export const BusinessRegistrationPanel = () => {
  const { userProfile } = useAuth();
  const { loading, contract, compliance, status, saveCompliance, saveContract } = useBusinessGovernance();

  const [form, setForm] = useState({ tin_number: '', nida_number: '', business_license: '' });
  const [fullLegalName, setFullLegalName] = useState('');
  const [agree, setAgree] = useState(false);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [signing, setSigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [signatureData, setSignatureData] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    setForm({
      tin_number: compliance?.tin_number || '',
      nida_number: compliance?.nida_number || '',
      business_license: compliance?.business_license || '',
    });
  }, [compliance?.tin_number, compliance?.nida_number, compliance?.business_license]);

  useEffect(() => {
    setFullLegalName(contract?.full_legal_name || userProfile?.full_name || '');
  }, [contract?.full_legal_name, userProfile?.full_name]);

  const startDraw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (x: number, y: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(x, y);
    ctx.stroke();
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSaveCompliance = async () => {
    setSavingCompliance(true);
    const result = await saveCompliance(form);
    setSavingCompliance(false);
    if (!result.success) {
      toast.error('Imeshindikana kuhifadhi taarifa za sheria');
      return;
    }
    toast.success('Taarifa za sheria zimehifadhiwa');
  };

  const handleSignContract = async () => {
    if (!fullLegalName.trim()) {
      toast.error('Jaza jina kamili la kisheria');
      return;
    }
    if (!signatureData) {
      toast.error('Weka sahihi yako');
      return;
    }
    if (!agree) {
      toast.error('Kubali masharti kabla ya kusaini');
      return;
    }

    setSigning(true);
    const result = await saveContract({ fullLegalName: fullLegalName.trim(), signatureData, agree: true });
    setSigning(false);

    if (!result.success) {
      toast.error('Imeshindikana kusaini mkataba');
      return;
    }
    toast.success('Mkataba umesainiwa');
  };

  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (status.missingComplianceFields.tin) items.push('TIN');
    if (status.missingComplianceFields.nida) items.push('NIDA');
    if (status.missingComplianceFields.license) items.push('Leseni');
    if (!status.contractSigned) items.push('Mkataba');
    return items;
  }, [status]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Inapakia taarifa za sheria...</div>;
  }

  const currentContractPage = CONTRACT_PAGES[currentPage];
  const isLastPage = currentPage === CONTRACT_PAGES.length - 1;

  return (
    <div className="space-y-4 p-4 pb-24 md:pb-6">
      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.complianceMissing ? 'destructive' : 'secondary'}>
                {status.complianceMissing ? 'Sheria hazijakamilika' : 'Sheria zimekamilika'}
              </Badge>
              <Badge variant={status.contractSigned ? 'secondary' : 'outline'}>
                {status.contractSigned ? 'Mkataba umesainiwa' : 'Mkataba unasubiri sahihi'}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">Usajili wa Biashara</h2>
            <p className="text-sm text-muted-foreground">
              {missingItems.length > 0 ? `Bado unahitaji: ${missingItems.join(', ')}` : 'Biashara yako imekamilisha usajili wa sheria na mkataba.'}
            </p>
          </div>
          {(status.complianceBlocked || status.contractOverdue) && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Hatua za sheria zinahitaji kukamilishwa sasa.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Taarifa za Sheria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {compliance?.notes && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {compliance.notes}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">TIN Number</Label>
              <Input value={form.tin_number} onChange={(e) => setForm((prev) => ({ ...prev, tin_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">NIDA Number</Label>
              <Input value={form.nida_number} onChange={(e) => setForm((prev) => ({ ...prev, nida_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Leseni ya Biashara</Label>
              <Input value={form.business_license} onChange={(e) => setForm((prev) => ({ ...prev, business_license: e.target.value }))} />
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <p>Muda wa mwisho: {compliance?.required_after ? new Date(compliance.required_after).toLocaleDateString('sw-TZ') : 'Leo'}</p>
              <p>Hali: {status.complianceBlocked ? 'Imezuiwa' : status.complianceMissing ? 'Inasubiri' : 'Kamili'}</p>
            </div>

            <Button className="w-full rounded-2xl" onClick={handleSaveCompliance} disabled={savingCompliance}>
              {savingCompliance ? 'Inahifadhi...' : 'Hifadhi Taarifa za Sheria'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-4 w-4 text-primary" />
              Mkataba wa Biashara
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract?.admin_notes && (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
                {contract.admin_notes}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Ukurasa {currentPage + 1}/{CONTRACT_PAGES.length}</span>
              {contract?.required_by && <span>• Mwisho: {new Date(contract.required_by).toLocaleDateString('sw-TZ')}</span>}
              {contract?.signed_at && <span>• Imesainiwa: {new Date(contract.signed_at).toLocaleDateString('sw-TZ')}</span>}
            </div>

            <div className="rounded-3xl border border-border/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold">{currentContractPage.title}</h3>
                {status.contractSigned && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                {currentContractPage.content.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))} disabled={currentPage === 0}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Nyuma
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => setCurrentPage((prev) => Math.min(CONTRACT_PAGES.length - 1, prev + 1))} disabled={isLastPage}>
                  Endelea <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <p className="font-medium">Sahihi ya Mkataba</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Jina kamili la kisheria</Label>
                  <Input value={fullLegalName} onChange={(e) => setFullLegalName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Sahihi</Label>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full rounded-2xl border border-border bg-background touch-none"
                    onMouseDown={(e) => startDraw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                    onMouseMove={(e) => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                      startDraw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                      draw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
                    }}
                    onTouchEnd={stopDraw}
                  />
                  <Button variant="outline" className="rounded-2xl" onClick={clearSignature}>Futa Sahihi</Button>
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <input checked={agree} onChange={(e) => setAgree(e.target.checked)} type="checkbox" className="mt-1" />
                  Nimesoma mkataba wote na nakubali masharti yake.
                </label>

                <Button className="w-full rounded-2xl" onClick={handleSignContract} disabled={signing || status.contractSigned}>
                  {status.contractSigned ? 'Mkataba Umeshasainiwa' : signing ? 'Inasaini...' : 'Saini Mkataba'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
