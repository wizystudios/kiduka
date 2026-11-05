// Database-triggered owner notifications (new Sokoni order, low stock, ...).
// The database stores each notification first and passes only its id, so this
// endpoint can only send stored, unprocessed rows to the owner's own email.
import { sendAppEmail, serviceClient } from '../_shared/app-email.ts'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  let id = ''
  try { id = String((await req.json())?.notificationId || '') } catch { /* invalid */ }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid notification' }, 400)

  const db = serviceClient()
  // Claim the row once; redeliveries and guesses find nothing to send.
  const { data: row, error } = await db.from('owner_email_notifications')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', id).is('processed_at', null)
    .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .select('owner_id, template_name, idempotency_key, template_data').maybeSingle()
  if (error) { console.error('claim failed', { code: error.code, message: error.message }); return json({ error: 'Server error' }, 500) }
  if (!row) return json({ success: false, reason: 'not_found' }, 404)
  if (!row.template_name.startsWith('owner-') || !TEMPLATES[row.template_name]) return json({ error: 'Invalid template' }, 400)

  const { data: profile } = await db.from('profiles').select('email').eq('id', row.owner_id).maybeSingle()
  if (!profile?.email) return json({ success: false, reason: 'no_email' })

  return json(await sendAppEmail(row.template_name, profile.email, {
    db,
    idempotencyKey: row.idempotency_key ?? `owner-notify-${id}`,
    templateData: (row.template_data as Record<string, any>) ?? {},
  }))
})
