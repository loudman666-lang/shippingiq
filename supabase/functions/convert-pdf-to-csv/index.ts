import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pdfBase64, mediaType, carrierName } = await req.json()

    if (!pdfBase64 || !carrierName) {
      return new Response(
        JSON.stringify({ error: 'pdfBase64 and carrierName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin client used for both rate limit check and log insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Rate limit check — fails open if anything goes wrong
    let merchantId: string | null = null
    try {
      const authHeader = req.headers.get('Authorization')
      console.log('[rate-limit] auth header present:', !!authHeader)
      if (!authHeader) throw new Error('No Authorization header')

      const supabaseCaller = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )

      const { data: { user }, error: authError } = await supabaseCaller.auth.getUser()
      console.log('[rate-limit] getUser:', user?.id ?? 'null', '| error:', authError?.message ?? 'none')
      if (authError) throw authError
      if (!user) throw new Error('No user returned from getUser')

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('merchant_id')
        .eq('id', user.id)
        .single()
      console.log('[rate-limit] profile merchant_id:', profile?.merchant_id ?? 'null', '| error:', profileError?.message ?? 'none')
      if (profileError) throw profileError
      if (!profile?.merchant_id) throw new Error('Profile has no merchant_id')

      merchantId = profile.merchant_id
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { count, error: countError } = await supabaseAdmin
        .from('upload_logs')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('action', 'convert')
        .gte('created_at', since)
      console.log('[rate-limit] convert count:', count, '| error:', countError?.message ?? 'none')
      if (countError) throw countError

      if ((count ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: 'Daily conversion limit reached (5/day). Please try again tomorrow.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (rateLimitErr) {
      console.error('[rate-limit] check failed, continuing anyway:', (rateLimitErr as Error).message)
    }

    // Four parallel Claude calls with precise destination ranges
    const basePrompt = "Extract the rate table from this freight carrier rate card PDF as CSV.\n\nFirst detect the pricing model:\n- Model B: zones/regions as rows with basic charge + per kg rate + minimum. Use headers: Service,Zone,BasicCharge,PerKgRate,Minimum\n- Model C: destination city/location names as rows with multiple weight break columns (1-250kg, 251-500kg etc). Use headers: OriginDepot,Destination,BasicCharge,Minimum,PerKg_1-250,PerKg_251-500,PerKg_501-1000,PerKg_1001-3000,PerKg_3001-12000,PerKg_12001+\n\nRules:\n- Extract EVERY matching row without exception\n- Numbers only — no $ signs, no commas\n- For Model C: OriginDepot comes from the header (e.g. EX MELBOURNE = Melbourne), fill it on every row\n- Respond with ONLY the CSV content. No explanation, no markdown, no backticks, no blank lines before the headers."

    async function callClaude(partLabel: string, first: string, last: string): Promise<string> {
      const prompt = `This is part ${partLabel} of the extraction. Extract ONLY destinations starting from ${first} through to ${last} inclusive. Do not extract any destinations outside this range.\n\n${basePrompt}`
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: mediaType || 'application/pdf', data: pdfBase64 },
              },
              { type: 'text', text: prompt },
            ],
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error')
      return data.content?.[0]?.text || ''
    }

    const [csv1, csv2, csv3, csv4] = await Promise.all([
      callClaude('1/4', 'ADELAIDE', 'CROOKWELL'),
      callClaude('2/4', 'DALBY', 'LAUNCESTON'),
      callClaude('3/4', 'LEONORA', 'PORT PIRIE'),
      callClaude('4/4', 'PORTLAND', 'YOUNG'),
    ])

    const lines1 = csv1.trim().split('\n')
    const lines2 = csv2.trim().split('\n')
    const lines3 = csv3.trim().split('\n')
    const lines4 = csv4.trim().split('\n')
    const header = lines1[0]
    const dataRows1 = lines1.slice(1).filter(l => l.trim())
    const dataRows2 = lines2.slice(1).filter(l => l.trim())
    const dataRows3 = lines3.slice(1).filter(l => l.trim())
    const dataRows4 = lines4.slice(1).filter(l => l.trim())

    // Deduplicate by destination name (column index 1)
    const seen = new Set<string>()
    const allDataRows: string[] = []
    for (const row of [...dataRows1, ...dataRows2, ...dataRows3, ...dataRows4]) {
      const dest = row.split(',')[1]?.trim().toLowerCase() ?? row
      if (!seen.has(dest)) {
        seen.add(dest)
        allDataRows.push(row)
      }
    }

    const DEST_CORRECTIONS: Record<string, string> = {
      'COLLE': 'COLLIE',
      'CRAIGIIE': 'CRAIGIE',
      'DEVONFORT': 'DEVONPORT',
      'GOONIWINDI': 'GOONDIWINDI',
      'INGLEWOOD': 'INGHAM',
      'SEABROOK': 'SEAFORTH',
      'BREWARRINA': '',
    }

    const correctedRows = allDataRows.reduce<string[]>((acc, row) => {
      const fields = row.split(',')
      const dest = (fields[1] ?? '').trim().toUpperCase()
      if (dest in DEST_CORRECTIONS) {
        const replacement = DEST_CORRECTIONS[dest]
        if (replacement === '') return acc
        fields[1] = replacement
        return [...acc, fields.join(',')]
      }
      return [...acc, row]
    }, [])

    const csv = [header, ...correctedRows].join('\n')
    const rowCount = correctedRows.length

    console.log('Converted PDF for carrier:', carrierName, '| rows:', rowCount,
      '(ADELAIDE-CROOKWELL:', dataRows1.length,
      'DALBY-LAUNCESTON:', dataRows2.length,
      'LEONORA-PORT PIRIE:', dataRows3.length,
      'PORTLAND-YOUNG:', dataRows4.length, ')')

    // Log the conversion using admin client (SERVICE_ROLE_KEY)
    if (merchantId) {
      const { error: logError } = await supabaseAdmin
        .from('upload_logs')
        .insert({ merchant_id: merchantId, action: 'convert' })
      if (logError) console.error('[rate-limit] log insert failed:', logError.message)
    }

    return new Response(
      JSON.stringify({ csv, rowCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Convert PDF error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
