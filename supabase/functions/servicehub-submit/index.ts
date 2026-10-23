import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
const schema = z.object({ kind: z.enum(['booking', 'question']), name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), phone: z.string().trim().regex(/^\+?[\d\s()-]{9,20}$/), message: z.string().trim().min(10).max(2000), appointment_at: z.string().datetime().nullable(), website: z.string().max(0).optional() }).superRefine((v, c) => { if (v.kind === 'booking' && (!v.appointment_at || Date.parse(v.appointment_at) <= Date.now())) c.addIssue({ code: 'custom', message: 'Chagua muda wa baadaye.' }); if (v.kind === 'question' && v.appointment_at !== null) c.addIssue({ code: 'custom', message: 'Swali halihitaji miadi.' }); });
Deno.serve(async req => {
 const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
 if (req.method === 'OPTIONS') return reply({});
 if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
 if (Number(req.headers.get('content-length') || 0) > 12000) return reply({ error: 'Ombi ni kubwa sana.' }, 413);
 try {
  const text = await req.text(); if (text.length > 12000) return reply({ error: 'Ombi ni kubwa sana.' }, 413);
  const parsed = schema.safeParse(JSON.parse(text)); if (!parsed.success) return reply({ error: 'Hakiki jina, email, simu, ujumbe na muda wa miadi.' }, 400);
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Huduma haipatikani kwa sasa.' }, 503);
  const db = createClient(url, key);
  const { website, ...input } = parsed.data;
  const { data: record, error } = await db.from('servicehub_requests').insert(input).select('id').single();
  if (error || !record) return reply({ error: 'Ombi halijahifadhiwa. Jaribu tena.' }, 500);
  const { data: emailResult, error: emailError } = await db.functions.invoke('send-transactional-email', { body: { templateName: 'servicehub-request', recipientEmail: 'smartshoppos795@gmail.com', idempotencyKey: `servicehub-${record.id}`, templateData: { ...input, reference: record.id } } });
  const queued = !emailError && emailResult?.success === true;
  await db.from('servicehub_requests').update({ notification_status: queued ? 'queued' : 'failed' }).eq('id', record.id);
  return reply({ success: true, reference: record.id, emailQueued: queued });
 } catch { return reply({ error: 'Ombi halijakamilika. Hakiki taarifa zako.' }, 400); }
});
