import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, merchantId } = await req.json()

    console.log('Remove request:', { userId, merchantId })

    if (!userId || !merchantId) {
      return new Response(
        JSON.stringify({ error: 'userId and merchantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data: { user: callerUser }, error: authError } = await supabaseCaller.auth.getUser()
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (callerUser.id === userId) {
      return new Response(
        JSON.stringify({ error: 'You cannot remove yourself.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, merchant_id')
      .eq('id', callerUser.id)
      .single()

    if (callerProfileError || !callerProfile || callerProfile.role !== 'admin' || callerProfile.merchant_id !== merchantId) {
      return new Response(
        JSON.stringify({ error: 'Only admins can remove team members.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, merchant_id')
      .eq('id', userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetProfile.merchant_id !== merchantId) {
      return new Response(
        JSON.stringify({ error: 'User does not belong to this merchant.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (targetProfile.role === 'admin') {
      const { count, error: countError } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('role', 'admin')

      if (countError) throw countError

      if ((count ?? 0) <= 1) {
        return new Response(
          JSON.stringify({ error: 'Cannot remove the last admin.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    console.log('Removed user:', userId)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Remove team member error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
