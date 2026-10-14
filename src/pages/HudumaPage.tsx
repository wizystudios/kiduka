import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { ArrowLeft, LogIn, Share2 } from 'lucide-react';
import { primaryNavigationItems } from '@/lib/navigation';

const details: Record<string, { kazi: string; faida: string }> = {
  dashboard: { kazi: 'Inaonyesha mauzo ya leo, faida, stoo inayoisha na wadaiwa kwa muonekano mmoja.', faida: 'Unajua hali ya biashara ndani ya sekunde chache, popote ulipo.' },
  products: { kazi: 'Ongeza bidhaa kwa picha, barcode, bei ya kununua na kuuza, na punguzo lenye tarehe.', faida: 'Bei sahihi kila mara na bidhaa zako zinaonekana pia Sokoni.' },
  sales: { kazi: 'Uza kwa kuscani barcode kwa kamera ya simu; risiti yenye jina la duka hutoka papo hapo.', faida: 'Mauzo haraka, hakuna makosa ya hesabu, risiti inatumwa WhatsApp.' },
  stock: { kazi: 'Stoo hujikata kila mauzo; unahesabu stoo na kuona tofauti.', faida: 'Unazuia wizi na upotevu, unajua lini kuagiza mzigo.' },
  orders: { kazi: 'Oda kutoka duka lako la mtandaoni (Sokoni) zinaingia hapa na hali ya usafirishaji.', faida: 'Unauza mtandaoni kwa wateja wa mbali bila kufungua tovuti yako mwenyewe.' },
  rewards: { kazi: 'Wateja hupata pointi kila wanaponunua na kuzitumia baadaye.', faida: 'Wateja hurudi tena na tena.' },
  groups: { kazi: 'Panga wateja kwa makundi, fuatilia madeni na lipa kwa kitufe kimoja.', faida: 'Unatuma ujumbe wa kikundi na kukumbusha wadaiwa kwa WhatsApp.' },
  mikopo: { kazi: 'Rekodi mikopo kwa wateja, tarehe za kulipa na marejesho.', faida: 'Hakuna deni linalosahaulika; arifa nyekundu kwa waliochelewa.' },
  invoices: { kazi: 'Kila mauzo yanakuwa ankara inayoweza kuhaririwa, kuprintiwa au kutumwa.', faida: 'Kumbukumbu rasmi kwa wateja wa jumla na mamlaka za kodi.' },
  payments: { kazi: 'Weka picha ya Lipa Namba yako rasmi na fuatilia malipo ya simu.', faida: 'Wateja wanalipa kwa M-Pesa, Tigo, Airtel, HaloPesa bila pesa taslimu.' },
  reports: { kazi: 'Ripoti za mauzo, faida na hasara, bidhaa zinazouzwa zaidi na wateja.', faida: 'Unafanya maamuzi kwa takwimu halisi, sio kukisia.' },
  bookkeeping: { kazi: 'Uhasibu wa kuingiza mapato na matumizi kwa mfumo wa double-entry.', faida: 'Vitabu safi vya hesabu kwa benki, mkopo au mhasibu.' },
  settings: { kazi: 'Taarifa za duka, wafanyakazi na ruhusa zao, matawi na malipo ya mfumo.', faida: 'Unadhibiti nani anaona nini, na unaongeza matawi bila kikomo.' },
};

const pricing = [
  ['Kifurushi cha msingi', 'TSh 30,000 / mwezi'],
  ['Mfanyakazi wa ziada', 'TSh 5,000 / mwezi kila mmoja'],
  ['Tawi la ziada', 'TSh 15,000 / mwezi kila tawi'],
  ['Duka la Sokoni (mtandaoni)', 'TSh 50,000 / mwezi'],
];

const HudumaPage = () => {
  const navigate = useNavigate();
  const share = () => {
    const url = `${window.location.origin}/huduma`;
    window.open(`https://wa.me/?text=${encodeURIComponent('Jionee huduma za Kiduka: ' + url)}`, '_blank');
  };
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Rudi" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button>
        <KidukaLogo size="sm" showText />
        <button onClick={share} aria-label="Shiriki" className="rounded-full p-2 text-primary hover:bg-muted"><Share2 className="h-5 w-5" /></button>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section className="text-center">
          <h1 className="text-3xl font-bold md:text-4xl">Huduma za Kiduka</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Kila sehemu ya mfumo, inavyofanya kazi na faida yake kwa biashara yako. Inafanya kazi hata bila mtandao.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {primaryNavigationItems.map((i) => {
            const d = details[i.id];
            if (!d) return null;
            const Icon = i.icon;
            return (
              <article key={i.id} className="rounded-3xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                  <h2 className="text-lg font-semibold">{i.label === 'Dashboard' ? 'Dashibodi' : i.label}</h2>
                </div>
                <p className="mt-3 text-sm"><span className="font-medium">Inafanyaje kazi: </span>{d.kazi}</p>
                <p className="mt-2 text-sm text-secondary-foreground"><span className="font-medium text-primary">Faida: </span>{d.faida}</p>
              </article>
            );
          })}
        </section>
        <section className="rounded-3xl border bg-primary/5 p-6">
          <h2 className="text-xl font-bold">Maduka mengi, akaunti moja</h2>
          <p className="mt-2 text-sm text-muted-foreground">Mmiliki mmoja anaweza kusimamia matawi 4 au zaidi bila kikomo. Kila tawi lina mauzo, stoo na wafanyakazi wake; mmiliki anaona yote kutoka biashara kuu.</p>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Bei</h2>
          <div className="divide-y rounded-3xl border">
            {pricing.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm"><span>{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Malipo kwa simu: M-Pesa, Tigo Pesa, Airtel Money, HaloPesa — huduma inawaka papo hapo.</p>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="h-12 rounded-full px-8" onClick={() => navigate('/auth')}><LogIn className="mr-2 h-5 w-5" />Jisajili sasa</Button>
          <Button variant="outline" className="h-12 rounded-full px-8" onClick={share}><Share2 className="mr-2 h-5 w-5" />Tuma kwa WhatsApp</Button>
        </div>
      </main>
    </div>
  );
};

export default HudumaPage;
