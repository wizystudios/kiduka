// Database-triggered owner notifications (new Sokoni order, low stock, ...).
// Service-role callers only; the recipient is always the owner's own profile email.
import { identifyCaller } from '../_shared/caller.ts'
import { sendAppEmail, serviceClient } from '../_shared/app-email.ts'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if ((await identifyCaller(req)).kind !== 'service') return json({ error: 'Forbidden' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const ownerId = String(body?.ownerId || '')
  const templateName = String(body?.templateName || '')
  if (!/^[0-9a-f-]{36}$/i.test(ownerId)) return json({ error: 'Invalid owner' }, 400)
  if (!templateName.startsWith('owner-') || !TEMPLATES[templateName]) return json({ error: 'Invalid template' }, 400)

  const db = serviceClient()
  const { data: profile } = await db.from('profiles').select('email').eq('id', ownerId).maybeSingle()
  if (!profile?.email) return json({ success: false, reason: 'no_email' })

  const result = await sendAppEmail(templateName, profile.email, {
    db,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey.slice(0, 200) : undefined,
    templateData: body.templateData && typeof body.templateData === 'object' ? body.templateData : {},
  })
  return json(result)
})
