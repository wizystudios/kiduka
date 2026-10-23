import { useRef, useState } from 'react';
import { Share2, Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import welcomePoster from '@/assets/hub-welcome.jpg.asset.json';
import salesPoster from '@/assets/hub-sales.jpg.asset.json';
import businessPoster from '@/assets/hub-business-clean.jpg.asset.json';
import welcomeVideo from '@/assets/hub-welcome.mp4.asset.json';
import salesVideo from '@/assets/hub-sales.mp4.asset.json';
import businessVideo from '@/assets/hub-business-clean.mp4.asset.json';
import welcomeWebm from '@/assets/hub-welcome.webm.asset.json';
import salesWebm from '@/assets/hub-sales.webm.asset.json';
import businessWebm from '@/assets/hub-business-clean.webm.asset.json';
import { KidukaLogo } from '@/components/KidukaLogo';
import { hubWhatsAppLink, serviceHubMessage } from '@/lib/serviceHub';
import { toast } from 'sonner';
const cards = [
 { id: 'tumerudi', title: 'Tumerudi na nguvu mpya.', text: 'Kiduka inapatikana tena! Tuko tayari kukuhudumia: mauzo, stoo, madeni, matawi na Sokoni. Karibu tuendelee kuikuza biashara yako.', image: welcomePoster.url, video: welcomeVideo.url, caption: 'Video ya AI · Si biashara ya mteja' },
 { id: 'mauzo', title: 'Mauzo yenye kumbukumbu.', text: 'Scan bidhaa, hakiki kikapu na fungua risiti yenye jina la duka. Omba miadi ya kuoneshwa Kiduka kupitia ServiceHUB.', image: salesPoster.url, video: salesVideo.url, caption: 'Video ya AI · Si biashara ya mteja' },
 { id: 'biashara', title: 'Biashara yako, pamoja.', text: 'Panga bidhaa na stoo, fuatilia taarifa za biashara na simamia matawi yako. Tupo kukusaidia kuanza na kutumia Kiduka.', image: businessPoster.url, video: businessVideo.url, caption: 'Video ya AI · Si biashara ya mteja' },
];
const webmVideos = [welcomeWebm.url, salesWebm.url, businessWebm.url];
function ShareCard({ card }: { card: typeof cards[number] }) {
 const ref = useRef<HTMLDivElement>(null); const [busy, setBusy] = useState(false);
 const message = serviceHubMessage(card.title, card.text);
 async function image(share: boolean) {
  if (!ref.current || busy) return; setBusy(true);
  try {
   const { default: html2canvas } = await import('html2canvas');
   const canvas = await html2canvas(ref.current, { useCORS: true, scale: 2, backgroundColor: null });
   const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
   if (!blob) throw new Error('image');
   const file = new File([blob], `kiduka-${card.id}.png`, { type: 'image/png' });
   if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: card.title, text: message }); }
   else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); if (share) toast.info('Kadi imepakuliwa. Ujumbe wa WhatsApp unapatikana kwenye kitufe cha WhatsApp.'); }
  } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) toast.error('Kadi haijapakuliwa. Unaweza kushiriki ujumbe kwa WhatsApp.'); } finally { setBusy(false); }
 }
 return <article className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
  <div ref={ref} className="bg-card text-card-foreground">
   <div className="relative aspect-video w-full overflow-hidden">
    <img src={card.image} alt={card.title} crossOrigin="anonymous" className="h-full w-full object-cover" />
    <video poster={card.image} aria-label={`Video: ${card.title}`} controls playsInline preload="none" className="absolute inset-0 h-full w-full object-cover" data-html2canvas-ignore onPlay={event => { document.querySelectorAll('video').forEach(video => { if (video !== event.currentTarget) video.pause(); }); }}><source src={card.video} type="video/mp4" /><source src={webmVideos[cards.indexOf(card)]} type="video/webm" /></video>
   </div>
   <div className="p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><KidukaLogo size="sm" showText={false} /><span className="font-bold text-primary">Kiduka</span></div><p className="text-xs font-semibold text-primary">ServiceHUB</p></div><h3 className="mt-4 font-semibold">{card.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.text}</p><p className="mt-4 text-xs font-medium text-success">kiduka.shop/servicehub · +255 797 813 597</p><p className="mt-2 text-[10px] text-muted-foreground">{card.caption}</p></div>
  </div>
  <div className="flex items-center justify-between gap-1 border-t border-border px-4 py-2"><Button asChild variant="ghost" size="sm" className="px-2 text-success"><a href={hubWhatsAppLink(message)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button><div className="flex"><Button variant="ghost" size="icon" disabled={busy} onClick={() => image(false)} title="Pakua kadi" aria-label={`Pakua kadi: ${card.title}`}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={busy} onClick={() => image(true)} title="Shiriki picha ya kadi" aria-label={`Shiriki picha: ${card.title}`}><Share2 className="h-4 w-4" /></Button></div></div>
 </article>;
}
export function ServiceHubCards() { return <section id="taarifa" className="mx-auto max-w-5xl px-5 py-12"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-success">Habari njema</p><h2 className="mt-2 font-semibold">Huduma zipo. Karibu tena.</h2></div></div><div className="grid gap-5 md:grid-cols-3">{cards.map(card => <ShareCard key={card.id} card={card} />)}</div></section>; }
