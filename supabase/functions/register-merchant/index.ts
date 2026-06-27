import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, password } = body

  if (!email || !password) {
    return json({ error: 'email and password are required' }, 400)
  }

  // Create auth user — handle_new_user trigger auto-creates merchant + profile rows
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message ?? ''
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
      return json({ error: 'An account with this email already exists' }, 409)
    }
    if (msg.toLowerCase().includes('password')) {
      return json({ error: `Invalid password: ${msg}` }, 422)
    }
    return json({ error: msg || 'Failed to create user' }, 500)
  }

  const userId = authData.user.id

  // Trigger is synchronous — merchant + profile rows exist by now. Fetch merchant_id via profile.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('merchant_id, created_at')
    .eq('id', userId)
    .single()

  if (profileError || !profile?.merchant_id) {
    return json({ error: 'User created but merchant record not found. Check handle_new_user trigger.' }, 500)
  }

  const merchantId = profile.merchant_id
  const createdAt = profile.created_at

  // Notify
  await fetch(`${supabaseUrl}/functions/v1/notify-new-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ email, merchant_id: merchantId, created_at: createdAt }),
  })

  return json({ merchant_id: merchantId, message: 'Merchant registered successfully' }, 200)
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
