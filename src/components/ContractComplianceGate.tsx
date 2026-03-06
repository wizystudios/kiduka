import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileSignature, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessGovernance } from '@/hooks/useBusinessGovernance';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ContractComplianceGateProps {
  children: React.ReactNode;
}

export const ContractComplianceGate = ({ children }: ContractComplianceGateProps) => {
  const { userProfile } = useAuth();
  const { loading, status, saveContract, activeAdminSession } = useBusinessGovernance();
  const navigate = useNavigate();
  const [fullLegalName, setFullLegalName] = useState(userProfile?.full_name || '');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const showContractBlock = !isSuperAdmin && !status.contractSigned && (!status.canReviewLater || status.contractOverdue);
  const showComplianceBlock = !isSuperAdmin && status.complianceBlocked;

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

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSign = async () => {
    if (!fullLegalName.trim()) {
      toast.error('Andika jina kamili la kisheria');
      return;
    }
    if (!signatureData) {
      toast.error('Tafadhali saini kwenye sehemu ya sahihi');
      return;
    }
    if (!agree) {
      toast.error('Lazima ukubali masharti ya mkataba');
      return;
    }

    setSubmitting(true);
    const result = await saveContract({ fullLegalName: fullLegalName.trim(), signatureData, agree: true });
    setSubmitting(false);

    if (!result.success) {
      toast.error('Imeshindikana kusaini mkataba');
      return;
    }

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

  if (loading) {
    return <>{children}</>;
  }

  if (showComplianceBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-lg rounded-3xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Akaunti Imezuiwa - Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Akaunti yako imezuiwa hadi utimize taarifa za TIN, NIDA na Leseni kwenye Settings.
            </p>
            <Button className="w-full rounded-2xl" onClick={() => navigate('/settings')}>
              Fungua Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showContractBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-muted/20 to-secondary/20">
        <Card className="w-full max-w-2xl rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Mkataba wa Biashara wa Kiduka
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4 text-sm space-y-2">
              <p>• Biashara inawajibika kutumia mfumo kwa mujibu wa sheria na maadili ya biashara.</p>
              <p>• Malipo ya usajili na compliance ni wajibu wa mmiliki wa biashara.</p>
              <p>• Data ya biashara inalindwa; admin anaweza kuingia kwa msaada wa kiufundi na ukaguzi.</p>
              <p>• Mkataba huu hudumu mwaka 1 na unahitaji renewal.</p>
            </div>

            <div className="space-y-2">
              <Label>Jina Kamili la Kisheria</Label>
              <Input value={fullLegalName} onChange={(e) => setFullLegalName(e.target.value)} className="rounded-2xl" />
            </div>

            <div className="space-y-2">
              <Label>Sahihi (andika/chora kwa kidole au mouse)</Label>
              <canvas
                ref={canvasRef}
                width={640}
                height={180}
                className="w-full rounded-2xl border border-border bg-background"
                onMouseDown={(e) => startDraw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                onMouseMove={(e) => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={(e) => {
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                  const t = e.touches[0];
                  startDraw(t.clientX - rect.left, t.clientY - rect.top);
                }}
                onTouchMove={(e) => {
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                  const t = e.touches[0];
                  draw(t.clientX - rect.left, t.clientY - rect.top);
                }}
                onTouchEnd={stopDraw}
              />
              <Button variant="outline" className="rounded-2xl" onClick={clearSignature}>Futa Sahihi</Button>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input checked={agree} onChange={(e) => setAgree(e.target.checked)} type="checkbox" className="mt-1" />
              Nimeisoma na kuikubali mkataba huu pamoja na masharti ya matumizi.
            </label>

            {status.contractOverdue && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                Muda wa kusaini mkataba umeisha. Lazima usaini sasa ili kuendelea kutumia mfumo.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {!status.contractOverdue && (
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  disabled={submitting}
                  onClick={async () => {
                    const result = await saveContract({ agree: false, reviewLater: true, fullLegalName });
                    if (result.success) toast.success('Sawa, tumekukumbusha baadae');
                  }}
                >
                  Review Later
                </Button>
              )}
              <Button className="rounded-2xl" onClick={handleSign} disabled={submitting}>
                {submitting ? 'Inasaini...' : 'Saini Mkataba'}
              </Button>
            </div>
          </CardContent>
        </Card>
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
