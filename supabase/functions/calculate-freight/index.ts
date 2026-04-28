import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Calculation engine — kept in sync with src/pages/Quote.js
// ---------------------------------------------------------------------------

function parseSurchargeAmount(amount, freightCost) {
  if (!amount) return 0
  const str = String(amount).trim()
  if (str === 'POA') return null
  if (str.endsWith('%')) {
    const pct = parseFloat(str)
    return Math.round(freightCost * pct / 100 * 100) / 100
  }
  const num = parseFloat(str.replace(/[^0-9.]/g, ''))
  return isNaN(num) ? 0 : num
}

function applySurcharges(carrier, items, freightCost) {
  const surcharges = carrier.parsed_data?.surcharges || []
  const rules = carrier.surcharge_rules || {}
  const applied = []
  const warnings = []

  let maxItemLength = 0
  let maxItemWeight = 0
  items.forEach(item => {
    const w = parseFloat(item.weight) || 0
    if (w > maxItemWeight) maxItemWeight = w
    const dims = [parseFloat(item.length)||0, parseFloat(item.width)||0, parseFloat(item.height)||0]
    const longest = Math.max(...dims)
    if (longest > maxItemLength) maxItemLength = longest
  })

  const totalWeight = items.reduce((s, i) => s + (parseFloat(i.weight)||0) * (parseInt(i.qty)||1), 0)

  surcharges.forEach(s => {
    const key = s.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const rule = rules[key] || { trigger: 'manual' }
    if (rule.trigger === 'manual' || rule.trigger === 'never') return

    let triggered = false
    let reason = ''

    if (rule.trigger === 'always') {
      triggered = true
      reason = 'Always applied'
    } else if (rule.trigger === 'auto') {
      const wThreshold = parseFloat(s.autoWeightKg) || 0
      const dMinCm = parseFloat(s.autoLengthMinCm) || 0
      const dMaxCm = parseFloat(s.autoLengthMaxCm) || 0
      if (wThreshold > 0 && totalWeight > wThreshold) { triggered = true; reason = 'Consignment ' + totalWeight + 'kg > carrier threshold ' + wThreshold + 'kg' }
      else if (dMinCm > 0 && dMaxCm > 0 && maxItemLength > dMinCm && maxItemLength <= dMaxCm) { triggered = true; reason = 'Longest side ' + maxItemLength + 'cm in ' + dMinCm + '-' + dMaxCm + 'cm range' }
      else if (dMinCm > 0 && dMaxCm === 0 && maxItemLength > dMinCm) { triggered = true; reason = 'Longest side ' + maxItemLength + 'cm > ' + dMinCm + 'cm' }
      else if (s.autoTrigger === 'residential') { triggered = true; reason = 'Residential delivery' }
    } else if (rule.trigger === 'auto_override') {
      const wThreshold = parseFloat(rule.weightKg) || 0
      const dThreshold = parseFloat(rule.lengthCm) || 0
      const isOverlength48 = key === 'overlength_48m'
      const isOverlength8 = key === 'overlength_over_8m'
      if (isOverlength48) {
        const min = dThreshold || 400
        if (maxItemLength > min && maxItemLength <= 800) { triggered = true; reason = 'Longest side ' + maxItemLength + 'cm (4-8m range)' }
      } else if (isOverlength8) {
        if (maxItemLength > 800) { triggered = true; reason = 'Longest side ' + maxItemLength + 'cm > 800cm' }
      } else {
        if (wThreshold > 0 && totalWeight > wThreshold) { triggered = true; reason = 'Consignment ' + totalWeight + 'kg > ' + wThreshold + 'kg' }
        else if (dThreshold > 0 && maxItemLength > dThreshold) { triggered = true; reason = 'Longest side ' + maxItemLength + 'cm > ' + dThreshold + 'cm' }
      }
    } else if (rule.trigger === 'item_weight') {
      const wThreshold = parseFloat(rule.weightKg) || 0
      if (wThreshold > 0 && maxItemWeight > wThreshold) { triggered = true; reason = 'Item ' + maxItemWeight + 'kg > ' + wThreshold + 'kg threshold' }
    } else if (rule.trigger === 'consignment_weight') {
      const wThreshold = parseFloat(rule.weightKg) || 0
      if (wThreshold > 0 && totalWeight > wThreshold) { triggered = true; reason = 'Consignment ' + totalWeight + 'kg > ' + wThreshold + 'kg threshold' }
    }

    if (triggered) {
      const amount = parseSurchargeAmount(s.amount, freightCost)
      if (amount === null) {
        warnings.push(s.name + ' applies but requires manual quote (POA)')
      } else {
        applied.push({ name: s.name, amount, reason, originalAmount: s.amount })
      }
    }
  })

  return { applied, warnings }
}

