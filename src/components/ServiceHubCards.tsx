import { useRef, useState } from 'react';
import { Share2, Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { instructionSlides } from '@/components/InstructionMedia';
import hero from '@/assets/huduma-hero.jpg';
import { assetUrl } from '@/lib/assetUrl';
import { hubWhatsAppLink, serviceHubMessage } from '@/lib/serviceHub';
import { toast } from 'sonner';
const cards = [
 { id: 'tumerudi', title: 'Tumerudi na nguvu mpya.', text: 'Kiduka inapatikana tena! Tuko tayari kukuhudumia: mauzo, stoo, madeni, matawi na Sokoni. Karibu tuendelee kuikuza biashara yako.', image: hero, caption: 'Picha ya AI · Kiduka' },
 { id: 'mauzo', title: 'Mauzo yenye kumbukumbu.', text: 'Scan bidhaa, hakiki kikapu na fungua risiti yenye jina la duka. Omba miadi ya kuoneshwa Kiduka kupitia ServiceHUB.', image: assetUrl(instructionSlides[2].image), caption: 'Kiduka halisi · Ripoti za biashara' },
 { id: 'biashara', title: 'Biashara yako, pamoja.', text: 'Panga bidhaa na stoo, fuatilia taarifa za biashara na simamia matawi yako. Tupo kukusaidia kuanza na kutumia Kiduka.', image: assetUrl(instructionSlides[1].image), caption: 'Kiduka halisi · Bidhaa na stoo' },
];
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
 return <article className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card"><div ref={ref} className="bg-card text-card-foreground"><img src={card.image} alt={card.caption} crossOrigin="anonymous" className={`aspect-[4/3] w-full ${card.id === 'tumerudi' ? 'object-cover' : 'object-contain'}`} /><div className="p-5"><p className="text-xs font-semibold text-primary">KIDUKA · ServiceHUB</p><h3 className="mt-2 font-semibold">{card.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.text}</p><p className="mt-4 text-xs font-medium text-success">kiduka.shop/servicehub · +255 797 813 597</p><p className="mt-2 text-[10px] text-muted-foreground">{card.caption}</p></div></div><div className="flex items-center justify-between gap-1 border-t border-border px-4 py-2"><Button asChild variant="ghost" size="sm" className="px-2 text-success"><a href={hubWhatsAppLink(message)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button><div className="flex"><Button variant="ghost" size="icon" disabled={busy} onClick={() => image(false)} title="Pakua kadi" aria-label={`Pakua kadi: ${card.title}`}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon" disabled={busy} onClick={() => image(true)} title="Shiriki picha ya kadi" aria-label={`Shiriki picha: ${card.title}`}><Share2 className="h-4 w-4" /></Button></div></div></article>;
}
export function ServiceHubCards() { return <section id="taarifa" className="mx-auto max-w-5xl px-5 py-12"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-success">Habari njema</p><h2 className="mt-2 font-semibold">Huduma zipo. Karibu tena.</h2></div></div><div className="grid gap-5 md:grid-cols-3">{cards.map(card => <ShareCard key={card.id} card={card} />)}</div></section>; }
