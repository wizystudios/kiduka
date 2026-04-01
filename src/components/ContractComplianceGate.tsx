import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileSignature, ShieldAlert, Check, ArrowRight, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessGovernance } from '@/hooks/useBusinessGovernance';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { KidukaLogo } from './KidukaLogo';
import { useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContractComplianceGateProps {
  children: React.ReactNode;
}

const CONTRACT_PAGES = [
  {
    title: 'Utangulizi wa Mfumo',
    content: [
      { heading: '1.1 Kiduka ni Nini?', body: 'Kiduka ni mfumo wa kisasa wa usimamizi wa biashara (POS - Point of Sale) ulioundwa kwa ajili ya wajasiriamali na wamiliki wa maduka ya rejareja nchini Tanzania na Afrika Mashariki. Mfumo huu unawezesha usimamizi kamili wa bidhaa, mauzo, stock, wateja, mikopo, ripoti za biashara, na zaidi — yote katika programu moja.' },
      { heading: '1.2 Sokoni ni Nini?', body: 'Sokoni ni soko la mtandaoni (online marketplace) lililounganishwa na Kiduka ambalo linawezesha wamiliki wa biashara kuuza bidhaa zao moja kwa moja kwa wateja wapya kupitia mtandao. Wateja wanaweza kutafuta bidhaa, kuagiza, kufuatilia oda, na kulipa kupitia simu.' },
      { heading: '1.3 Kwa Nini Tunavyo?', body: 'Lengo letu ni kuwawezesha wajasiriamali wadogo na wa kati (SMEs) kusimamia biashara zao kwa ufanisi, kupunguza gharama, kuongeza mauzo, na kufikia wateja zaidi kupitia teknolojia ya kisasa na rahisi kutumia.' },
    ]
  },
  {
    title: 'Sera na Masharti',
    content: [
      { heading: '2.1 Sera ya Biashara', body: 'Mtumiaji anakubali kutumia mfumo wa Kiduka kwa mujibu wa sheria za biashara za Tanzania. Data yote ya biashara ni milki ya mmiliki lakini inalindwa na mfumo wetu.' },
      { heading: '2.2 Sera ya IT na Usalama', body: 'Data yako inalindwa kwa encryption na kuhifadhiwa kwenye seva salama. Usisambaze nenosiri lako kwa mtu yeyote. Mfumo unaweza kufanya backup otomatiki ya data yako.' },
      { heading: '2.3 Masharti ya Matumizi', body: 'Ni marufuku kutumia mfumo kwa biashara haramu, udanganyifu, au ukiukaji wa sheria. Mtumiaji anawajibika kuhakikisha data iliyoingizwa ni sahihi. Mfumo unaweza kusimamishwa kwa muda ikiwa masharti yamekiukwa.' },
      { heading: '2.4 Wajibu wa Msaidizi', body: 'Msaidizi anawajibika kutumia mfumo kwa uaminifu, kulinda siri za biashara ya mmiliki, na kufuata maelekezo ya mmiliki. Matumizi yasiyofaa yanaweza kusababisha kufutwa kwa akaunti.' },
    ]
  },
  {
    title: 'Makubaliano',
    content: [
      { heading: '3.1 Haki za Admin', body: 'Msimamizi Mkuu (Super Admin) ana haki ya: kuingia kwenye akaunti yoyote kwa ukaguzi, kuhariri mkataba wowote, kuzuia akaunti zinazokiuka masharti, na kuomba taarifa za compliance. Mtumiaji ataarifiwa kila wakati admin anapofanya mabadiliko.' },
      { heading: '3.2 Makubaliano', body: 'Kwa kukubali masharti haya, mtumiaji anakubali masharti yote yaliyoelezwa hapo juu na anaahidi kuyafuata kwa uaminifu.' },
    ]
  },
];

// Simplified T&C for assistants
const ASSISTANT_TC = [
  'Kutumia mfumo kwa uaminifu na kufuata maelekezo ya mmiliki wa biashara.',
  'Kulinda siri za biashara na kutoshiriki taarifa za biashara na mtu mwingine.',
  'Kutotumia mfumo kwa biashara haramu au udanganyifu.',
  'Kukubali kuwa Admin ana haki ya kuingia kwenye akaunti yako kwa ukaguzi.',
  'Kukubali kuwa akaunti yako inaweza kufutwa ikiwa masharti yamekiukwa.',
];

export const ContractComplianceGate = ({ children }: ContractComplianceGateProps) => {
  const { user, userProfile } = useAuth();
  const { loading, status, saveContract, activeAdminSession } = useBusinessGovernance();
  const navigate = useNavigate();
  const [fullLegalName, setFullLegalName] = useState(userProfile?.full_name || '');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  // Assistant T&C state
  const [assistantTcAccepted, setAssistantTcAccepted] = useState<boolean | null>(null);
  const [assistantTcLoading, setAssistantTcLoading] = useState(true);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAssistant = userProfile?.role === 'assistant';
  const isOwner = userProfile?.role === 'owner';

  // Check if assistant has accepted T&C (stored in user_activities)
  useEffect(() => {
    const checkAssistantTc = async () => {
      if (!isAssistant || !user?.id) {
        setAssistantTcLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('activity_type', 'accepted_terms_and_conditions')
        .limit(1);
      
      setAssistantTcAccepted((data?.length || 0) > 0);
      setAssistantTcLoading(false);
    };
    checkAssistantTc();
  }, [isAssistant, user?.id]);

  const handleAssistantAcceptTc = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    await supabase.from('user_activities').insert({
      user_id: user.id,
      activity_type: 'accepted_terms_and_conditions',
      description: 'Msaidizi amekubali masharti ya matumizi',
    });
    setAssistantTcAccepted(true);
    setSubmitting(false);
    toast.success('Masharti yamekubaliwa. Karibu!');
  };

  // Only owners see contract/compliance blocks
  const showContractBlock = isOwner && !status.contractSigned && (!status.canReviewLater || status.contractOverdue);
  const showComplianceBlock = isOwner && status.complianceBlocked;

  const startDraw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (x: number, y: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(x, y);
    ctx.stroke();
    setSignatureData(canvas.toDataURL('image/png'));
  };

  const stopDraw = () => { drawingRef.current = false; };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSign = async () => {
    if (!fullLegalName.trim()) { toast.error('Andika jina kamili la kisheria'); return; }
    if (!signatureData) { toast.error('Tafadhali saini kwenye sehemu ya sahihi'); return; }
    if (!agree) { toast.error('Lazima ukubali masharti ya mkataba'); return; }
    setSubmitting(true);
    const result = await saveContract({ fullLegalName: fullLegalName.trim(), signatureData, agree: true });
    setSubmitting(false);
    if (!result.success) { toast.error('Imeshindikana kusaini mkataba'); return; }
    toast.success('Mkataba umesainiwa kikamilifu');
  };

  const ownerBanner = useMemo(() => {
    if (!activeAdminSession || isSuperAdmin) return null;
    return (
      <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        ⚠️ Admin yupo ndani ya akaunti yako sasa kwa ukaguzi wa msaada.
      </div>
    );
  }, [activeAdminSession, isSuperAdmin]);

  if (loading || assistantTcLoading) return <>{children}</>;

  // ASSISTANT: Show T&C acceptance if not yet accepted
  if (isAssistant && assistantTcAccepted === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="flex flex-col items-center justify-center py-4 mb-4">
            <KidukaLogo size="xl" animate />
            <h1 className="text-xl font-bold mt-3">Karibu Kiduka POS</h1>
            <p className="text-sm text-muted-foreground">Kabla ya kuendelea, soma na ukubali masharti</p>
          </div>

          <Card className="rounded-3xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                Masharti ya Matumizi — Msaidizi
              </h3>

              <div className="space-y-3">
                {ASSISTANT_TC.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 text-sm pt-2">
                <input checked={agree} onChange={e => setAgree(e.target.checked)} type="checkbox" className="mt-1" />
                Nimeisoma na kuikubali masharti yote ya matumizi.
              </label>

              <Button className="w-full rounded-2xl" onClick={handleAssistantAcceptTc} disabled={!agree || submitting}>
                {submitting ? 'Inakubali...' : 'Kubali na Endelea'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // OWNER: Show compliance block (TIN/NIDA/License)
  if (showComplianceBlock) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          <div className="flex flex-col items-center justify-center py-4 mb-6">
            <KidukaLogo size="xl" animate />
          </div>
          <div className="flex flex-col lg:flex-row gap-6 relative">
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
              <div className="w-px h-8 bg-gradient-to-b from-transparent to-destructive/30" />
              <ArrowUpRight className="h-4 w-4 text-destructive/50 -rotate-45" />
              <div className="w-px flex-1 bg-gradient-to-b from-destructive/30 via-destructive to-destructive/30" />
              <ArrowUpRight className="h-4 w-4 text-destructive/50 rotate-135" />
              <div className="w-px h-8 bg-gradient-to-t from-transparent to-destructive/30" />
            </div>

            <div className="flex-1 lg:pr-8">
              <Card className="h-full rounded-3xl border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-destructive">Akaunti Imezuiwa</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Akaunti yako imezuiwa hadi utimize taarifa za TIN, NIDA na Leseni.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 lg:pl-8">
              <Card className="h-full rounded-3xl border-primary/50 ring-2 ring-primary">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-bold text-lg">Hatua za Kufuata</h3>
                  {['Nenda kwenye Settings', 'Ingiza TIN Number', 'Ingiza NIDA Number', 'Ingiza Leseni ya Biashara'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{i + 1}</div>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                  <Button className="w-full rounded-2xl mt-4" onClick={() => navigate('/settings')}>
                    Fungua Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OWNER: Show contract signing
  if (showContractBlock) {
    const isLastPage = currentPage === CONTRACT_PAGES.length - 1;
    const page = CONTRACT_PAGES[currentPage];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="flex flex-col items-center justify-center py-4 mb-4">
            <KidukaLogo size="xl" animate />
            <h1 className="text-xl font-bold mt-3 flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Mkataba wa Biashara
            </h1>
            <p className="text-sm text-muted-foreground">Kiduka POS & Sokoni Marketplace</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {CONTRACT_PAGES.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === currentPage ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-6 relative">
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
              <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
              <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
              <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30" />
              <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
              <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
            </div>

            <div className="flex-1 lg:pr-8">
              <Card className="h-full rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary" className="rounded-2xl">Ukurasa {currentPage + 1}/{CONTRACT_PAGES.length}</Badge>
                    <h3 className="font-bold text-lg">{page.title}</h3>
                  </div>
                  <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden">
                    {page.content.map((section, i) => (
                      <div key={i}>
                        <h4 className="font-semibold text-sm text-primary mb-1">{section.heading}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-6">
                    {currentPage > 0 && (
                      <Button variant="outline" className="rounded-2xl" onClick={() => setCurrentPage(p => p - 1)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Nyuma
                      </Button>
                    )}
                    {!isLastPage && (
                      <Button className="rounded-2xl ml-auto" onClick={() => setCurrentPage(p => p + 1)}>
                        Endelea <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 lg:pl-8">
              {isLastPage ? (
                <Card className="h-full rounded-3xl border-primary/50 ring-2 ring-primary">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-primary" />
                      Saini Mkataba
                    </h3>

                    <div className="space-y-2">
                      <Label className="text-xs">Jina Kamili la Kisheria</Label>
                      <Input value={fullLegalName} onChange={(e) => setFullLegalName(e.target.value)} className="rounded-2xl" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Sahihi (chora kwa kidole/mouse)</Label>
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={140}
                        className="w-full rounded-2xl border border-border bg-background touch-none"
                        onMouseDown={(e) => startDraw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                        onMouseMove={(e) => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={(e) => { e.preventDefault(); const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); startDraw(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); }}
                        onTouchMove={(e) => { e.preventDefault(); const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); draw(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); }}
                        onTouchEnd={stopDraw}
                      />
                      <Button variant="outline" size="sm" className="rounded-2xl" onClick={clearSignature}>Futa Sahihi</Button>
                    </div>

                    <label className="flex items-start gap-2 text-sm">
                      <input checked={agree} onChange={(e) => setAgree(e.target.checked)} type="checkbox" className="mt-1" />
                      Nimeisoma na kuikubali mkataba huu pamoja na masharti yote.
                    </label>

                    {status.contractOverdue && (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        Muda wa kusaini mkataba umeisha. Lazima usaini sasa.
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {!status.contractOverdue && (
                        <Button variant="outline" className="rounded-2xl" disabled={submitting}
                          onClick={async () => {
                            const result = await saveContract({ agree: false, reviewLater: true, fullLegalName });
                            if (result.success) toast.success('Sawa, tumekukumbusha baadae');
                          }}>
                          Review Later
                        </Button>
                      )}
                      <Button className="rounded-2xl" onClick={handleSign} disabled={submitting}>
                        {submitting ? 'Inasaini...' : 'Saini Mkataba'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full rounded-3xl bg-primary/5 border-primary/20">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-lg">Muhtasari wa Mkataba</h3>
                    <div className="space-y-3">
                      {['Kiduka POS — Usimamizi wa biashara', 'Sokoni Marketplace — Soko la mtandaoni', 'Majaribio ya BURE siku 30', 'Premium: TSh 10,000/mwezi', 'Muda: Mwaka 1, kisha renewal', 'Compliance: TIN, NIDA, Leseni (Mmiliki tu)'].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-muted/50 rounded-2xl text-center">
                      <p className="text-xs text-muted-foreground">Soma mkataba mzima kisha saini kwenye ukurasa wa mwisho</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {ownerBanner}
      {children}
    </>
  );
};
