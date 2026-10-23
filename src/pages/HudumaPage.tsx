import { useMemo, useState } from 'react';
import hudumaHero from '@/assets/huduma-hero.jpg';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { KidukaLogo } from '@/components/KidukaLogo';
import {
  ArrowLeft, Share2, ScanLine, Package, ClipboardList, Receipt, Users, CreditCard, BarChart3, BookOpen,
  Store, GitBranch, Wallet, MessageCircle, Mic, Sparkles, WifiOff, Shield, Gift, Truck, Tag, Wallet2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type F = { icon: any; title: string; kazi: string; faida: string };
const groups: { name: string; lead: string; items: F[] }[] = [
  { name: 'Uza', lead: 'Kila mauzo, haraka na sahihi.', items: [
    { icon: ScanLine, title: 'Scanner ya kamera', kazi: 'Scan barcode kwa simu, ongeza kwenye kikapu, badilisha bei papo hapo.', faida: 'Foleni hakuna, makosa ya hesabu hakuna.' },
    { icon: Receipt, title: 'Risiti na Ankara', kazi: 'Kila mauzo yanakuwa ankara yenye jina la duka, QR na link.', faida: 'Tuma WhatsApp au printi — kumbukumbu rasmi.' },
    { icon: Mic, title: 'Uza kwa sauti', kazi: 'Sema "uza sukari kilo mbili" na mfumo unarekodi.', faida: 'Mikono huru wakati wa msongamano.' },
    { icon: Tag, title: 'Punguzo', kazi: 'Weka punguzo lenye tarehe ya kuanza na kuisha.', faida: 'Ofa zinajizima zenyewe — hakuna hasara.' },
  ]},
  { name: 'Simamia', lead: 'Stoo, bidhaa na matumizi kwa mtazamo mmoja.', items: [
    { icon: Package, title: 'Bidhaa', kazi: 'Picha, barcode, bei ya kununua na kuuza, kuingiza kwa Excel.', faida: 'Faida ya kila bidhaa inaonekana.' },
    { icon: ClipboardList, title: 'Stock', kazi: 'Stoo inajikata kila mauzo; hesabu na rekebisha.', faida: 'Arifa kabla bidhaa haijaisha — zuia upotevu.' },
    { icon: Truck, title: 'Wasambazaji', kazi: 'Hifadhi wasambazaji na manunuzi yako.', faida: 'Agiza mzigo kwa wakati na bei bora.' },
    { icon: Wallet2, title: 'Matumizi', kazi: 'Rekodi kodi ya pango, umeme, mishahara.', faida: 'Faida halisi baada ya gharama zote.' },
  ]},
  { name: 'Wateja', lead: 'Wateja wanarudi, madeni yanalipwa.', items: [
    { icon: Users, title: 'Makundi na madeni', kazi: 'Panga wateja, fuatilia wadaiwa, pokea malipo kwa kitufe kimoja.', faida: 'Hakuna deni linalosahaulika.' },
    { icon: CreditCard, title: 'Mikopo', kazi: 'Tarehe za kulipa na arifa za waliochelewa.', faida: 'Pesa yako inarudi kwa wakati.' },
    { icon: Gift, title: 'Tuzo', kazi: 'Pointi kila ununuzi, zinatumika baadaye.', faida: 'Uaminifu wa wateja unaongezeka.' },
    { icon: MessageCircle, title: 'WhatsApp', kazi: 'Kumbusho za madeni, risiti na ujumbe uliopangwa.', faida: 'Mawasiliano bila gharama ya SMS.' },
  ]},
  { name: 'Kua', lead: 'Kutoka duka moja hadi matawi mengi na mtandaoni.', items: [
    { icon: GitBranch, title: 'Matawi', kazi: 'Kila tawi lina mauzo, stoo na wafanyakazi wake; unaona yote.', faida: 'Matawi bila kikomo kwa akaunti moja.' },
    { icon: Store, title: 'Sokoni', kazi: 'Duka lako mtandaoni lenye link yako, oda na ufuatiliaji wa usafirishaji.', faida: 'Wateja wa mbali wanakununua saa 24.' },
    { icon: Wallet, title: 'Lipa Namba', kazi: 'Weka QR yako rasmi; wateja walipe M-Pesa, Tigo, Airtel, HaloPesa.', faida: 'Pesa taslimu kidogo, usalama zaidi.' },
    { icon: Shield, title: 'Wafanyakazi na ruhusa', kazi: 'Kila mfanyakazi anaona tu ulichomruhusu.', faida: 'Udhibiti kamili, kumbukumbu ya kila hatua.' },
  ]},
  { name: 'Elewa', lead: 'Takwimu halisi, maamuzi bora.', items: [
    { icon: BarChart3, title: 'Ripoti', kazi: 'Mauzo, faida na hasara, bidhaa bora, wateja bora.', faida: 'Jua kinacholeta pesa.' },
    { icon: BookOpen, title: 'Uhasibu', kazi: 'Mapato na matumizi kwa mfumo wa double-entry.', faida: 'Vitabu safi kwa benki na TRA.' },
    { icon: Sparkles, title: 'Mshauri wa AI', kazi: 'Utabiri wa mauzo na ushauri wa biashara.', faida: 'Panga mzigo kabla ya msimu.' },
    { icon: WifiOff, title: 'Bila mtandao', kazi: 'Uza hata mtandao ukikatika; inasawazisha ukirudi.', faida: 'Biashara haisimami kamwe.' },
  ]},
];

const fmt = (n: number) => `TSh ${n.toLocaleString('en-US')}`;

const HudumaPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState(3);
  const [branches, setBranches] = useState(0);
  const [large, setLarge] = useState(false);

  const bill = useMemo(() => {
    const staffFee = large ? 500 : 2000;
    const branchFee = large ? 15000 : 10000;
    const extra = Math.max(0, staff - 3);
    return { extra, staffFee, branchFee, total: 30000 + extra * staffFee + branches * branchFee };
  }, [staff, branches, large]);

  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent('Jionee huduma za Kiduka: ' + window.location.origin + '/huduma')}`, '_blank');
  const g = groups[tab];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} aria-label="Rudi" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <KidukaLogo size="sm" showText />
          <button onClick={share} aria-label="Shiriki" className="rounded-full p-2 text-primary hover:bg-muted"><Share2 className="h-4 w-4" /></button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-12 pt-16 text-center">
        <p className="text-sm font-medium text-primary">Kiduka · Biashara Smart</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Duka lako lote.<br /><span className="text-muted-foreground">Mfukoni mwako.</span></h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">Uza, simamia stoo, fuatilia madeni, fungua matawi na duka la mtandaoni — kwenye mfumo mmoja.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button className="h-11 rounded-full px-7" onClick={() => navigate('/auth')}>Anza sasa</Button>
          <Button variant="ghost" className="h-11 rounded-full px-7 text-primary" onClick={() => document.getElementById('bei')?.scrollIntoView({ behavior: 'smooth' })}>Angalia bei ›</Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <img src={hudumaHero} alt="Muuzaji akiscan bidhaa kwa simu dukani" width={1600} height={912} className="w-full rounded-3xl object-cover shadow-lg" />
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mx-auto mb-8 flex w-fit gap-1 rounded-full bg-muted p-1">
          {groups.map((x, i) => (
            <button key={x.name} onClick={() => setTab(i)} className={cn('rounded-full px-4 py-1.5 text-sm transition-all', i === tab ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground')}>{x.name}</button>
          ))}
        </div>
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{g.lead}</h2>
        <div key={tab} className="mt-8 grid animate-fade-in gap-4 sm:grid-cols-2">
          {g.items.map(({ icon: Icon, title, kazi, faida }) => (
            <article key={title} className="rounded-3xl bg-muted/50 p-6 transition-transform hover:-translate-y-0.5">
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{kazi}</p>
              <p className="mt-3 text-sm font-medium text-secondary">{faida}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="bei" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Bei iliyo wazi.</h2>
          <p className="mt-2 text-center text-muted-foreground">Unalipa kulingana na ukubwa wa biashara yako.</p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="space-y-7 rounded-3xl bg-background p-7">
              <div>
                <p className="mb-3 text-sm font-medium">Ukubwa wa biashara</p>
                <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
                  {[['Ndogo', false], ['Kubwa', true]].map(([l, v]) => (
                    <button key={String(l)} onClick={() => setLarge(v as boolean)} className={cn('rounded-full py-2 text-sm', large === v ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground')}>{l as string}</button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Kubwa = bidhaa 5,000 au zaidi.</p>
              </div>
              <div>
                <div className="mb-3 flex justify-between text-sm"><span className="font-medium">Wafanyakazi duka kuu</span><span>{staff}</span></div>
                <Slider min={1} max={30} step={1} value={[staff]} onValueChange={([v]) => setStaff(v)} />
              </div>
              <div>
                <div className="mb-3 flex justify-between text-sm"><span className="font-medium">Matawi</span><span>{branches}</span></div>
                <Slider min={0} max={20} step={1} value={[branches]} onValueChange={([v]) => setBranches(v)} />
              </div>
            </div>

            <div className="flex flex-col rounded-3xl bg-background p-7">
              <div className="space-y-3 text-sm">
                <Row l="Kifurushi cha msingi (wafanyakazi 3 bure)" v={fmt(30000)} />
                {bill.extra > 0 && <Row l={`Wafanyakazi wa ziada ${bill.extra} × ${fmt(bill.staffFee)}`} v={fmt(bill.extra * bill.staffFee)} />}
                {branches > 0 && <Row l={`Matawi ${branches} × ${fmt(bill.branchFee)}`} v={fmt(branches * bill.branchFee)} />}
              </div>
              <div className="mt-auto border-t pt-5">
                <p className="text-sm text-muted-foreground">Jumla kwa mwezi</p>
                <p className="text-4xl font-semibold tracking-tight">{fmt(bill.total)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info t="Wafanyakazi 3" d="Wamo ndani ya TSh 30,000" />
            <Info t="Mfanyakazi wa ziada" d="TSh 2,000 (ndogo) · TSh 500 (kubwa)" />
            <Info t="Tawi" d="TSh 10,000 (ndogo) · TSh 15,000 (kubwa) — linajumuisha wafanyakazi 3" />
            <Info t="Sokoni" d="TSh 50,000 / mwezi" />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Lipa kwa M-Pesa, Tigo Pesa, Airtel Money au HaloPesa — huduma inawaka papo hapo.</p>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Tayari kuanza?</h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button className="h-11 rounded-full px-8" onClick={() => navigate('/auth')}>Jisajili sasa</Button>
          <Button variant="outline" className="h-11 rounded-full px-8" onClick={share}><Share2 className="mr-2 h-4 w-4" />Tuma kwa WhatsApp</Button>
        </div>
      </section>
    </div>
  );
};

const Row = ({ l, v }: { l: string; v: string }) => (
  <div className="flex justify-between gap-4"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>
);
const Info = ({ t, d }: { t: string; d: string }) => (
  <div className="rounded-2xl bg-background p-4"><p className="font-medium">{t}</p><p className="mt-1 text-xs text-muted-foreground">{d}</p></div>
);

export default HudumaPage;
