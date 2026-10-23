import { useEffect, useState } from 'react';
import clip from '@/assets/huduma-shop.mp4.asset.json';
import products from '@/assets/huduma-products.jpg.asset.json';
import reports from '@/assets/huduma-reports.jpg.asset.json';
import scanner from '@/assets/huduma-scanner.jpg.asset.json';
import hero from '@/assets/huduma-hero.jpg';
import { Button } from '@/components/ui/button';

export const instructionSlides = [
  { title: 'Scan na risiti', image: scanner.url, text: 'Scan au tafuta bidhaa → hakiki kikapu → kamilisha mauzo → fungua risiti yenye jina la duka.' },
  { title: 'Bidhaa na stoo', image: products.url, text: 'Ongeza picha na bei → weka kiasi cha stoo → mauzo hupunguza stoo → angalia bidhaa zinazokaribia kuisha.' },
  { title: 'Ripoti na malipo', image: reports.url, text: 'Chagua kipindi cha ripoti → linganisha mapato na gharama → fungua Malipo kuona bili na salio.' },
];

export function InstructionMedia({ index = 0, video = false }: { index?: number; video?: boolean }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); setReduced(mq.matches); }, []);
  if (video) return <video src={clip.url} poster={hero} controls autoPlay={!reduced} muted loop playsInline preload="metadata" aria-label="Muuzaji dukani — video iliyotengenezwa kwa AI" className="aspect-video w-full rounded-3xl object-cover" />;
  const slide = instructionSlides[index % instructionSlides.length];
  return <img src={slide.image} alt={`Picha halisi ya Kiduka: ${slide.title}`} className="aspect-[4/3] w-full rounded-2xl border border-border object-contain bg-background motion-safe:animate-fade-in" />;
}

export function InstructionCards() {
  const [index, setIndex] = useState(0);
  return <div className="space-y-4"><InstructionMedia index={index} /><div className="flex flex-wrap justify-center gap-2">{instructionSlides.map((slide, i) => <Button key={slide.title} variant={index === i ? 'default' : 'outline'} size="sm" onClick={() => setIndex(i)}>{slide.title}</Button>)}</div><p className="text-sm leading-relaxed text-muted-foreground">{instructionSlides[index].text}</p></div>;
}
