// Shared app-email sender: keeps Kiduka's consent rules and email_send_log
// rows, then sends through Lovable's managed email API.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'

type Category = 'security' | 'operations' | 'subscription' | 'marketplace' | 'customer'

const TEMPLATE_CATEGORY: Record<string, Category> = {
  'owner-login-alert': 'security',
  'owner-settings-changed': 'security',
  'owner-subscription-request': 'subscription',
  'owner-large-transaction': 'operations',
  'owner-low-stock': 'operations',
  'owner-new-debt': 'operations',
  'owner-new-sokoni-order': 'marketplace',
  'customer-order-confirmation': 'customer',
  'customer-order-status': 'customer',
  'customer-order-receipt': 'customer',
  'customer-review-thanks': 'customer',
  'customer-return-update': 'customer',
}

export type AppEmailResult = { success: boolean; reason?: string }

export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function log(db: any, row: Record<string, unknown>) {
  const { error } = await db.from('email_send_log').insert({ message_id: null, ...row })
  if (error) console.error('email_send_log insert failed', { code: error.code, message: error.message })
}

async function consentBlock(db: any, templateName: string, to: string): Promise<string | null> {
  try {
    const category = TEMPLATE_CATEGORY[templateName]
    if (!category) return null
    if (category !== 'customer') {
      const { data: profile } = await db.from('profiles')
        .select('email_notifications_enabled, email_consent').ilike('email', to).maybeSingle()
      if (!profile) return null
      if (profile.email_notifications_enabled === false) return 'consent_master_disabled'
      if (((profile.email_consent as any) || {})[category] === false) return `consent_${category}_disabled`
      return null
    }
    const { data: customer } = await db.from('sokoni_customers')
      .select('email_transactional_consent').ilike('email', to).maybeSingle()
    return customer && customer.email_transactional_consent === false ? 'consent_customer_disabled' : null
  } catch (e) {
    console.warn('consent check failed (fail-open)', e)
    return null
  }
}

export async function sendAppEmail(
  templateName: string,
  to: string,
  opts: { templateData?: Record<string, any>; idempotencyKey?: string; db?: any } = {},
): Promise<AppEmailResult> {
  const db = opts.db ?? serviceClient()
  const base = { template_name: templateName, recipient_email: to }

  const blocked = await consentBlock(db, templateName, to)
  if (blocked) {
    await log(db, { ...base, status: 'suppressed', error_message: blocked })
    return { success: false, reason: 'consent_disabled' }
  }

  try {
    const result = await sendTemplateEmail(templateName, to, {
      templateData: opts.templateData,
      idempotencyKey: opts.idempotencyKey,
    })
    if (!result.sent) {
      await log(db, { ...base, status: 'suppressed' })
      return { success: false, reason: 'email_suppressed' }
    }
    await log(db, { ...base, status: 'sent' })
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await log(db, { ...base, status: 'failed', error_message: message.slice(0, 500) })
    console.error('app email failed', { templateName, message })
    return { success: false, reason: 'send_failed' }
  }
}
