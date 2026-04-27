// v8
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64ToText(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const EXCEL_ROW_LIMIT = 500

function excelToText(base64) {
  let workbook
  try {
    const bytes = base64ToUint8Array(base64)
    // sheetRows stops XLSX parsing at this row — prevents CPU timeout on large zone files
    workbook = XLSX.read(bytes, { type: 'array', sheetRows: EXCEL_ROW_LIMIT })
  } catch (e) {
    return 'Could not read Excel file: ' + e.message
  }

  const parts: string[] = []
  workbook.SheetNames.forEach((sheetName, index) => {
    try {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet).trim()
      if (!csv) return // skip empty sheets
      const label = 'Sheet ' + (index + 1) + ': ' + sheetName
      const note = '(truncated to first ' + EXCEL_ROW_LIMIT + ' rows)'
      parts.push(label + ' ' + note + '\n' + csv.slice(0, 2000))
    } catch (e) {
      parts.push('Sheet ' + (index + 1) + ': ' + sheetName + '\n(could not parse sheet: ' + e.message + ')')
    }
  })

  return parts.length > 0
    ? parts.join('\n\n---\n\n')
    : 'Could not extract any sheet content from Excel file'
}

function fileToText(file) {
  if (file.type === 'excel') return excelToText(file.data)
  return base64ToText(file.data)
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

    if (rateCard && rateCard.data) {
      if (rateCard.type === 'pdf') {
        userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: rateCard.data } })
        userContent.push({ type: 'text', text: 'Above is the rate card PDF: ' + rateCard.name })
      } else {
        const text = fileToText(rateCard)
        userContent.push({ type: 'text', text: 'Rate card (' + rateCard.name + '):\n' + text.slice(0, 8000) })
      }
    }

    if (zoneFile && zoneFile.data) {
      if (zoneFile.type === 'pdf') {
        userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: zoneFile.data } })
        userContent.push({ type: 'text', text: 'Above is the zone file PDF: ' + zoneFile.name })
      } else {
        const text = fileToText(zoneFile)
        userContent.push({ type: 'text', text: 'Zone file (' + zoneFile.name + '):\n' + text.slice(0, 8000) })
      }
    }

    if (surchargeDoc && surchargeDoc.data) {
      if (surchargeDoc.type === 'pdf') {
        userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: surchargeDoc.data } })
        userContent.push({ type: 'text', text: 'Above is the surcharge schedule PDF: ' + surchargeDoc.name })
      } else {
        const text = fileToText(surchargeDoc)
        userContent.push({ type: 'text', text: 'Surcharge schedule (' + surchargeDoc.name + '):\n' + text.slice(0, 8000) })
      }
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
