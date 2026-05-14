// Returns email history for the authenticated owner — filtered by their email
// and (optionally) by template prefix (e.g., "owner-compliance" or "owner-subscription").
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const category = url.searchParams.get('category') || 'all' // compliance | subscription | payment | all
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // Owner's email
    const { data: profile } = await admin.from('profiles').select('email').eq('id', user.id).maybeSingle()
    if (!profile?.email) {
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let q = admin.from('email_send_log')
      .select('id, message_id, template_name, recipient_email, status, error_message, metadata, created_at')
      .ilike('recipient_email', profile.email)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category === 'compliance') q = q.like('template_name', 'owner-compliance%')
    else if (category === 'subscription') q = q.like('template_name', 'owner-subscription%')
    else if (category === 'payment') q = q.like('template_name', 'owner-payment%')

    const { data, error } = await q
    if (error) throw error

    // Dedup by message_id (latest only)
    const seen = new Set<string>()
    const rows: any[] = []
    for (const r of (data || [])) {
      const k = r.message_id || r.id
      if (seen.has(k)) continue
      seen.add(k)
      rows.push(r)
    }

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
