import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Extract the user's JWT from the Authorization header.
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!jwt) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Validate the JWT and resolve the user ID.
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)

  if (userError || !user) {
    return json({ error: 'Invalid or expired token' }, 401)
  }

  // Fetch the merchant_id for this user from the profiles table.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('merchant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.merchant_id) {
    return json({ error: 'Merchant record not found' }, 404)
  }

  return json({ merchant_id: profile.merchant_id }, 200)
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
