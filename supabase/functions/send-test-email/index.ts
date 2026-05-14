// Send test emails (auth or transactional) - super_admin only
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { kind, email } = body as { kind: string; email: string }
    if (!email || !kind) throw new Error('Missing kind or email')

    let result: any = {}

    if (kind === 'signup' || kind === 'magiclink' || kind === 'recovery' || kind === 'invite') {
      const linkType = kind === 'magiclink' ? 'magiclink' : kind
      // For signup, we need a temp password
      const opts: any = { type: linkType, email }
      if (linkType === 'signup') opts.password = crypto.randomUUID()
      const { data, error } = await admin.auth.admin.generateLink(opts)
      if (error) throw error
      result = { ok: true, kind, link: data?.properties?.action_link, sentVia: 'auth-email-hook' }
    } else if (kind === 'order-confirmation') {
      const { data, error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'customer-order-confirmation',
          recipientEmail: email,
          idempotencyKey: `test-order-${Date.now()}`,
          templateData: {
            customerName: 'Mteja wa Jaribio',
            orderId: 'TEST-ORDER',
            trackingCode: 'SKN-TEST00',
            totalAmount: 25000,
            itemsCount: 2,
            sellerName: 'Duka la Jaribio',
          },
        },
      })
      if (error) throw error
      result = { ok: true, kind, response: data }
    } else {
      throw new Error(`Unknown kind: ${kind}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
