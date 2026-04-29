import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
              source: {
                type: 'base64',
                media_type: mediaType || 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: "Extract the complete rate table from this freight carrier rate card PDF as CSV.\n\nFirst detect the pricing model:\n- Model B: zones/regions as rows with basic charge + per kg rate + minimum. Use headers: Service,Zone,BasicCharge,PerKgRate,Minimum\n- Model C: destination city/location names as rows with multiple weight break columns (1-250kg, 251-500kg etc). Use headers: OriginDepot,Destination,BasicCharge,Minimum,PerKg_1-250,PerKg_251-500,PerKg_501-1000,PerKg_1001-3000,PerKg_3001-12000,PerKg_12001+\n\nRules:\n- Extract EVERY row without exception\n- Numbers only — no $ signs, no commas\n- For Model C: OriginDepot comes from the header (e.g. EX MELBOURNE = Melbourne), fill it on every row\n- Respond with ONLY the CSV content. No explanation, no markdown, no backticks, no blank lines before the headers.",
            },
          ],
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API error')
    }

    const csv = data.content?.[0]?.text || ''
    const lines = csv.trim().split('\n')
    const rowCount = Math.max(0, lines.length - 1)

    console.log('Converted PDF for carrier:', carrierName, '| rows:', rowCount)

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
