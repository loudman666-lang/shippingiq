// v10 — postcodeMap pre-built in browser for CSV/Excel zone files; AI only sees rate card
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
    const zoneFile = body.zoneFile           // only present for PDF zone files
    const surchargeDoc = body.surchargeDoc
    const postcodeMap = body.postcodeMap     // pre-built array from browser, or undefined

    const userContent = []

    const postcodeNote = postcodeMap
      ? '\n\nPOSTCODE MAP: Already extracted from the zone file in the browser. Set "postcodeMap" to [] in your response — do not extract or guess postcode data, it will be merged in separately.'
      : '\n\nExtract all zones, rates, postcode mappings, and surcharges.'

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

MODEL B — COMPACT RATE TABLE FORMAT:
For Model B, output modelBRates as an object keyed by origin depot name. Under each depot, output a "service" string and a "rates" array. Each rate row needs only: zoneCode, zone, basicCharge, perKgRate, minimumCharge. Do NOT repeat the depot name inside each row — it is already the key. Extract ALL zones for ALL depots — do not truncate. Example:
"modelBRates": {
  "Sydney": { "service": "Road Express", "rates": [{ "zoneCode": "MEL1", "zone": "Melbourne Metro", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }] },
  "Melbourne": { "service": "Road Express", "rates": [{ "zoneCode": "MEL1", "zone": "Melbourne Metro", "basicCharge": 7.50, "perKgRate": 0.22, "minimumCharge": 10.00 }] }
}

CUBIC FACTOR:
Extract the cubic conversion factor if stated in any file. This is used to calculate cubic weight from dimensions.
Common formats: "250kg/m3", "4000 cubic factor", "1 cubic metre = 250kg", "cubic divisor 4000".
The cubic divisor (cm based) and kg/m3 are related: 250kg/m3 = divisor of 4000 (L x W x H in cm / 4000).
Store as cubicFactor in kg/m3 (e.g. 250). If not stated, use 250 as the default for road freight.

FUEL LEVY:
Extract the fuel levy percentage if stated. Store as fuelLevyPct (e.g. 17.5 for 17.5%). If not found, set to null.
${postcodeNote}

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
  "modelBRates": { "Melbourne": { "service": "Road Express", "rates": [{ "zoneCode": "SYD1", "zone": "Sydney Metro", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }] } },
  "modelCRates": [{ "originDepot": "Melbourne", "destinationDepot": "Sydney", "basicCharge": 15.00, "perKgRate": 0.45, "minimumCharge": 22.00 }],
  "postcodeMap": [],
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
    // Zone file only included when postcodeMap wasn't pre-built (PDF fallback)
    if (!postcodeMap) addFileContent(zoneFile, 'zone file')
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
        max_tokens: 8000,
        messages: [{ role: 'user', content: userContent }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Flatten compact modelBRates {depot: {service, rates: [...]}} → array for the calculation engine
    if (parsed.modelBRates && !Array.isArray(parsed.modelBRates)) {
      const flat = []
      for (const [depot, depotData] of Object.entries(parsed.modelBRates)) {
        const service = depotData.service ?? ''
        for (const rate of (depotData.rates ?? [])) {
          flat.push({ originDepot: depot, service, ...rate })
        }
      }
      parsed.modelBRates = flat
    }

    // Merge pre-built postcodeMap — overrides whatever the AI returned
    if (Array.isArray(postcodeMap) && postcodeMap.length > 0) {
      parsed.postcodeMap = postcodeMap
    }

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
