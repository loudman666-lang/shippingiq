// v9 — file parsing moved to browser; edge function receives pre-extracted text or PDF base64
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
    const body = await req.json()
    const carrierName = body.carrierName
    const rateCard = body.rateCard
    const zoneFile = body.zoneFile
    const surchargeDoc = body.surchargeDoc

    const userContent = []

    userContent.push({
      type: 'text',
      text: `You are parsing Australian freight carrier files for a shipping rate engine called ShippingIQ.

Carrier: ${carrierName}

Parse whatever files you receive regardless of format or structure.

MULTI-TAB EXCEL FILES:
Excel files are provided with each sheet labeled "Sheet 1: [name]", "Sheet 2: [name]", etc., separated by ---
A single Excel file may contain rates on one sheet, postcode zones on another, and surcharges on another.
Extract from ALL sheets — do not ignore any sheet. Identify what each sheet contains and extract accordingly.

PRICING MODELS - detect which applies:
- Model A: Weight break table. Flat rate per zone per weight range.
- Model B: Basic charge + per kg rate, with minimum charge. Formula: MAX(basicCharge + weight x perKgRate, minimumCharge).
- Model C: Depot-to-depot. Origin depot + destination depot determines rate.

CRITICAL FOR MODEL B WITH MULTIPLE ORIGIN DEPOTS:
If the rate card has multiple origin depots (e.g. columns for Sydney, Melbourne, Brisbane), you MUST create a separate modelBRates entry for EVERY combination of originDepot + zone. Every single row in modelBRates MUST include the "originDepot" field. Example:
{ "originDepot": "Sydney", "service": "Road Express", "zone": "Melbourne Metro", "zoneCode": "MEL1", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }
Never omit originDepot from any modelBRates row.

CUBIC FACTOR:
Extract the cubic conversion factor if stated in any file. This is used to calculate cubic weight from dimensions.
Common formats: "250kg/m3", "4000 cubic factor", "1 cubic metre = 250kg", "cubic divisor 4000".
The cubic divisor (cm based) and kg/m3 are related: 250kg/m3 = divisor of 4000 (L x W x H in cm / 4000).
Store as cubicFactor in kg/m3 (e.g. 250). If not stated, use 250 as the default for road freight.

FUEL LEVY:
Extract the fuel levy percentage if stated. Store as fuelLevyPct (e.g. 17.5 for 17.5%). If not found, set to null.

Extract all zones, rates, postcode mappings, and surcharges.

Respond ONLY with a JSON object. No markdown, no backticks.

{
  "carrier": "${carrierName}",
  "pricingModel": "A or B or C",
  "zones": ["list of destination zone names"],
  "weightBreaks": ["list of weight breaks if applicable"],
  "serviceTypes": ["list of service types"],
  "originDepots": ["list of origin depot names"],
  "cubicFactor": 250,
  "fuelLevyPct": null,
  "rateCount": 0,
  "summary": "one sentence summary",
  "rates": [{ "service": "Road Express", "weight": "0-1kg", "ZoneName": 8.50 }],
  "modelBRates": [{ "originDepot": "Melbourne", "service": "Road Express", "zone": "Sydney Metro", "zoneCode": "SYD1", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }],
  "modelCRates": [{ "originDepot": "Melbourne", "destinationDepot": "Sydney", "basicCharge": 15.00, "perKgRate": 0.45, "minimumCharge": 22.00 }],
  "postcodeMap": [{ "postcode": "2000", "zone": "Sydney Metro", "zoneCode": "SYD1", "suburb": "Sydney", "state": "NSW" }],
  "surcharges": [{ "name": "Tailgate", "amount": "$75.00", "notes": "flat fee per delivery", "autoWeightKg": 750, "autoLengthCm": null, "autoLengthMinCm": null, "autoLengthMaxCm": null, "autoTrigger": null }],
  "warnings": ["any issues found"]
}`
    })

    function addFileContent(file, label) {
      if (!file) return
      if (file.type === 'pdf') {
        userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } })
        userContent.push({ type: 'text', text: 'Above is the ' + label + ' PDF: ' + file.name })
      } else {
        userContent.push({ type: 'text', text: label + ' (' + file.name + '):\n' + (file.content ?? '').slice(0, 8000) })
      }
    }

    addFileContent(rateCard, 'rate card')
    addFileContent(zoneFile, 'zone file')
    addFileContent(surchargeDoc, 'surcharge schedule')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
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
