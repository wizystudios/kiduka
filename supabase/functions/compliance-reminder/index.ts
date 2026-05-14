// Compliance reminder dispatcher: scans business_compliance + business_contracts
// and sends owner-compliance-reminder emails. Idempotent per day.
// Can be invoked by pg_cron OR manually by admin (with optional ownerId + adminMessage).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface OwnerJob {
  ownerId: string
  email: string
  fullName?: string | null
  missing: string[]
  contractStatus?: string
  expiresAt?: string | null
  daysLeft?: number
  adminMessage?: string
}

const dayKey = () => new Date().toISOString().slice(0, 10)

const sendForOwner = async (admin: any, job: OwnerJob, adminMessage?: string) => {
  const idem = adminMessage
    ? `compliance-manual-${job.ownerId}-${Date.now()}`
    : `compliance-${job.ownerId}-${dayKey()}`
  await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'owner-compliance-reminder',
      recipientEmail: job.email,
      idempotencyKey: idem,
      templateData: {
        name: job.fullName,
        missing: job.missing,
        contractStatus: job.contractStatus,
        expiresAt: job.expiresAt,
        daysLeft: job.daysLeft,
        adminMessage,
      },
    },
  })
  // In-app notification
  await admin.from('admin_notifications').insert({
    notification_type: adminMessage ? 'compliance_admin_reminder' : 'compliance_reminder',
    title: adminMessage ? 'Ujumbe wa Sheria umetumwa' : 'Kumbusho la Sheria limetumwa',
    message: adminMessage || `Mmiliki ${job.email} amekumbushwa kuhusu: ${job.missing.join(', ') || job.contractStatus}`,
    data: { owner_id: job.ownerId, email: job.email, missing: job.missing, contract_status: job.contractStatus },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    let body: any = {}
    try { body = await req.json() } catch { /* cron call */ }

    // Manual single-owner mode
    if (body?.ownerId) {
      const { data: profile } = await admin.from('profiles')
        .select('id, email, full_name').eq('id', body.ownerId).maybeSingle()
      if (!profile?.email) throw new Error('Owner email not found')

      const { data: comp } = await admin.from('business_compliance')
        .select('*').eq('owner_id', body.ownerId).maybeSingle()
      const { data: contract } = await admin.from('business_contracts')
        .select('*').eq('owner_id', body.ownerId).maybeSingle()

      const missing: string[] = []
      if (!comp?.tin_number) missing.push('TIN')
      if (!comp?.nida_number) missing.push('NIDA')
      if (!comp?.business_license) missing.push('Leseni ya biashara')

      const job: OwnerJob = {
        ownerId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        missing,
        contractStatus: contract?.status === 'signed' ? 'Umesainiwa'
          : contract?.status === 'pending' ? 'Inahitaji kusainiwa'
          : contract?.status,
        expiresAt: contract?.expires_at,
        daysLeft: contract?.expires_at
          ? Math.max(0, Math.round((new Date(contract.expires_at).getTime() - Date.now()) / 86400000))
          : undefined,
      }
      await sendForOwner(admin, job, body.adminMessage)
      return new Response(JSON.stringify({ ok: true, sent: 1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cron mode: scan all owners with gaps OR contracts expiring in {7, 3, 1, 0} days
    const targetDays = [7, 3, 1, 0]

    const { data: comps } = await admin.from('business_compliance').select('*')
    const { data: contracts } = await admin.from('business_contracts').select('*')
    const ownerIds = new Set<string>()
    ;(comps || []).forEach((c: any) => {
      const missing: string[] = []
      if (!c.tin_number) missing.push('TIN')
      if (!c.nida_number) missing.push('NIDA')
      if (!c.business_license) missing.push('Leseni')
      if (missing.length) ownerIds.add(c.owner_id)
    })
    ;(contracts || []).forEach((c: any) => {
      if (!c.expires_at) {
        if (c.status !== 'signed') ownerIds.add(c.owner_id)
        return
      }
      const days = Math.round((new Date(c.expires_at).getTime() - Date.now()) / 86400000)
      if (targetDays.includes(days) || days < 0) ownerIds.add(c.owner_id)
    })

    let sent = 0
    for (const ownerId of ownerIds) {
      const { data: profile } = await admin.from('profiles')
        .select('id, email, full_name, email_notifications_enabled, email_consent')
        .eq('id', ownerId).maybeSingle()
      if (!profile?.email) continue
      // Respect consent (operations category)
      if (profile.email_notifications_enabled === false) continue
      const consent = profile.email_consent || {}
      if (consent.operations === false) continue

      const comp = (comps || []).find((c: any) => c.owner_id === ownerId)
      const contract = (contracts || []).find((c: any) => c.owner_id === ownerId)
      const missing: string[] = []
      if (!comp?.tin_number) missing.push('TIN')
      if (!comp?.nida_number) missing.push('NIDA')
      if (!comp?.business_license) missing.push('Leseni ya biashara')

      await sendForOwner(admin, {
        ownerId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        missing,
        contractStatus: contract?.status === 'signed' ? undefined
          : contract?.status === 'pending' ? 'Inahitaji kusainiwa' : contract?.status,
        expiresAt: contract?.expires_at,
        daysLeft: contract?.expires_at
          ? Math.round((new Date(contract.expires_at).getTime() - Date.now()) / 86400000)
          : undefined,
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
