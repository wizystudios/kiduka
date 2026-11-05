import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

export type Caller =
  | { kind: 'service' }
  | { kind: 'user'; id: string; email: string | null; isSuperAdmin: boolean }
  | { kind: 'none' }

const bearer = (req: Request) => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()

/** Identify the caller: trusted server (service key), signed-in user, or nobody. */
export async function identifyCaller(req: Request): Promise<Caller> {
  const token = bearer(req)
  if (!token) return { kind: 'none' }
  if (token === SERVICE_KEY) return { kind: 'service' }
  // Service-level keys (e.g. vault copies) can list users; user/anon tokens cannot.
  try {
    const probe = createClient(URL, token, { auth: { persistSession: false } })
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!error) return { kind: 'service' }
  } catch { /* not a service key */ }
  const userClient = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data } = await userClient.auth.getUser(token)
  if (!data?.user) return { kind: 'none' }
  const admin = createClient(URL, SERVICE_KEY)
  const { data: role } = await admin.from('user_roles').select('role')
    .eq('user_id', data.user.id).eq('role', 'super_admin').maybeSingle()
  return { kind: 'user', id: data.user.id, email: data.user.email?.toLowerCase() ?? null, isSuperAdmin: !!role }
}

export const isServiceOrAdmin = (c: Caller) => c.kind === 'service' || (c.kind === 'user' && c.isSuperAdmin)

/** Mask an email or phone for logs: keeps only the first character and domain/last digits. */
export const mask = (v?: string | null) => {
  if (!v) return ''
  const s = String(v)
  if (s.includes('@')) { const [u, d] = s.split('@'); return `${u.slice(0, 1)}***@${d}` }
  return s.length > 3 ? `***${s.slice(-3)}` : '***'
}

/**
 * True when the phone belongs to a customer (or Sokoni order) the signed-in caller can already see
 * through row-level security, or to the caller's own profile. Super admins are allowed any number.
 */
// deno-lint-ignore no-explicit-any
export async function canMessagePhone(userClient: any, userId: string, phone: string): Promise<boolean> {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 15) return false
  const tail = digits.slice(-9)
  const { data: sa } = await userClient.from('user_roles').select('role').eq('user_id', userId).eq('role', 'super_admin').maybeSingle()
  if (sa) return true
  const checks = [
    userClient.from('customers').select('id').ilike('phone', `%${tail}`).limit(1),
    userClient.from('sokoni_orders').select('id').ilike('customer_phone', `%${tail}`).limit(1),
    userClient.from('profiles').select('id').eq('id', userId).ilike('phone', `%${tail}`).limit(1),
  ]
  const results = await Promise.all(checks.map((q) => q.then((r: { data: unknown[] | null }) => r, () => ({ data: null }))))
  return results.some((r: { data: unknown[] | null }) => Array.isArray(r.data) && r.data.length > 0)
}

const tail9 = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-9)

/**
 * Payment prompts may only go to a phone tied to the bill:
 * - subscription: the owner's own profile phone (when one is saved)
 * - order: the unpaid order's own customer phone
 * Returns an error message, or null when allowed.
 */
// deno-lint-ignore no-explicit-any
export async function paymentTargetError(admin: any, userId: string, type: string, phone: string, orderId?: string | null): Promise<string | null> {
  if (type === 'subscription_payment') {
    const { data: p } = await admin.from('profiles').select('phone').eq('id', userId).maybeSingle()
    if (p?.phone && tail9(p.phone) !== tail9(phone)) return 'Tumia namba ya simu iliyo kwenye wasifu wako'
    return null
  }
  if (!orderId) return 'Oda haijatajwa'
  const { data: o } = await admin.from('sokoni_orders').select('customer_phone, payment_status').eq('id', orderId).maybeSingle()
  if (!o) return 'Oda haijapatikana'
  if (o.payment_status === 'paid') return 'Oda hii imeshalipwa'
  if (tail9(o.customer_phone) !== tail9(phone)) return 'Namba lazima iwe ya mteja wa oda hii'
  return null
}
