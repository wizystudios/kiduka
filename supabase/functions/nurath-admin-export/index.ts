// Super Admin guard for Nurath diagnostics. Even if a non-admin loads the
// diagnostics route directly, this function verifies their JWT + role and
// returns 403 unless they are super_admin.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type Action = 'list' | 'incident-summary'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace('Bearer ', ''),
  )
  if (claimsErr || !claimsData?.claims?.sub) {
    return json({ error: 'Unauthorized' }, 401)
  }
  const userId = claimsData.claims.sub as string

  // Server-side role check using service role (RLS-bypassing) — single source of truth.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: roleRow, error: roleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle()

  if (roleErr || !roleRow) {
    return json({ error: 'Forbidden — super admin only' }, 403)
  }

  let body: { action?: Action; limit?: number; windowMinutes?: number } = {}
  try {
    if (req.method === 'POST') body = await req.json()
  } catch {
    body = {}
  }
  const action: Action = body.action ?? 'list'

  if (action === 'incident-summary') {
    const minutes = Math.min(Math.max(body.windowMinutes ?? 60, 5), 1440)
    const cutoff = new Date(Date.now() - minutes * 60_000).toISOString()
    const { data: logs, error } = await admin
      .from('nurath_logs')
      .select('id,user_id,kind,wake_triggered,note,response,api_latency_ms,created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) return json({ error: error.message }, 500)

    const total = logs?.length ?? 0
    const isFailure = (log: any) => {
      const note = (log.note || '').toLowerCase()
      return (
        log.kind === 'error' ||
        log.wake_triggered === false ||
        note.includes('no speech') ||
        note.includes('usable answer') ||
        note.includes('auto-reset') ||
        (log.kind === 'reply' && !log.response)
      )
    }
    const failures = (logs ?? []).filter(isFailure)

    const errorTypeCounts: Record<string, number> = {
      'no-wake': 0, 'no-speech': 0, 'no-response': 0, 'system-error': 0, 'auto-reset': 0,
    }
    const shopCounts = new Map<string, number>()
    for (const log of failures) {
      const note = (log.note || '').toLowerCase()
      if (log.kind === 'error') errorTypeCounts['system-error'] += 1
      if (log.wake_triggered === false) errorTypeCounts['no-wake'] += 1
      if (note.includes('no speech')) errorTypeCounts['no-speech'] += 1
      if (note.includes('usable answer') || (log.kind === 'reply' && !log.response)) errorTypeCounts['no-response'] += 1
      if (note.includes('auto-reset')) errorTypeCounts['auto-reset'] += 1
      shopCounts.set(log.user_id, (shopCounts.get(log.user_id) ?? 0) + 1)
    }

    const userIds = [...shopCounts.keys()]
    let profiles: Array<{ id: string; business_name: string | null; full_name: string | null; email: string | null }> = []
    if (userIds.length > 0) {
      const { data } = await admin
        .from('profiles')
        .select('id, business_name, full_name, email')
        .in('id', userIds)
      profiles = data ?? []
    }
    const nameOf = (id: string) => {
      const p = profiles.find((x) => x.id === id)
      return p?.business_name || p?.full_name || p?.email || 'Biashara isiyojulikana'
    }
    const topShops = [...shopCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ user_id: id, name: nameOf(id), failures: count }))

    return json({
      windowMinutes: minutes,
      total,
      failures: failures.length,
      failureRate: total ? Math.round((failures.length / total) * 100) : 0,
      errorTypeCounts,
      topShops,
      generatedAt: new Date().toISOString(),
    })
  }

  // Default: list logs
  const limit = Math.min(Math.max(body.limit ?? 500, 1), 2000)
  const { data: logs, error } = await admin
    .from('nurath_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return json({ error: error.message }, 500)

  const userIds = [...new Set((logs ?? []).map((l: any) => l.user_id).filter(Boolean))]
  let shops = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, business_name, full_name')
      .in('id', userIds)
    shops = new Map(
      (profiles ?? []).map((p: any) => [p.id, p.business_name || p.full_name || 'Biashara isiyojulikana']),
    )
  }
  const enriched = (logs ?? []).map((l: any) => ({ ...l, shop_name: shops.get(l.user_id) || 'Biashara isiyojulikana' }))
  return json({ logs: enriched })
})
