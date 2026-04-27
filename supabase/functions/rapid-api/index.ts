// v6
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64ToText(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function excelToText(base64) {
  try {
    const bytes = base64ToUint8Array(base64)
    const workbook = XLSX.read(bytes, { type: 'array' })
    let result = ''
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      result += 'Sheet: ' + sheetName + '\n' + csv + '\n\n'
    }
    return result
  } catch (e) {
    return 'Could not parse Excel file: ' + e.message
  }
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

You will receive up to three files: a rate card, a zone file, and optionally an additional charges schedule.
Parse whatever you receive regardless of format or structure.

PRICING MODELS - detect which applies:
- Model A: Weight break table. Flat rate per zone per weight range.
- Model B: Basic charge + per kg rate, with minimum charge. Formula: MAX(basicCharge + weight x perKgRate, minimumCharge).
- Model C: Depot-to-depot. Origin depot + destination depot determines rate.

Extract all zones, rates, postcode mappings, and surcharges.

Respond ONLY with a JSON object. No markdown, no backticks.

{
  "carrier": "${carrierName}",
  "pricingModel": "A or B or C",
  "zones": ["list of zone names"],
  "weightBreaks": ["list of weight breaks"],
  "serviceTypes": ["list of service types"],
  "originDepots": ["list of origin depots if applicable"],
  "rateCount": 0,
  "summary": "one sentence summary",
  "rates": [{ "service": "Road Express", "weight": "0-1kg", "ZoneName": 8.50 }],
  "modelBRates": [{ "service": "Road Express", "zone": "Sydney Metro", "zoneCode": "SYD1", "basicCharge": 7.27, "perKgRate": 0.16, "minimumCharge": 9.97 }],
  "modelCRates": [{ "originDepot": "Melbourne", "destinationDepot": "Sydney", "basicCharge": 15.00, "perKgRate": 0.45, "minimumCharge": 22.00 }],
  "postcodeMap": [{ "postcode": "2000", "zone": "Sydney Metro", "zoneCode": "SYD1", "suburb": "Sydney", "state": "NSW" }],
  "surcharges": [{ "name": "Tailgate", "amount": "$75.00", "notes": "flat fee per delivery" }],
  "warnings": ["any issues found"]
}`
    })

    if (rateCard && rateCard.data) {
      if (rateCard.type === 'pdf') {
        userContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: rateCard.data }
        })
        userContent.push({ type: 'text', text: 'Above is the rate card PDF: ' + rateCard.name })
      } else {
        const text = fileToText(rateCard)
        userContent.push({ type: 'text', text: 'Rate card (' + rateCard.name + '):\n' + text.slice(0, 8000) })
      }
    }

    if (zoneFile && zoneFile.data) {
      if (zoneFile.type === 'pdf') {
        userContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: zoneFile.data }
        })
        userContent.push({ type: 'text', text: 'Above is the zone file PDF: ' + zoneFile.name })
      } else {
        const text = fileToText(zoneFile)
        userContent.push({ type: 'text', text: 'Zone file (' + zoneFile.name + '):\n' + text.slice(0, 8000) })
      }
    }

    if (surchargeDoc && surchargeDoc.data) {
      if (surchargeDoc.type === 'pdf') {
        userContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: surchargeDoc.data }
        })
        userContent.push({ type: 'text', text: 'Above is the surcharge schedule PDF: ' + surchargeDoc.name })
      } else {
        const text = fileToText(surchargeDoc)
        userContent.push({ type: 'text', text: 'Surcharge schedule (' + surchargeDoc.name + '):\n' + text.slice(0, 4000) })
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
