import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAnnouncements } from '@/hooks/usePlatformAnnouncements';
import { Button } from '@/components/ui/button';
import { Download, Bell, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
export function KidukaUpdates({compact=false}:{compact?:boolean}){
 const {items,choices,choose,error,load}=usePlatformAnnouncements();const [busy,setBusy]=useState(false);const navigate=useNavigate();const location=useLocation();
 const visible=compact?items.filter(i=>!choices[i.id]).slice(0,1):items;
 if(compact&&location.pathname!=='/dashboard')return null;
 async function accept(id:string){setBusy(true);if(await choose(id,'accepted')){toast.success('Chaguo limehifadhiwa. Toleo lililochapishwa litafunguka.');window.location.assign(`${window.location.origin}/settings?tab=updates`);}setBusy(false);}
 return <section className={compact?'fixed inset-x-3 bottom-24 md:left-auto md:right-4 md:w-96 z-[60]':'p-4 space-y-4'}>{!compact&&<header className="flex justify-between items-center"><h2>Kiduka Update</h2><Button variant="ghost" size="icon" aria-label="Kagua masasisho" onClick={()=>void load()}><RefreshCw className="h-4 w-4"/></Button></header>}{!compact&&!items.length&&<p className="text-muted-foreground">Hakuna taarifa mpya za masasisho.</p>}{visible.map(i=><article key={i.id} className={compact?'bg-card border border-border rounded-3xl p-4 shadow-lg space-y-3':'border-b border-border pb-5 space-y-3'}><h3 className="flex items-center gap-2"><Bell className="h-5 w-5 shrink-0 text-primary"/>{i.title}{i.version&&<span className="text-xs text-muted-foreground">{i.version}</span>}</h3><p className="whitespace-pre-wrap break-words text-sm">{i.summary}</p><p className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString('sw-TZ')}{choices[i.id]==='accepted'?' · Umekubali':choices[i.id]==='later'?' · Umeahirisha':''}</p><div className="flex flex-wrap gap-2">{i.kind==='release'?<><Button size="sm" disabled={busy} onClick={()=>void accept(i.id)}><Download className="h-4 w-4 mr-2"/>Sasisha Kiduka</Button><Button size="sm" variant="outline" onClick={()=>void choose(i.id,'later')}>Baadaye</Button></>:<Button size="sm" variant="outline" onClick={()=>void choose(i.id,'read')}>Nimeelewa</Button>}{compact&&<Button size="sm" variant="ghost" onClick={()=>navigate('/settings?tab=updates')}>Muhtasari</Button>}</div></article>)}{error&&!compact&&<p role="alert" className="text-destructive">{error}</p>}</section>;
}
