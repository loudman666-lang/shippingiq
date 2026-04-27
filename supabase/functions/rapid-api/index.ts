import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { carrierName, rateCard, zoneFile, surchargeDoc } = await req.json()

    const userContent: any[] = []

    userContent.push({
      type: 'text',
      text: `You are parsing Australian freight carrier files for a shipping rate engine called ShippingIQ.

Carrier: ${carrierName}

You will receive up to three files: a rate card, a zone file, and optionally an additional charges schedule.
These files may be CSV, Excel, or PDF format. Parse whatever you receive — do not refuse based on format.

PRICING MODELS — detect which applies:
- Model A: Weight break table. Flat rate per zone per weight range.
- Model B: Basic charge + per kg rate, with minimum charge. Formula: MAX(basicCharge + weight x perKgRate, minimumCharge). Each zone has three values: basic, perKg, minimum.
- Model C: Depot-to-depot. Origin depot + destination depot determines rate. Zone file maps postcodes to depot names.

ZONE FILE — extract postcode-to-zone/depot mappings. There may be tens of thousands of rows — summarise what you find but store the full mapping in postcodeMap.

SURCHARGES — extract all surcharges found in any of the files including tailgate, hand load, residential delivery, dangerous goods, overlength, and any other named fees.

WARNINGS — flag anything unusual such as zone codes in rate card not in zone file, multiple zones for same postcode, missing weight breaks, or anything that might cause incorrect quotes.

Respond ONLY with a JSON object. No markdown, no explanation, no backticks.

{
  "carrier": "${carrierName}",
  "pricingModel": "A or B or C",
  "zones": ["list of all zone names or depot names"],
  "weightBreaks": ["list of weight breaks"],
  "serviceTypes": ["list of service types"],
  "originDepots": ["list of origin depots if applicable"],
  "rateCount": 0,
  "summary": "one sentence describing what was found and pricing model detected",
  "rates": [{ "service": "Road Express", "weight": "0-1kg", "ZoneName": 8.50 }],
  "modelBRates": [{ "service": "Road Express", "zone": "Sydney Metro", "zoneCode": "N01", "basicCharge": 7.27, "perKgRate": 0.16, "minimumCharge": 9.97 }],
  "modelCRates": [{ "originDepot": "Melbourne", "destinationDepot": "Sydney", "basicCharge": 15.00, "perKgRate": 0.45, "minimumCharge": 22.00 }],
  "postcodeMap": [{ "postcode": "2000", "zone": "Sydney Metro", "zoneCode": "N01", "suburb": "Sydney", "state": "NSW" }],
  "surcharges": [{ "name": "Tailgate", "amount": "$75.00", "notes": "flat fee per delivery" }],
  "warnings": ["list of any issues found"]
}`
    })

    if (rateCard?.data) {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: rateCard.type === 'pdf' ? 'application/pdf' : 'application/octet-stream', data: rateCard.data }
      })
      userContent.push({ type: 'text', text: `Above is the rate card: ${rateCard.name} (${rateCard.type})` })
    }

    if (zoneFile?.data) {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: zoneFile.type === 'pdf' ? 'application/pdf' : 'application/octet-stream', data: zoneFile.data }
      })
      userContent.push({ type: 'text', text: `Above is the zone file: ${zoneFile.name} (${zoneFile.type})` })
    }

    if (surchargeDoc?.data) {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: surchargeDoc.type === 'pdf' ? 'application/pdf' : 'application/octet-stream', data: surchargeDoc.data }
      })
      userContent.push({ type: 'text', text: `Above is the additional charges schedule: ${surchargeDoc.name} (${surchargeDoc.type})` })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: userContent }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
