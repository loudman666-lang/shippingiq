// v11 — two focused modes: 'rates' and 'surcharges'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callClaude(userContent: unknown[]): Promise<string> {
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
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

function addPdfs(userContent: unknown[], pdfs: { data: string; name: string; slot: string }[]) {
  for (const pdf of (pdfs ?? [])) {
    userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } })
    userContent.push({ type: 'text', text: `Above is the ${pdf.slot} PDF: ${pdf.name}` })
  }
}

function parseJson(text: string): unknown {
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ---------------------------------------------------------------------------
// Mode: rates
// ---------------------------------------------------------------------------

async function handleRates(carrierName: string, rateText: string, pdfs: unknown[]) {
  const userContent: unknown[] = []

  userContent.push({
    type: 'text',
    text: `You are parsing an Australian freight carrier rate card for a shipping engine called ShippingIQ.

Carrier: ${carrierName}

PRICING MODELS — detect which applies:
- Model A: Weight break table. Flat rate per zone per weight range.
- Model B: Basic charge + per kg rate + minimum. Formula: MAX(basicCharge + weight × perKgRate, minimumCharge).
- Model C: Depot-to-depot. Origin depot + destination depot determines rate.

MODEL B — COMPACT FORMAT:
Output modelBRates as an object keyed by origin depot. Under each depot: "service" string and "rates" array.
Each rate row: zoneCode, zone, basicCharge, perKgRate, minimumCharge. Do NOT repeat the depot name inside rows.
Extract ALL zones for ALL depots — do not truncate.
Example:
"modelBRates": {
  "Sydney": { "service": "Road Express", "rates": [{ "zoneCode": "MEL1", "zone": "Melbourne Metro", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }] }
}

MULTI-TAB FILES:
Sheets are labeled [SheetName]. Extract from ALL sheets.

CUBIC FACTOR:
If stated, extract as cubicFactor in kg/m3 (e.g. 250 = divisor 4000). Default 250 if not found.

FUEL LEVY:
Extract fuelLevyPct (e.g. 17.5). Set null if not found.

Respond ONLY with a JSON object. No markdown, no backticks.

{
  "carrier": "${carrierName}",
  "pricingModel": "A or B or C",
  "zones": ["zone names"],
  "weightBreaks": ["weight breaks if Model A"],
  "serviceTypes": ["service types"],
  "originDepots": ["depot names"],
  "cubicFactor": 250,
  "fuelLevyPct": null,
  "rateCount": 0,
  "summary": "one sentence",
  "rates": [{ "service": "Road Express", "weight": "0-1kg", "ZoneName": 8.50 }],
  "modelBRates": { "Melbourne": { "service": "Road Express", "rates": [{ "zoneCode": "SYD1", "zone": "Sydney Metro", "basicCharge": 8.09, "perKgRate": 0.25, "minimumCharge": 11.04 }] } },
  "modelCRates": [{ "originDepot": "Melbourne", "destinationDepot": "Sydney", "basicCharge": 15.00, "perKgRate": 0.45, "minimumCharge": 22.00 }],
  "warnings": []
}`,
  })

  if (rateText?.trim()) {
    userContent.push({ type: 'text', text: `Rate card data:\n${rateText}` })
  }
  addPdfs(userContent, pdfs as { data: string; name: string; slot: string }[])

  console.log('[handleRates] calling Claude, userContent blocks:', userContent.length)
  const text = await callClaude(userContent)
  console.log('[handleRates] Claude response length:', text.length, '| first 200:', text.slice(0, 200))
  const parsed = parseJson(text) as Record<string, unknown>

  // Flatten compact modelBRates {depot: {service, rates: [...]}} → array
  if (parsed.modelBRates && !Array.isArray(parsed.modelBRates)) {
    const flat: unknown[] = []
    for (const [depot, depotData] of Object.entries(parsed.modelBRates as Record<string, { service?: string; rates?: unknown[] }>)) {
      const service = depotData.service ?? ''
      for (const rate of (depotData.rates ?? [])) {
        flat.push({ originDepot: depot, service, ...(rate as object) })
      }
    }
    parsed.modelBRates = flat
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Mode: surcharges
// ---------------------------------------------------------------------------

async function handleSurcharges(carrierName: string, surchargeText: string) {
  const userContent: unknown[] = []

  userContent.push({
    type: 'text',
    text: `You are extracting surcharge rules from an Australian freight carrier schedule for ShippingIQ.

Carrier: ${carrierName}

Extract every surcharge — name, amount, notes, and any auto-trigger thresholds.
autoWeightKg: weight threshold that triggers this surcharge (kg), or null.
autoLengthCm: single length threshold (cm), or null.
autoLengthMinCm / autoLengthMaxCm: range (cm) if surcharge applies between two lengths, or null.
autoTrigger: "always" if always charged, "never" if only manual, or null.

Respond ONLY with a JSON object. No markdown, no backticks.

{
  "surcharges": [
    { "name": "Tailgate", "amount": "$75.00", "notes": "per delivery", "autoWeightKg": 500, "autoLengthCm": null, "autoLengthMinCm": null, "autoLengthMaxCm": null, "autoTrigger": null },
    { "name": "Overlength 4-8m", "amount": "$85.00", "notes": "per item", "autoWeightKg": null, "autoLengthCm": null, "autoLengthMinCm": 400, "autoLengthMaxCm": 800, "autoTrigger": null }
  ]
}`,
  })

  userContent.push({ type: 'text', text: `Surcharge data:\n${surchargeText}` })

  const text = await callClaude(userContent)
  return parseJson(text)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const mode = body.mode ?? 'rates'
    console.log('[rapid-api] mode:', mode, '| carrierName:', body.carrierName, '| rateText length:', body.rateText?.length ?? 0, '| pdfs:', body.pdfs?.length ?? 0)

    let result: unknown
    if (mode === 'surcharges') {
      result = await handleSurcharges(body.carrierName, body.surchargeText)
    } else {
      result = await handleRates(body.carrierName, body.rateText, body.pdfs ?? [])
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const e = err as Error
    console.error('[rapid-api] error:', e.message, e.stack)
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
