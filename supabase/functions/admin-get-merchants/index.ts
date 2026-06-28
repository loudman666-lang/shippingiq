import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_EMAIL = 'loudman666@gmail.com'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!jwt) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders)
  }

  // Validate the caller's JWT using a user-context client (never used for DB ops).
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !user || user.email !== ADMIN_EMAIL) {
    return json({ error: 'Forbidden' }, 403, corsHeaders)
  }

  // Brand-new service role client created after auth validation.
  // Reads the key directly — not reusing any variable set before the auth check.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const method = req.method

  if (method === 'GET') {
    // Fetch all merchants with admin email and active carrier count.
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('id, name, plan, subscription, created_at, upload_limit_exempt')
      .order('created_at', { ascending: false })

    if (merchantsError) {
      return json({ error: merchantsError.message }, 500, corsHeaders)
    }

    // Fetch admin profiles for email lookup.
    const { data: profiles } = await supabase
      .from('profiles')
      .select('merchant_id, email')
      .eq('role', 'admin')

    // Fetch carrier counts per merchant.
    const { data: carriers } = await supabase
      .from('carriers')
      .select('merchant_id')

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) {
      profileMap[p.merchant_id] = p.email
    }

    const carrierCountMap: Record<string, number> = {}
    for (const c of carriers ?? []) {
      carrierCountMap[c.merchant_id] = (carrierCountMap[c.merchant_id] ?? 0) + 1
    }

    const result = (merchants ?? []).map(m => ({
      ...m,
      email: profileMap[m.id] ?? '',
      carrier_count: carrierCountMap[m.id] ?? 0,
    }))

    return json({ merchants: result }, 200, corsHeaders)
  }

  if (method === 'POST') {
    const body = await req.json()
    const { action, merchant_id } = body

    if (!merchant_id) {
      return json({ error: 'merchant_id required' }, 400, corsHeaders)
    }

    if (action === 'deactivate') {
      // Set subscription.status = 'inactive' without clobbering other subscription fields.
      const { data: existing } = await supabase
        .from('merchants')
        .select('subscription')
        .eq('id', merchant_id)
        .single()

      const updated = { ...(existing?.subscription ?? {}), status: 'inactive' }

      const { error } = await supabase
        .from('merchants')
        .update({ subscription: updated })
        .eq('id', merchant_id)

      if (error) return json({ error: error.message }, 500, corsHeaders)
      return json({ success: true }, 200, corsHeaders)
    }

    if (action === 'delete') {
      // quotes has NO ACTION FK — must be deleted before merchant.
      // Other tables (profiles, carriers, upload_logs, quote_logs) have CASCADE
      // but we delete them explicitly too and surface any errors.
      const deletes: [string, string][] = [
        ['quotes',      'merchant_id'],
        ['quote_logs',  'merchant_id'],
        ['upload_logs', 'merchant_id'],
        ['carriers',    'merchant_id'],
        ['profiles',    'merchant_id'],
      ]
      for (const [table, col] of deletes) {
        const { error: delErr } = await supabase.from(table).delete().eq(col, merchant_id)
        if (delErr) return json({ error: `Failed to delete from ${table}: ${delErr.message}` }, 500, corsHeaders)
      }

      const { error } = await supabase.from('merchants').delete().eq('id', merchant_id)
      if (error) return json({ error: error.message }, 500, corsHeaders)
      return json({ success: true }, 200, corsHeaders)
    }

    return json({ error: 'Unknown action' }, 400, corsHeaders)
  }

  return json({ error: 'Method not allowed' }, 405, corsHeaders)
})

function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
