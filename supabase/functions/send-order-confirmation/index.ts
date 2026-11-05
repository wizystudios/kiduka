// Sends a Sokoni order confirmation for a fresh, consented order.
// Recipient and content come from the stored order, never from the browser.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail, serviceClient } from '../_shared/app-email.ts'

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  let orderId = ''
  try { orderId = String((await req.json())?.orderId || '') } catch { /* invalid */ }
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'Invalid order' }, 400)

  const db = serviceClient()
  const { data: order } = await db.from('sokoni_orders')
    .select('customer_email, customer_name, email_consent, created_at, tracking_code, total_amount, items, payment_method')
    .eq('id', orderId).maybeSingle()
  const fresh = order && Date.now() - new Date(order.created_at).getTime() < 15 * 60 * 1000
  if (!order || !fresh || !order.email_consent || !order.customer_email) return json({ error: 'Forbidden' }, 403)

  const items = Array.isArray(order.items) ? order.items : []
  const result = await sendAppEmail('customer-order-confirmation', String(order.customer_email), {
    db,
    idempotencyKey: `sokoni-confirm-${orderId}`,
    templateData: {
      customerName: order.customer_name || undefined,
      trackingCode: order.tracking_code,
      totalAmount: order.total_amount,
      items: items.map((i: any) => ({ name: i.product_name, quantity: i.quantity, price: i.unit_price })),
      paymentMethod: order.payment_method,
    },
  })
  return json(result)
})
