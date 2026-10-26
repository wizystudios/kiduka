import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
export function usePlatformAnnouncements(){
 const {user}=useAuth();const [items,setItems]=useState<Tables<'platform_announcements'>[]>([]);const [choices,setChoices]=useState<Record<string,string>>({});const [error,setError]=useState('');
 const load=useCallback(async()=>{if(!user)return;const [a,p]=await Promise.all([supabase.from('platform_announcements').select('*').eq('is_active',true).order('created_at',{ascending:false}),supabase.from('release_preferences').select('*').eq('user_id',user.id)]);if(a.error||p.error){setError('Arifa hazijapakiwa. Jaribu tena.');return;}setError('');setItems(a.data||[]);setChoices(Object.fromEntries((p.data||[]).map(x=>[x.announcement_id,x.choice])));},[user?.id]);
 useEffect(()=>{if(!user){setItems([]);setChoices({});return;}void load();const c=supabase.channel(`announcements-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'platform_announcements'},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c);};},[load,user?.id]);
 const choose=async(id:string,choice:'accepted'|'later'|'read')=>{if(!user)return false;const {error}=await supabase.from('release_preferences').upsert({user_id:user.id,announcement_id:id,choice,updated_at:new Date().toISOString()});if(error){setError('Chaguo halijahifadhiwa. Jaribu tena.');return false;}setChoices(p=>({...p,[id]:choice}));return true;};
 return {items,choices,choose,error,load};
}
