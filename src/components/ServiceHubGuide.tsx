import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChatSupport } from '@/components/ChatSupport';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
const questions = [
 ['Ninawezaje kuanza?', 'Ongeza bidhaa zako katika Bidhaa, panga wafanyakazi na ruhusa katika Makundi, kisha tumia Scanner kuuza. Ripoti zinaonyesha mwenendo wa biashara.'],
 ['Ninawezaje kuongeza bidhaa?', 'Fungua Bidhaa → Ongeza. Weka jina, bei, kiasi cha stoo, barcode na picha yako, kisha hifadhi.'],
 ['Ninawezaje kuuza na kupata risiti?', 'Fungua Scanner, scan barcode au tafuta bidhaa. Hakiki kikapu na malipo kabla ya kukamilisha mauzo; fungua risiti yenye jina la biashara yako.'],
 ['Ninawezaje kuona ripoti?', 'Fungua Ripoti, chagua kipindi na aina ya taarifa. Linganisha mauzo, gharama na faida.'],
 ['Ninawezaje kusimamia wafanyakazi na matawi?', 'Weka ruhusa za wafanyakazi katika Makundi. Katika Matawi simamia taarifa na wafanyakazi wa tawi; huduma na ada huwekwa na msimamizi wa mfumo.'],
 ['Je, Kiduka hufanya kazi bila mtandao?', 'Rekodi zinazoungwa mkono huhifadhiwa kwenye kifaa na kusawazishwa mtandao ukirudi. Malipo ya simu na kutuma maombi ya msaada yanahitaji mtandao.'],
 ['Ninawezaje kuweka punguzo?', 'Fungua Punguzo, chagua bidhaa, kiasi na tarehe za punguzo. Hakiki bei kabla ya kukamilisha mauzo.'],
 ['Miadi na maswali hushughulikiwaje?', 'Tuma ombi hapa. Linahifadhiwa kwa msimamizi na taarifa hutumwa kwenye email ya msaada. Miadi inasubiri uthibitisho; jibu hutumwa kwa email au WhatsApp. Hatuahidi muda wa majibu ambao haujathibitishwa.'],
];
export function ServiceHubGuide() {
 const { user } = useAuth(); const [chat,setChat]=useState(false);
 return <section id="msaada" className="mx-auto max-w-5xl px-5 pb-12"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Mwongozo na msaada</h2>{user && <Button variant="outline" onClick={()=>setChat(true)}><MessageCircle className="h-4 w-4"/>Mazungumzo yangu</Button>}</div><div className="mt-5 divide-y divide-border">{questions.map(([q,a])=><details key={q} className="py-4"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p></details>)}</div><ChatSupport open={chat} onClose={()=>setChat(false)}/></section>;
}
