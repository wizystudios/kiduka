import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
const schema = z.discriminatedUnion('action', [
 z.object({action:z.literal('list'), page:z.number().int().min(0).max(10000).default(0)}),
 z.object({action:z.literal('details'), request_id:z.string().uuid()}),
 z.object({action:z.literal('status'), request_id:z.string().uuid(), status:z.enum(['pending','confirmed','answered','cancelled'])}),
 z.object({action:z.literal('reply'), request_id:z.string().uuid(), reply_id:z.string().uuid(), channel:z.enum(['email','whatsapp']), message:z.string().trim().min(10).max(2000)})
]);
Deno.serve(async req => {
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS') return respond({});
 if(req.method!=='POST') return respond({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key) return respond({error:'Huduma haipatikani'},503);
 const db=createClient(url,key);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token) return respond({error:'Ingia kwanza'},401);
 const {data:{user},error:authError}=await db.auth.getUser(token);
 if(authError||!user) return respond({error:'Ingia kwanza'},401);
 const {data:role,error:roleError}=await db.from('user_roles').select('id').eq('user_id',user.id).eq('role','super_admin').maybeSingle();
 if(roleError||!role) return respond({error:'Msimamizi pekee'},403);
 try {
 const raw=await req.text(); if(raw.length>12000) return respond({error:'Ombi kubwa sana'},413);
 const parsed=schema.safeParse(JSON.parse(raw)); if(!parsed.success) return respond({error:'Hakiki ombi'},400);
 const v=parsed.data;
 if(v.action==='list') {const {data,error,count}=await db.from('servicehub_requests').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(v.page*30,v.page*30+29); if(error) throw error; return respond({requests:data,total:count});}
 const {data:record,error}=await db.from('servicehub_requests').select('*').eq('id',v.request_id).maybeSingle();
 if(error) throw error; if(!record) return respond({error:'Ombi halipo'},404);
 if(v.action==='details') { const {data,error}=await db.from('servicehub_replies').select('*').eq('request_id',record.id).order('created_at'); if(error) throw error; return respond({replies:data}); }
 if(v.action==='status') {const {error}=await db.from('servicehub_requests').update({status:v.status}).eq('id',record.id); if(error) throw error; return respond({success:true});}
 const {data:existing,error:lookupError}=await db.from('servicehub_replies').select('*').eq('id',v.reply_id).maybeSingle(); if(lookupError) throw lookupError;
 if(existing && (existing.request_id!==record.id||existing.message!==v.message||existing.channel!==v.channel)) return respond({error:'Kumbukumbu ya jibu si sahihi'},409);
 if(existing?.delivery_status==='queued'||existing?.delivery_status==='opened') return respond({success:true,status:existing.delivery_status});
 if(!existing) {const {error}=await db.from('servicehub_replies').insert({id:v.reply_id,request_id:record.id,admin_id:user.id,channel:v.channel,message:v.message}); if(error) throw error;}
 let status='opened'; let whatsappUrl: string|undefined;
 if(v.channel==='email') {
 const {data,error}=await db.functions.invoke('send-transactional-email',{body:{templateName:'servicehub-reply',recipientEmail:record.email,idempotencyKey:`servicehub-reply-${v.reply_id}`,templateData:{message:v.message,reference:record.id}}});
 status=!error&&data?.success===true?'queued':'failed';
 } else {
 let digits=String(record.phone).replace(/\D/g,''); if(digits.startsWith('0')&&digits.length===10) digits='255'+digits.slice(1); if(digits.length===9) digits='255'+digits;
 if(!/^[1-9]\d{8,14}$/.test(digits)) return respond({error:'Namba ya WhatsApp si sahihi'},400);
 whatsappUrl=`https://wa.me/${digits}?text=${encodeURIComponent(`Kiduka ServiceHUB · ${record.id.slice(0,8).toUpperCase()}\n${v.message}`)}`;
 }
 const {error:saveError}=await db.from('servicehub_replies').update({delivery_status:status}).eq('id',v.reply_id); if(saveError) throw saveError;
 if(status==='failed') return respond({error:'Email haijawekwa kwenye foleni; jaribu tena au tumia WhatsApp'},502);
 await db.from('servicehub_requests').update({status:'confirmed'}).eq('id',record.id);
 return respond({success:true,status,whatsappUrl});
 } catch {return respond({error:'Ombi halijakamilika. Jaribu tena.'},500);}
});
