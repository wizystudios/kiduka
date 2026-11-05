// Sends the signed-in user a login alert to their own address only.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { identifyCaller } from '../_shared/caller.ts'
import { sendAppEmail } from '../_shared/app-email.ts'

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const caller = await identifyCaller(req)
  if (caller.kind !== 'user' || !caller.email) return json({ error: 'Forbidden' }, 403)
  let ua = 'unknown'
  try { const b = await req.json(); if (typeof b?.userAgent === 'string') ua = b.userAgent.slice(0, 300) } catch { /* optional */ }
  const minute = Math.floor(Date.now() / 60000)
  const result = await sendAppEmail('owner-login-alert', caller.email, {
    templateData: { email: caller.email, userAgent: ua, loggedInAt: new Date().toISOString() },
    idempotencyKey: `login-${caller.id}-${minute}`,
  })
  return json(result)
})
