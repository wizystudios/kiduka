// Admin-only template preview endpoint. Returns rendered HTML for one or all templates.
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: roleRow } = await admin
    .from('user_roles').select('role')
    .eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
  if (!roleRow) return new Response('Forbidden', { status: 403, headers: corsHeaders })

  const url = new URL(req.url)
  const name = url.searchParams.get('name')
  if (name) {
    const entry = TEMPLATES[name]
    if (!entry) return new Response('Not found', { status: 404, headers: corsHeaders })
    try {
      const html = await renderAsync(React.createElement(entry.component, entry.previewData || {}))
      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    } catch (e) {
      return new Response(`<pre style="color:red;padding:20px">Render failed: ${(e as Error).message}</pre>`, {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  // List all available templates
  return new Response(JSON.stringify({
    templates: Object.entries(TEMPLATES).map(([k, v]) => ({
      name: k,
      displayName: v.displayName || k,
    })),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
