// v11 — two focused modes: 'rates' and 'surcharges'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callClaude(userContent: unknown[], maxTokens = 8000): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  const data = await response.json()
  if (!response.ok) {
    const errMsg = data?.error?.message ?? data?.message ?? `Claude API error ${response.status}`
    throw new Error(`Claude API error ${response.status}: ${errMsg}`)
  }
  const text = data.content?.[0]?.text
  if (!text) {
    throw new Error(`Claude returned no content. Stop reason: ${data.stop_reason ?? 'unknown'}. Response: ${JSON.stringify(data).slice(0, 300)}`)
  }
  return text
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
    text: `You are identifying the structure of an Australian freight carrier rate card for ShippingIQ.

Carrier: ${carrierName}

PRICING MODELS:
- Model A: Weight break table. Flat rate per zone per weight range.
- Model B: Basic charge + per kg rate + minimum charge, per zone, per origin depot.
- Model C: Depot-to-depot rates.

YOUR TASK — identify structure and metadata only. Do NOT output individual rate rows for Model B.
For Model B, return columnMap so the browser can extract rates directly from the CSV.

Respond ONLY with this JSON (no markdown, no backticks):

{
  "carrier": "${carrierName}",
  "pricingModel": "A or B or C",
  "service": "primary service name e.g. Road Express",
  "originDepots": ["list of origin depot names"],
  "cubicFactor": 250,
  "fuelLevyPct": null,
  "summary": "one sentence",
  "warnings": [],

  "zoneCodeCol": "exact CSV column header that contains zone codes (e.g. zone_code or zone)",
  "zoneNameCol": "exact CSV column header that contains zone names or descriptions",
  "columnMap": {
    "Sydney": { "basic": "exact_col_header_for_basic_charge", "perKg": "exact_col_header_for_per_kg_rate", "minimum": "exact_col_header_for_minimum_charge" }
  },

  "weightBreaks": ["only for Model A — list of weight break labels"],
  "zones": ["zone names or codes — for Model A/C only; leave [] for Model B"],
  "rates": [],
  "modelCRates": []
}

IMPORTANT for Model B:
- columnMap keys must be the exact depot names as they appear in the data.
- Column header values in columnMap must be the EXACT header strings from the CSV (copy them precisely, including underscores and spacing).
- Leave rates=[] and modelCRates=[].

For Model A: leave columnMap={}, zoneCodeCol="", zoneNameCol="". Output weightBreaks and zones. Output rates array.
IMPORTANT: If the rate card header says "EX [CITY]" or "FROM [CITY]" and rows are destination city/location names (not zone codes), this is ALWAYS Model C regardless of column structure.
For Model C: detect when rows are named locations/cities AND columns are weight break ranges. Leave columnMap={}.
IMPORTANT — CSV with standard header: If the rateText contains a header row exactly matching "OriginDepot,Destination,BasicCharge,Minimum,PerKg_1-250,PerKg_251-500,PerKg_501-1000,PerKg_1001-3000,PerKg_3001-12000,PerKg_12001+", this is ALWAYS Model C. Leave modelCRates=[] — the browser extracts all rows directly from the CSV. Still populate originDepots with the unique values from the OriginDepot column.
For all other Model C (PDF-sourced or non-standard CSV): Output modelCRates with ALL rows using this exact schema per entry: { "originDepot": "Melbourne", "destinationDepot": "ADELAIDE", "basicCharge": 20.00, "minimumCharge": 75.00, "perKgRates": { "1-250": 0.5413, "251-500": 0.3608, "501-1000": 0.3018, "1001-3000": 0.2790, "3001-12000": 0.2478, "12001+": 0.2248 } } — originDepot from the column header or sheet context, destinationDepot is the exact row name, extract ALL rows.`,
  })

  if (rateText?.trim()) {
    const capped = rateText.slice(0, 8000)
    console.log('[handleRates] rateText length:', rateText.length, '→ capped to:', capped.length)
    userContent.push({ type: 'text', text: `Rate card data:\n${capped}` })
  }
  addPdfs(userContent, pdfs as { data: string; name: string; slot: string }[])

  console.log('[handleRates] calling Claude, userContent blocks:', userContent.length)
  const text = await callClaude(userContent, 4000)
  console.log('[handleRates] Claude response length:', text.length, '| first 200:', text.slice(0, 200))
  const parsed = parseJson(text) as Record<string, unknown>
  return parsed
}

// ---------------------------------------------------------------------------
// Mode: surcharges
// ---------------------------------------------------------------------------

async function handleSurcharges(carrierName: string, surchargeText: string, pdfs: { data: string; name: string; slot: string }[] = []) {
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

  if (surchargeText?.trim()) {
    userContent.push({ type: 'text', text: `Surcharge data:\n${surchargeText}` })
  }
  addPdfs(userContent, pdfs)

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
      result = await handleSurcharges(body.carrierName, body.surchargeText ?? '', body.pdfs ?? [])
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
