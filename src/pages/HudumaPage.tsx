import { useEffect, useMemo, useState } from 'react';
import { InstructionMedia, InstructionCards } from '@/components/InstructionMedia';
import { ServiceHubContact } from '@/components/ServiceHubContact';
import { ServiceHubCards } from '@/components/ServiceHubCards';
import { hubWhatsAppLink, serviceHubMessage } from '@/lib/serviceHub';
import { supabase } from '@/integrations/supabase/client';
import { calculateBillingPreview } from '@/lib/billingPreview';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
    { icon: GitBranch, title: 'Matawi', kazi: 'Kila tawi lina mauzo, stoo na wafanyakazi wake; unaona yote.', faida: 'Maduka mengi kama matawi ya biashara kuu; kila tawi lina ada yake.' },
    { icon: Store, title: 'Sokoni', kazi: 'Duka lako mtandaoni lenye link yako, oda na ufuatiliaji wa usafirishaji.', faida: 'Wateja wa mbali wanakununua saa 24.' },
    { icon: Wallet, title: 'Lipa Namba', kazi: 'Weka QR yako rasmi; wateja walipe M-Pesa, Tigo, Airtel, HaloPesa.', faida: 'Pesa taslimu kidogo, usalama zaidi.' },
    { icon: Shield, title: 'Wafanyakazi na ruhusa', kazi: 'Kila mfanyakazi anaona tu ulichomruhusu.', faida: 'Udhibiti kamili, kumbukumbu ya kila hatua.' },
  ]},
  { name: 'Elewa', lead: 'Takwimu halisi, maamuzi bora.', items: [
    { icon: BarChart3, title: 'Ripoti', kazi: 'Mauzo, faida na hasara, bidhaa bora, wateja bora.', faida: 'Jua kinacholeta pesa.' },
    { icon: BookOpen, title: 'Uhasibu', kazi: 'Mapato na matumizi kwa mfumo wa double-entry.', faida: 'Vitabu safi kwa benki na TRA.' },
    { icon: Sparkles, title: 'Mshauri wa AI', kazi: 'Utabiri wa mauzo na ushauri wa biashara.', faida: 'Panga mzigo kabla ya msimu.' },
    { icon: WifiOff, title: 'Bila mtandao', kazi: 'Bidhaa na rekodi zinazoungwa mkono huhifadhiwa kwenye kifaa; husawazishwa mtandao ukirudi.', faida: 'Hupunguza usumbufu wa mtandao; malipo ya simu yanahitaji mtandao.' },
    { icon: ClipboardList, title: 'Dashboard', kazi: 'Muhtasari wa mauzo ya leo, bidhaa na madeni kwa duka au tawi husika.', faida: 'Ona hali ya biashara kwa haraka.' },
    { icon: Truck, title: 'Oda za Sokoni', kazi: 'Duka kuu hukubali oda, huweka mpelekaji na kufuatilia hadi kuwasilishwa.', faida: 'Ununuzi wa mtandaoni una kumbukumbu.' },
    { icon: Wallet, title: 'Malipo ya mfumo', kazi: 'Angalia bili, tuma uthibitisho au lipa kwa simu; salio hubadilika malipo yakithibitishwa.', faida: 'Jua kiasi kinachodaiwa kabla ya kulipa.' },
    { icon: Shield, title: 'Mipangilio na Sheria', kazi: 'Jina, nembo, mawasiliano, nyaraka za biashara na njia rasmi za malipo.', faida: 'Risiti na taarifa huwakilisha biashara yako.' },
    { icon: MessageCircle, title: 'Arifa na Msaada', kazi: 'Arifa za biashara, mazungumzo ya msaada na kusakinisha Kiduka kwenye kifaa.', faida: 'Habari muhimu na msaada vinapatikana karibu.' },
  ]},
];

const fmt = (n: number) => `TSh ${n.toLocaleString('en-US')}`;

const HudumaPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState(3);
  const [branches, setBranches] = useState(0);
  const [products, setProducts] = useState(100);
  const [customers, setCustomers] = useState(200);
  const [branchStaff, setBranchStaff] = useState(0);
  const [sokoni, setSokoni] = useState(false);
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  useEffect(() => { supabase.rpc('get_public_billing_settings').then(({ data }) => setPrices(data as Record<string, number> | null)); }, []);
  const bill = useMemo(() => prices ? calculateBillingPreview(prices, { staff, branches, products, customers, branchStaff, sokoni }) : null, [prices, staff, branches, products, customers, branchStaff, sokoni]);

  const share = () => window.open(hubWhatsAppLink(serviceHubMessage()), '_blank', 'noopener,noreferrer');
  const g = groups[tab];

  return (
    <div className="min-h-[100dvh] bg-background pb-20 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Rudi"><ArrowLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-primary">ServiceHUB</span>
          <Button variant="ghost" size="icon" onClick={share} aria-label="Shiriki"><Share2 className="h-4 w-4" /></Button>
        </div>
      </header>

      <section className="relative isolate flex min-h-[430px] items-end overflow-hidden md:min-h-[520px]">
        <img src={hudumaHero} alt="Picha ya AI ya huduma dukani" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-foreground/75" />
        <div className="mx-auto w-full max-w-5xl px-6 py-10 text-background">
          <p className="text-sm font-medium">Kiduka · Biashara Smart</p>
          <h1 className="mt-3 font-semibold">Kiduka ServiceHUB</h1>
          <p className="mt-3 text-2xl font-semibold">Tumerudi na nguvu mpya.</p>
          <p className="mt-4 max-w-lg text-base leading-relaxed">Tuko tayari kukuhudumia tena. Endelea na biashara yako, pata msaada na tuijenge hatua inayofuata pamoja.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="h-11 px-6" onClick={() => document.getElementById('mawasiliano')?.scrollIntoView({ behavior: 'smooth' })}>Weka miadi / Uliza swali</Button>
            <Button variant="secondary" className="h-11 px-6" onClick={() => document.getElementById('bei')?.scrollIntoView({ behavior: 'smooth' })}>Huduma na bei</Button>
          </div>
        </div>
      </section>

      <ServiceHubCards />
      <ServiceHubContact />

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-center font-semibold">Jionee Kiduka</h2>
        <InstructionMedia video />
        <p className="mt-2 text-center text-xs text-muted-foreground">Video ya AI ya shughuli dukani; picha za mfumo hapa chini ni Kiduka halisi.</p>
        <div className="mx-auto mt-8 max-w-2xl"><InstructionCards /></div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mx-auto mb-8 flex max-w-full flex-wrap justify-center gap-1 rounded-full bg-muted p-1">
          {groups.map((x, i) => (
            <Button key={x.name} size="sm" variant={i === tab ? 'default' : 'ghost'} onClick={() => setTab(i)}>{x.name}</Button>
          ))}
        </div>
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">{g.lead}</h2>
        <div key={tab} className="mt-8 grid animate-fade-in gap-4 sm:grid-cols-2">
          {g.items.map(({ icon: Icon, title, kazi, faida }) => (
            <article key={title} className="rounded-3xl bg-muted/50 p-6 transition-transform hover:-translate-y-0.5">
              <Icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{kazi}</p>
              <p className="mt-3 text-sm font-medium text-success">{faida}</p>
              <Button variant="ghost" size="sm" className="mt-3 px-0 text-primary" onClick={() => window.open(hubWhatsAppLink(serviceHubMessage(title, `${kazi} ${faida}`)), '_blank', 'noopener,noreferrer')}><Share2 className="h-4 w-4" />Shiriki huduma</Button>
            </article>
          ))}
        </div>
      </section>

      <section id="bei" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">Bei iliyo wazi.</h2>
          <p className="mt-2 text-center text-muted-foreground">Unalipa kulingana na ukubwa wa biashara yako.</p>

          {!prices || !bill ? <p className="py-8 text-center text-muted-foreground">Inapakia bei...</p> : <>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{bill.large ? 'Biashara kubwa' : 'Biashara ndogo'} · kubwa kuanzia bidhaa {prices.large_business_product_threshold.toLocaleString()}</p>
              {[
                { label: 'Wafanyakazi duka kuu', value: staff, set: setStaff },
                { label: 'Matawi', value: branches, set: setBranches },
                { label: 'Wafanyakazi matawini (jumla)', value: branchStaff, set: setBranchStaff },
                { label: 'Bidhaa', value: products, set: setProducts },
                { label: 'Wateja', value: customers, set: setCustomers },
              ].map(r => <label key={r.label} className="flex items-center justify-between gap-4 text-sm"><span>{r.label}</span><Input className="w-28" aria-label={r.label} type="number" min={0} value={r.value} onChange={e => r.set(Math.max(0, Number(e.target.value)))} /></label>)}
              <label className="flex items-center justify-between text-sm">Sokoni<Switch checked={sokoni} onCheckedChange={setSokoni} /></label>
            </div>
            <div className="space-y-4 border-t border-border pt-5 md:border-t-0 md:border-l md:pl-8">
              <Row l={bill.free ? 'Mpango wa bure' : `Duka kuu: wafanyakazi ${prices.base_staff_limit}`} v={fmt(bill.free ? 0 : prices.base_fee)} />
              {!bill.free && <>
                {bill.extra > 0 && <Row l={`Wafanyakazi wa ziada ${bill.extra}`} v={fmt(bill.extra * bill.staffFee)} />}
                {branches > 0 && <Row l={`Matawi ${branches}`} v={fmt(branches * bill.branchFee)} />}
                {bill.productFee > 0 && <Row l="Bidhaa za ziada" v={fmt(bill.productFee)} />}
                {bill.customerFee > 0 && <Row l="Wateja wa ziada" v={fmt(bill.customerFee)} />}
                {sokoni && <Row l="Sokoni" v={fmt(prices.sokoni_fee)} />}
              </>}
              <div className="border-t border-border pt-5"><p className="text-sm text-muted-foreground">Makadirio kwa mwezi</p><p className="text-3xl font-semibold">{fmt(bill.total)}</p></div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info t="Duka kuu" d={`${fmt(prices.base_fee)}; wafanyakazi ${prices.base_staff_limit}, bidhaa ${prices.base_product_limit}, wateja ${prices.base_customer_limit}`} />
            <Info t="Mfanyakazi wa ziada" d={`${fmt(prices.extra_staff_fee_small)} ndogo / ${fmt(prices.extra_staff_fee_large)} kubwa`} />
            <Info t="Tawi" d={`${fmt(prices.branch_fee_small)} ndogo / ${fmt(prices.branch_fee_large)} kubwa; wafanyakazi ${prices.branch_staff_limit}`} />
            <Info t="Mpango wa bure" d={`Wafanyakazi ${prices.free_staff_limit}, bidhaa ${prices.free_product_limit}, wateja ${prices.free_customer_limit}`} />
          </div></>}
          <p className="mt-6 text-center text-xs text-muted-foreground">Lipa kwa M-Pesa, Tigo Pesa, Airtel Money au HaloPesa — huduma huwashwa baada ya malipo kuthibitishwa.</p>
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