function applyMargin(subtotal, rules) {
  if (!rules || rules.freightMarginType === 'none' || !rules.freightMarginValue) return 0
  const val = parseFloat(rules.freightMarginValue) || 0
  if (rules.freightMarginType === 'percent') return Math.round(subtotal * val / 100 * 100) / 100
  if (rules.freightMarginType === 'flat') return Math.round(val * 100) / 100
  return 0
}

function calculateRate(carrier, postcode, items, rules = {}) {
  const data = carrier.parsed_data
  const model = data?.pricingModel
  const origin = data?.selectedOrigin
  const cubicFactor = data?.cubicFactor || 250
  const fuelLevyPct = carrier.fuel_levy_pct || null
  const postcodeMap = data?.postcodeMap || []
  const postcodeEntry = postcodeMap.find(p => String(p.postcode) === String(postcode))
  if (!postcodeEntry) return { error: 'Postcode ' + postcode + ' not found in zone file for ' + carrier.name }

  const zoneCode = postcodeEntry.zoneCode
  const zoneName = postcodeEntry.zone
  const suburb = postcodeEntry.suburb || postcodeEntry.locality
  const state = postcodeEntry.state

  let totalActualWeight = 0
  let totalCubicWeight = 0
  items.forEach(item => {
    const qty = parseInt(item.qty) || 1
    totalActualWeight += (parseFloat(item.weight) || 0) * qty
    if (item.length && item.width && item.height) {
      totalCubicWeight += (parseFloat(item.length) * parseFloat(item.width) * parseFloat(item.height) / 4000) * qty
    }
  })
  totalActualWeight = Math.round(totalActualWeight * 100) / 100
  totalCubicWeight = Math.round(totalCubicWeight * 100) / 100
  const chargeableWeight = totalCubicWeight > 0 ? Math.max(totalActualWeight, totalCubicWeight) : totalActualWeight

  if (model === 'B') {
    const rates = data.modelBRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && (r.zoneCode === zoneCode || r.zone === zoneName))
    if (!rate) return { error: 'No rate found for zone ' + zoneName + ' from ' + origin }
    const freight = Math.max(rate.basicCharge + chargeableWeight * rate.perKgRate, rate.minimumCharge)
    const fuelLevy = fuelLevyPct ? Math.round(freight * fuelLevyPct / 100 * 100) / 100 : null
    const { applied: surchargesApplied, warnings: surchargeWarnings } = applySurcharges(carrier, items, freight)
    const surchargeTotal = surchargesApplied.reduce((s, x) => s + x.amount, 0)
    const subtotal = Math.round(((fuelLevy || 0) + freight + surchargeTotal) * 100) / 100
    const margin = applyMargin(subtotal, rules)
    const totalCost = Math.round((subtotal + margin) * 100) / 100
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service: rate.service,
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
      fuelLevyPct, fuelLevy, surchargesApplied, surchargeWarnings, surchargeTotal, margin, marginType: rules.freightMarginType, totalCost,
      formula: 'MAX($' + rate.basicCharge.toFixed(2) + ' + ' + chargeableWeight + 'kg x $' + rate.perKgRate.toFixed(3) + ', $' + rate.minimumCharge.toFixed(2) + ')',
      model: 'B'
    }
  }

  if (model === 'C') {
    const rates = data.modelCRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && r.destinationDepot === zoneName)
    if (!rate) return { error: 'No depot-to-depot rate found from ' + origin + ' to ' + zoneName }
    const freight = Math.max(rate.basicCharge + chargeableWeight * rate.perKgRate, rate.minimumCharge)
    const fuelLevy = fuelLevyPct ? Math.round(freight * fuelLevyPct / 100 * 100) / 100 : null
    const { applied: surchargesApplied, warnings: surchargeWarnings } = applySurcharges(carrier, items, freight)
    const surchargeTotal = surchargesApplied.reduce((s, x) => s + x.amount, 0)
    const subtotal = Math.round(((fuelLevy || 0) + freight + surchargeTotal) * 100) / 100
    const margin = applyMargin(subtotal, rules)
    const totalCost = Math.round((subtotal + margin) * 100) / 100
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, service: 'Depot to Depot',
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
      fuelLevyPct, fuelLevy, surchargesApplied, surchargeWarnings, surchargeTotal, margin, marginType: rules.freightMarginType, totalCost,
      formula: 'MAX($' + rate.basicCharge.toFixed(2) + ' + ' + chargeableWeight + 'kg x $' + rate.perKgRate.toFixed(3) + ', $' + rate.minimumCharge.toFixed(2) + ')',
      model: 'C'
    }
  }

  if (model === 'A') {
    const rates = data.rates || []
    const serviceTypes = data.serviceTypes || []
    const service = serviceTypes[0]
    const weightBreaks = data.weightBreaks || []
    let matchedBreak = null
    for (const wb of weightBreaks) {
      const parts = wb.replace('kg','').split('-')
      if (parts.length === 2 && chargeableWeight >= parseFloat(parts[0]) && chargeableWeight <= parseFloat(parts[1])) { matchedBreak = wb; break }
    }
    if (!matchedBreak) return { error: 'No weight break found for ' + chargeableWeight + 'kg' }
    const row = rates.find(r => r.service === service && r.weight === matchedBreak)
    if (!row) return { error: 'No rate found for ' + matchedBreak + ' to ' + zoneName }
    const freight = row[zoneName] || row[zoneCode]
    if (!freight) return { error: 'No rate for zone ' + zoneName }
    const fuelLevy = fuelLevyPct ? Math.round(freight * fuelLevyPct / 100 * 100) / 100 : null
    const { applied: surchargesApplied, warnings: surchargeWarnings } = applySurcharges(carrier, items, freight)
    const surchargeTotal = surchargesApplied.reduce((s, x) => s + x.amount, 0)
    const subtotal = Math.round(((fuelLevy || 0) + freight + surchargeTotal) * 100) / 100
    const margin = applyMargin(subtotal, rules)
    const totalCost = Math.round((subtotal + margin) * 100) / 100
    return {
      carrier: carrier.name, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service, weightBreak: matchedBreak,
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      freightCost: Math.round(freight * 100) / 100,
      fuelLevyPct, fuelLevy, surchargesApplied, surchargeWarnings, surchargeTotal, margin, marginType: rules.freightMarginType, totalCost,
      formula: 'Flat rate for ' + matchedBreak + ' to ' + zoneName, model: 'A'
    }
  }

  return { error: 'Unknown pricing model: ' + model }
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { postcode, items, merchant_id, orderValue = 0, hasExemptItem = false } = await req.json()

    if (!postcode || !items || !merchant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: postcode, items, merchant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Forward the caller's JWT so Supabase RLS applies — a user can only
    // fetch carriers and merchant rules for their own merchant.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const [carriersRes, merchantRes] = await Promise.all([
      supabase.from('carriers').select('*').eq('merchant_id', merchant_id).eq('status', 'active'),
      supabase.from('merchants').select('settings, rules').eq('id', merchant_id).single()
    ])

    if (carriersRes.error) throw new Error(carriersRes.error.message)
    if (merchantRes.error) throw new Error(merchantRes.error.message)

    const carriers = carriersRes.data || []
    const merchantRules = merchantRes.data?.rules || {}

    const rawResults = carriers.map(c => {
      const r = calculateRate(c, postcode, items, merchantRules)
      return r.error ? r : { ...r, carrierId: c.id }
    })

    const carrierPriority: string[] = merchantRules.carrierPriority || []

    const freeShippingThreshold = parseFloat(merchantRules.freeShippingThreshold) || 0
    const thresholdMet = merchantRules.freeShippingEnabled && freeShippingThreshold > 0 && orderValue >= freeShippingThreshold
    const freeMode = merchantRules.freeShippingMode || 'smart'

    const results = (!thresholdMet || hasExemptItem) ? rawResults : rawResults.map(r => {
      if (r.error) return r
      const anySurcharge = (r.surchargesApplied?.length || 0) > 0 || (r.surchargeWarnings?.length || 0) > 0
      if (anySurcharge && freeMode === 'smart') return r
      return { ...r, freightCost: 0, fuelLevy: null, surchargesApplied: [], surchargeWarnings: [], surchargeTotal: 0, margin: 0, totalCost: 0, freeShipping: true }
    })

    return new Response(
      JSON.stringify({ results, carrierPriority }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
