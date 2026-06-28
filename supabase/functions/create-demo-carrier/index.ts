import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { merchant_id } = await req.json()
    if (!merchant_id) {
      return new Response(JSON.stringify({ error: 'merchant_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Return early if demo carrier already exists for this merchant
    const { data: existing, error: checkError } = await supabase
      .from('carriers')
      .select('id')
      .eq('merchant_id', merchant_id)
      .eq('is_demo', true)
      .maybeSingle()

    if (checkError) throw new Error(checkError.message)
    if (existing) {
      return new Response(JSON.stringify({ ok: true, existing: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build postcodeMap covering major Australian postcode ranges
    type PostcodeEntry = { postcode: string; zoneCode: string; zone: string; state: string; suburb: string }
    const postcodeMap: PostcodeEntry[] = []
    const zoneRanges = [
      { from: 3000, to: 3999, zoneCode: 'Z1', zone: 'Zone 1', state: 'VIC' },
      { from: 2000, to: 2999, zoneCode: 'Z2', zone: 'Zone 2', state: 'NSW' },
      { from: 4000, to: 4999, zoneCode: 'Z3', zone: 'Zone 3', state: 'QLD' },
      { from: 5000, to: 5999, zoneCode: 'Z4', zone: 'Zone 4', state: 'SA' },
      { from: 6000, to: 6999, zoneCode: 'Z5', zone: 'Zone 5', state: 'WA' },
    ]
    for (const z of zoneRanges) {
      for (let p = z.from; p <= z.to; p++) {
        postcodeMap.push({ postcode: String(p), zoneCode: z.zoneCode, zone: z.zone, state: z.state, suburb: '' })
      }
    }

    const parsedData = {
      pricingModel: 'B',
      selectedOrigin: 'Melbourne',
      originDepots: ['Melbourne'],
      cubicFactor: 250,
      postcodeMap,
      modelBRates: [
        { originDepot: 'Melbourne', zoneCode: 'Z1', zone: 'Zone 1', service: 'Road Express', basicCharge: 8.50,  minimumCharge: 12.00, perKgRate: 0.085 },
        { originDepot: 'Melbourne', zoneCode: 'Z2', zone: 'Zone 2', service: 'Road Express', basicCharge: 12.00, minimumCharge: 18.00, perKgRate: 0.120 },
        { originDepot: 'Melbourne', zoneCode: 'Z3', zone: 'Zone 3', service: 'Road Express', basicCharge: 15.50, minimumCharge: 22.00, perKgRate: 0.155 },
        { originDepot: 'Melbourne', zoneCode: 'Z4', zone: 'Zone 4', service: 'Road Express', basicCharge: 11.00, minimumCharge: 16.00, perKgRate: 0.110 },
        { originDepot: 'Melbourne', zoneCode: 'Z5', zone: 'Zone 5', service: 'Road Express', basicCharge: 18.50, minimumCharge: 28.00, perKgRate: 0.185 },
      ],
      surcharges: [],
      manualPostcodeRanges: [
        { from: 3000, to: 3999, zone: 'Zone 1' },
        { from: 2000, to: 2999, zone: 'Zone 2' },
        { from: 4000, to: 4999, zone: 'Zone 3' },
        { from: 5000, to: 5999, zone: 'Zone 4' },
        { from: 6000, to: 6999, zone: 'Zone 5' },
      ],
    }

    const { error: insertError } = await supabase.from('carriers').insert({
      name: 'Example Carrier',
      is_demo: true,
      status: 'active',
      merchant_id,
      fuel_levy_pct: 15,
      parsed_data: parsedData,
      eligibility_rules: { maxWeightKg: 0, maxLengthCm: 0, maxWidthCm: 0, maxHeightCm: 0 },
      surcharge_rules: {},
    })

    if (insertError) throw new Error(insertError.message)

    return new Response(JSON.stringify({ ok: true, created: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
