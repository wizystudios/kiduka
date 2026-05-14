// Subscription expiry reminder: scans user_subscriptions for trials/active subs
// ending in {7, 3, 1} days and sends owner-subscription-reminder.
// Test mode: pass { ownerId, force: true, adminMessage } to send to one owner now.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TARGET_DAYS = [7, 3, 1]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: any = {}
    try { body = await req.json() } catch { body = {} }
    const { ownerId, force, adminMessage } = body || {}

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    let query = admin.from('user_subscriptions')
      .select('id, user_id, status, trial_ends_at, current_period_end, payment_amount, calculated_fee')
      .in('status', ['trial', 'active'])
    if (ownerId) query = query.eq('user_id', ownerId)
    const { data: subs } = await query

    let sent = 0
    for (const s of (subs || []) as any[]) {
      const endIso = s.status === 'trial' ? s.trial_ends_at : s.current_period_end
      if (!endIso) {
        if (!force) continue
      }
      const days = endIso
        ? Math.round((new Date(endIso).getTime() - Date.now()) / 86400000)
        : 0
      if (!force && !TARGET_DAYS.includes(days)) continue

      const { data: profile } = await admin.from('profiles')
        .select('email, full_name, email_notifications_enabled, email_consent')
        .eq('id', s.user_id).maybeSingle()
      if (!profile?.email) continue
      if (!force) {
        if (profile.email_notifications_enabled === false) continue
        const consent = profile.email_consent || {}
        if (consent.subscription === false) continue
      }

      const dayKey = new Date().toISOString().slice(0, 10)
      const idempotency = force
        ? `sub-reminder-test-${s.id}-${Date.now()}`
        : `sub-reminder-${s.id}-${days}d-${dayKey}`

      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'owner-subscription-reminder',
          recipientEmail: profile.email,
          idempotencyKey: idempotency,
          templateData: {
            name: profile.full_name,
            daysLeft: days,
            endsAt: endIso,
            amount: s.payment_amount || s.calculated_fee,
            adminMessage: adminMessage || undefined,
            isTest: !!force,
          },
        },
      })

      // In-app
      await admin.from('admin_notifications').insert({
        notification_type: 'subscription_reminder',
        title: force ? 'Kumbusho la Usajili (Jaribio)' : 'Kumbusho la Usajili',
        message: force
          ? `Jaribio: ${profile.email} amekumbushwa kuhusu usajili.`
          : `Mmiliki ${profile.email} amekumbushwa — usajili unaisha baada ya siku ${days}`,
        data: { subscription_id: s.id, user_id: s.user_id, days_left: days, test: !!force },
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent, mode: force ? 'test' : 'cron' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
