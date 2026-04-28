import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

function RateTable({ carrier }) {
  const data = carrier.parsed_data
  const model = data?.pricingModel
  const origin = data?.selectedOrigin

  if (model === 'B' && data?.modelBRates?.length) {
    const services = [...new Set(data.modelBRates.map(r => r.service))]
    const filteredRates = origin
      ? data.modelBRates.filter(r => r.originDepot === origin)
      : data.modelBRates
    return (
      <div className="rate-table-wrap">
        {services.map(service => {
          const rows = filteredRates.filter(r => r.service === service)
          if (!rows.length) return null
          return (
            <div key={service} style={{ marginBottom: '24px' }}>
              <div className="rate-table-service">{service} — Model B (Basic + Per Kg){origin ? ` — From ${origin}` : ''}</div>
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Code</th>
                    <th>Basic Charge</th>
                    <th>Per Kg Rate</th>
                    <th>Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.zone}</td>
                      <td>{row.zoneCode || '—'}</td>
                      <td>${Number(row.basicCharge || 0).toFixed(2)}</td>
                      <td>${Number(row.perKgRate || 0).toFixed(3)}</td>
                      <td>${Number(row.minimumCharge || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  if (model === 'C' && data?.modelCRates?.length) {
    const rows = origin
      ? data.modelCRates.filter(r => r.originDepot === origin)
      : data.modelCRates
    return (
      <div className="rate-table-wrap">
        <div className="rate-table-service">Model C (Depot to Depot){origin ? ` — From ${origin}` : ''}</div>
        <table className="rate-table">
          <thead>
            <tr>
              <th>Destination Depot</th>
              <th>Basic Charge</th>
              <th>Per Kg Rate</th>
              <th>Minimum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.destinationDepot}</td>
                <td>${Number(row.basicCharge || 0).toFixed(2)}</td>
                <td>${Number(row.perKgRate || 0).toFixed(3)}</td>
                <td>${Number(row.minimumCharge || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data?.rates?.length) {
    const zones = data.zones || []
    const serviceTypes = data.serviceTypes || []
    return (
      <div className="rate-table-wrap">
        {serviceTypes.map(service => {
          const rows = data.rates.filter(r => r.service === service)
          if (!rows.length) return null
          return (
            <div key={service} style={{ marginBottom: '24px' }}>
              <div className="rate-table-service">{service} — Model A (Weight Break)</div>
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Weight</th>
                    {zones.map(z => <th key={z}>{z}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.weight}>
                      <td>{row.weight}</td>
                      {zones.map(z => <td key={z}>${Number(row[z] || 0).toFixed(2)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
      No rate detail available. Delete this carrier and re-upload to see the full rate table.
    </div>
  )
}

function SurchargeTable({ surcharges }) {
  if (!surcharges?.length) return null
  return (
    <div style={{ marginTop: '16px' }}>
      <div className="rate-table-service">Surcharges</div>
      <table className="rate-table">
        <thead>
          <tr><th>Surcharge</th><th>Amount</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {surcharges.map((s, i) => (
            <tr key={i}>
              <td>{s.name}</td>
              <td>{s.amount}</td>
              <td style={{ color: '#6b7280', fontSize: '12px' }}>{s.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fileReadAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function getFileType(file) {
  if (!file) return null
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'unknown'
}

const SHEET_CHAR_LIMIT = 50000

// Find the first column index whose header contains any of the given terms.
function findColIndex(headers, ...terms) {
  const lower = headers.map(h => String(h ?? '').toLowerCase().trim())
  return lower.findIndex(h => terms.some(t => h === t || h.includes(t)))
}

function looksLikePostcode(val) {
  if (typeof val === 'number') return Number.isInteger(val) && val >= 200 && val <= 9999
  return /^\d{3,4}$/.test(String(val ?? '').trim())
}

// If the sheet looks like a postcode→zone mapping, return a compact CSV of only
// the essential columns (postcode, zone, suburb, state). Returns null if the
// sheet doesn't look like a zone file, so the caller falls back to full CSV.
function extractZoneSheetCompact(XLSX, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return null

  const headers = rows[0]
  let postcodeCol = findColIndex(headers, 'postcode', 'post code', 'post_code', 'pc', 'zip')
  const zoneCol    = findColIndex(headers, 'zone')
  const suburbCol  = findColIndex(headers, 'suburb', 'locality')
  const stateCol   = findColIndex(headers, 'state')

  // Fallback: scan up to 10 data rows looking for a column of 4-digit values.
  if (postcodeCol === -1) {
    for (let c = 0; c < headers.length; c++) {
      const samples = rows.slice(1, 11).filter(r => String(r[c] ?? '').trim() !== '')
      if (samples.length >= 3 && samples.filter(r => looksLikePostcode(r[c])).length >= Math.ceil(samples.length * 0.8)) {
        postcodeCol = c
        break
      }
    }
  }

  if (postcodeCol === -1) return null // not a zone sheet

  const keep = [
    { name: 'postcode', idx: postcodeCol },
    ...(zoneCol   !== -1 ? [{ name: 'zone',   idx: zoneCol   }] : []),
    ...(suburbCol !== -1 ? [{ name: 'suburb', idx: suburbCol }] : []),
    ...(stateCol  !== -1 ? [{ name: 'state',  idx: stateCol  }] : []),
  ]

  const csvLines = [keep.map(c => c.name).join(',')]
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!looksLikePostcode(row[postcodeCol])) continue
    csvLines.push(keep.map(({ idx }) => {
      const v = String(row[idx] ?? '').trim()
      return v.includes(',') ? `"${v}"` : v
    }).join(','))
  }

  return csvLines.length > 1 ? csvLines.join('\n') : null
}

// If the sheet looks like a rate table (has basic/per-kg/minimum columns), return
// a compact CSV keeping only zone identifier and rate columns. Handles Allied-style
// multi-depot layouts where depot names sit in a merged header row above the rate
// type row — those are forward-filled to produce e.g. "sydney_basic", "sydney_per_kg".
function extractRateSheetCompact(XLSX, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 3) return null

  // Find the first row that contains rate keywords.
  const RATE_RE = /basic|minimum|min(?:imum)?\.?\s*charge|per[\s.]?kg|kg[\s.]?rate|per[\s.]?kilo/i
  let headerRowIdx = -1
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    if (rows[r].some(cell => RATE_RE.test(String(cell ?? '')))) { headerRowIdx = r; break }
  }
  if (headerRowIdx === -1) return null

  // Forward-fill the row above as depot names (handles merged-cell depot headers).
  const depotNames = new Array(rows[headerRowIdx].length).fill('')
  if (headerRowIdx > 0) {
    let last = ''
    rows[headerRowIdx - 1].forEach((v, i) => {
      const s = String(v ?? '').trim()
      if (s) last = s
      depotNames[i] = last
    })
  }

  // Classify columns: keep zone identifiers and rate columns, drop everything else.
  const ZONE_RE  = /zone|destination|depot|origin|suburb|state|locality/i
  const keepCols = []
  rows[headerRowIdx].forEach((cell, i) => {
    const h = String(cell ?? '').toLowerCase().trim()
    const isZone = ZONE_RE.test(h)
    const isRate = RATE_RE.test(h)
    if (!isZone && !isRate) return
    const depotPrefix = depotNames[i] ? depotNames[i].toLowerCase().replace(/\s+/g, '_') + '_' : ''
    const colName = isZone
      ? h.replace(/\s+/g, '_')
      : depotPrefix + h.replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')
    keepCols.push({ idx: i, name: colName })
  })

  // Need at least one rate column to qualify.
  if (!keepCols.some(c => RATE_RE.test(c.name))) return null

  const csvLines = [keepCols.map(c => c.name).join(',')]
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r]
    if (keepCols.every(({ idx }) => String(row[idx] ?? '').trim() === '')) continue
    csvLines.push(keepCols.map(({ idx }) => {
      const v = String(row[idx] ?? '').trim()
      return v.includes(',') ? `"${v}"` : v
    }).join(','))
  }

  return csvLines.length > 1 ? csvLines.join('\n') : null
}

async function excelFileToText(file) {
  const XLSX = await import('https://esm.sh/xlsx@0.18.5')
  const base64 = await fileToBase64(file)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const workbook = XLSX.read(bytes, { type: 'array' })
  const parts = []
  workbook.SheetNames.forEach((sheetName, index) => {
    try {
      const sheet = workbook.Sheets[sheetName]
      const label = 'Sheet ' + (index + 1) + ': ' + sheetName
      const zoneCompact = extractZoneSheetCompact(XLSX, sheet)
      if (zoneCompact !== null) {
        parts.push(label + ' (postcode zone mapping — key columns only)\n' + zoneCompact)
        return
      }
      const rateCompact = extractRateSheetCompact(XLSX, sheet)
      if (rateCompact !== null) {
        parts.push(label + ' (rate table — essential columns only)\n' + rateCompact)
        return
      }
      const csv = XLSX.utils.sheet_to_csv(sheet).trim()
      if (!csv) return
      parts.push(label + '\n' + csv.slice(0, SHEET_CHAR_LIMIT))
    } catch (e) {
      parts.push('Sheet ' + (index + 1) + ': ' + sheetName + '\n(could not parse sheet: ' + e.message + ')')
    }
  })
  return parts.length > 0 ? parts.join('\n\n---\n\n') : 'Could not extract any sheet content from Excel file'
}

async function buildFilePayload(file) {
  if (!file) return null
  const type = getFileType(file)
  if (type === 'pdf') {
    const data = await fileToBase64(file)
    return { type: 'pdf', data, name: file.name }
  }
  if (type === 'excel') {
    const content = await excelFileToText(file)
    return { type: 'text', content, name: file.name }
  }
  // csv or unknown — read as plain text
  const content = await fileReadAsText(file)
  return { type: 'text', content: content.slice(0, 8000), name: file.name }
}

// ---------------------------------------------------------------------------
// Direct zone file parsing — builds postcodeMap without going through the AI.
// Returns an array of { postcode, zoneCode, zone, suburb, state } objects,
// or null if the file can't be parsed this way (e.g. PDF).
// ---------------------------------------------------------------------------

function parseZoneSheetToObjects(XLSX, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return null

  const headers = rows[0]
  console.log('[parseZoneSheetToObjects] all headers (row 0):', headers.map((h, i) => `[${i}]${h}`).join(' | '))
  if (rows[1]) console.log('[parseZoneSheetToObjects] row 1:', rows[1].map((h, i) => `[${i}]${h}`).join(' | '))

  let postcodeCol   = findColIndex(headers, 'postcode', 'post code', 'post_code', 'pc', 'zip')
  const zoneCodeCol = findColIndex(headers, 'zone code', 'zone_code', 'zonecode')
  const zoneNameCol = findColIndex(headers, 'zone name', 'zone_name', 'zonename', 'zone')
  const suburbCol   = findColIndex(headers, 'suburb', 'locality')
  const stateCol    = findColIndex(headers, 'state')
  console.log('[parseZoneSheetToObjects] header-matched cols — postcode:', postcodeCol, 'zoneCode:', zoneCodeCol, 'zoneName:', zoneNameCol, 'suburb:', suburbCol, 'state:', stateCol)

  if (postcodeCol === -1) {
    // Scan rows 0–19 across full column width — handles sheets where data starts
    // several rows down (title rows, merged headers) or row 0 has a sparse header.
    const scanRows = rows.slice(0, Math.min(rows.length, 20))
    const maxCols = Math.max(...scanRows.map(r => r.length), 0)
    for (let c = 0; c < maxCols; c++) {
      const first5 = scanRows.map(r => r[c]).filter(v => v !== '' && v !== null && v !== undefined).slice(0, 5)
        .map(v => `${v}(${typeof v})`)
      console.log('[parseZoneSheetToObjects] col', c, String(rows[0]?.[c] ?? '').trim() || '(no header)', '→', first5.join(', '))
      const hits = scanRows.filter(r => looksLikePostcode(r[c])).length
      if (hits >= 3) {
        postcodeCol = c
        console.log('[parseZoneSheetToObjects] postcode column detected: col', c, '| header:', String(rows[0]?.[c] ?? '(none)').trim(), '| hits:', hits)
        break
      }
    }
  }
  if (postcodeCol === -1) {
    console.log('[parseZoneSheetToObjects] no postcode column found — skipping sheet')
    return null
  }

  // If only one generic 'zone' column exists, use it for both code and name.
  const effectiveCodeCol = zoneCodeCol !== -1 ? zoneCodeCol : zoneNameCol
  const effectiveNameCol = zoneNameCol !== -1 ? zoneNameCol : zoneCodeCol

  const result = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const postcode = String(row[postcodeCol] ?? '').trim()
    if (!looksLikePostcode(postcode)) continue
    result.push({
      postcode,
      zoneCode: effectiveCodeCol !== -1 ? String(row[effectiveCodeCol] ?? '').trim() : '',
      zone:     effectiveNameCol !== -1 ? String(row[effectiveNameCol] ?? '').trim() : '',
      suburb:   suburbCol !== -1 ? String(row[suburbCol] ?? '').trim() : '',
      state:    stateCol  !== -1 ? String(row[stateCol]  ?? '').trim() : '',
    })
  }
  return result.length > 0 ? result : null
}

function parseCsvLine(line) {
  const result = []
  let current = '', inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

function parseCsvZoneToObjects(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return null

  const headers = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase().trim())
  let postcodeIdx   = findColIndex(headers, 'postcode', 'post code', 'post_code', 'pc', 'zip')
  const zoneCodeIdx = findColIndex(headers, 'zone code', 'zone_code', 'zonecode')
  const zoneNameIdx = findColIndex(headers, 'zone name', 'zone_name', 'zonename', 'zone')
  const suburbIdx   = findColIndex(headers, 'suburb', 'locality')
  const stateIdx    = findColIndex(headers, 'state')

  if (postcodeIdx === -1) {
    for (let c = 0; c < headers.length; c++) {
      const samples = []
      for (let r = 1; r < Math.min(lines.length, 11); r++) {
        const v = (parseCsvLine(lines[r])[c] ?? '').trim()
        if (v) samples.push(v)
      }
      if (samples.length >= 3 && samples.filter(looksLikePostcode).length >= Math.ceil(samples.length * 0.8)) {
        postcodeIdx = c; break
      }
    }
  }
  if (postcodeIdx === -1) return null

  const effectiveCodeIdx = zoneCodeIdx !== -1 ? zoneCodeIdx : zoneNameIdx
  const effectiveNameIdx = zoneNameIdx !== -1 ? zoneNameIdx : zoneCodeIdx

  const result = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const postcode = (cols[postcodeIdx] ?? '').trim()
    if (!looksLikePostcode(postcode)) continue
    result.push({
      postcode,
      zoneCode: effectiveCodeIdx !== -1 ? (cols[effectiveCodeIdx] ?? '').trim() : '',
      zone:     effectiveNameIdx !== -1 ? (cols[effectiveNameIdx] ?? '').trim() : '',
      suburb:   suburbIdx !== -1 ? (cols[suburbIdx] ?? '').trim() : '',
      state:    stateIdx  !== -1 ? (cols[stateIdx]  ?? '').trim() : '',
    })
  }
  return result.length > 0 ? result : null
}

async function parseZoneFileToPostcodeMap(file) {
  const type = getFileType(file)
  console.log('[parseZoneFileToPostcodeMap] file:', file.name, 'type:', type)
  if (type === 'excel') {
    const XLSX = await import('https://esm.sh/xlsx@0.18.5')
    const base64 = await fileToBase64(file)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const workbook = XLSX.read(bytes, { type: 'array' })
    console.log('[parseZoneFileToPostcodeMap] sheets:', workbook.SheetNames)
    for (const sheetName of workbook.SheetNames) {
      const result = parseZoneSheetToObjects(XLSX, workbook.Sheets[sheetName])
      console.log('[parseZoneFileToPostcodeMap] sheet', sheetName, '→', result ? result.length + ' rows' : 'not a zone sheet')
      if (result) return result
    }
    return null
  }
  if (type === 'csv') {
    const text = await fileReadAsText(file)
    const result = parseCsvZoneToObjects(text)
    console.log('[parseZoneFileToPostcodeMap] CSV →', result ? result.length + ' rows' : 'not a zone file')
    return result
  }
  console.log('[parseZoneFileToPostcodeMap] PDF — falling back to AI')
  return null // PDF: fall back to AI
}

export default function Carriers() {
  const { merchant, isAdmin } = useAuth()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsingStep, setParsingStep] = useState('')
  const [form, setForm] = useState({ name: '', rateCard: null, zoneFile: null, surchargeDoc: null })
  const [parseResult, setParseResult] = useState(null)
  const [selectedOrigin, setSelectedOrigin] = useState('')
  const [error, setError] = useState(null)
  const [viewingCarrier, setViewingCarrier] = useState(null)
  const [surchargeRulesCarrier, setSurchargeRulesCarrier] = useState(null)
  const [surchargeRules, setSurchargeRules] = useState({})
  const [eligibilityCarrierId, setEligibilityCarrierId] = useState(null)
  const [eligibilityForm, setEligibilityForm] = useState({})

  useEffect(() => {
    if (merchant?.id) fetchCarriers()
  }, [merchant])

  async function fetchCarriers() {
    setLoading(true)
    const { data } = await supabase
      .from('carriers')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
    setCarriers(data || [])
    setLoading(false)
  }

  async function parseFiles() {
    if (!form.name || !form.rateCard || !form.zoneFile) {
      setError('Please enter a carrier name and upload both the rate card and zone file.')
      return
    }
    setParsing(true)
    setParsingStep('Reading your files...')
    setError(null)
    setParseResult(null)
    setSelectedOrigin('')
    try {
      setParsingStep('Reading your files...')
      const [rateCardPayload, postcodeMap, surchargePayload] = await Promise.all([
        buildFilePayload(form.rateCard),
        parseZoneFileToPostcodeMap(form.zoneFile),
        form.surchargeDoc ? buildFilePayload(form.surchargeDoc) : Promise.resolve(null),
      ])
      console.log('[parseFiles] postcodeMap length:', postcodeMap ? postcodeMap.length : 'null — falling back to AI')
      const payload = { carrierName: form.name, rateCard: rateCardPayload }
      if (postcodeMap) {
        // CSV/Excel zone file parsed directly in browser — no AI needed for postcode data
        payload.postcodeMap = postcodeMap
      } else {
        // PDF zone file: send to AI for extraction
        payload.zoneFile = await buildFilePayload(form.zoneFile)
      }
      if (surchargePayload) payload.surchargeDoc = surchargePayload
      setParsingStep('AI is analysing your rate card and zone file — this takes 20–40 seconds, hang tight...')
      const { data, error } = await supabase.functions.invoke('rapid-api', { body: payload })
      if (error) throw error
      setParseResult(data)
      if (data.originDepots?.length === 1) setSelectedOrigin(data.originDepots[0])
      setParsingStep('')
    } catch (err) {
      console.error(err)
      setError('Could not analyse files. Please check your files and try again.')
      setParsingStep('')
    } finally {
      setParsing(false)
    }
  }

  async function saveCarrier() {
    if (!parseResult) return
    if (parseResult.originDepots?.length > 1 && !selectedOrigin) {
      setError('Please select your origin depot before saving.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const dataToSave = { ...parseResult, selectedOrigin: selectedOrigin || null }
      const { error } = await supabase.from('carriers').insert({
        merchant_id: merchant.id,
        name: form.name,
        parsed_data: dataToSave,
        status: 'active'
      })
      if (error) throw error
      setShowAdd(false)
      setForm({ name: '', rateCard: null, zoneFile: null, surchargeDoc: null })
      setParseResult(null)
      setSelectedOrigin('')
      fetchCarriers()
    } catch (err) {
      setError('Could not save carrier. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCarrier(id) {
    if (!window.confirm('Delete this carrier?')) return
    await supabase.from('carriers').delete().eq('id', id)
    fetchCarriers()
  }

  async function updateFuelLevy(id, pct) {
    const val = pct === '' ? null : parseFloat(pct)
    await supabase.from('carriers').update({ fuel_levy_pct: val }).eq('id', id)
    fetchCarriers()
  }

  async function saveSurchargeRules(carrierId, rules) {
    await supabase.from('carriers').update({ surcharge_rules: rules }).eq('id', carrierId)
    fetchCarriers()
  }

  async function saveEligibilityRules(carrierId) {
    const rules = {}
    if (eligibilityForm.maxWeightKg !== '' && eligibilityForm.maxWeightKg != null) rules.maxWeightKg = parseFloat(eligibilityForm.maxWeightKg)
    if (eligibilityForm.maxLengthCm !== '' && eligibilityForm.maxLengthCm != null) rules.maxLengthCm = parseFloat(eligibilityForm.maxLengthCm)
    if (eligibilityForm.maxWidthCm !== '' && eligibilityForm.maxWidthCm != null) rules.maxWidthCm = parseFloat(eligibilityForm.maxWidthCm)
    if (eligibilityForm.maxHeightCm !== '' && eligibilityForm.maxHeightCm != null) rules.maxHeightCm = parseFloat(eligibilityForm.maxHeightCm)
    await supabase.from('carriers').update({ eligibility_rules: Object.keys(rules).length ? rules : null }).eq('id', carrierId)
    await fetchCarriers()
    setEligibilityCarrierId(null)
  }

  const originDepots = parseResult?.originDepots || []

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-dot" />
          ShippingIQ
        </div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/carriers" className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Carriers
          </a>
          <a href="/rules" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Rules
          </a>
          <a href="/quote" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Get a Quote
          </a>
          {isAdmin && (
            <>
              <div className="nav-divider" />
              <a href="/team" className="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Team
              </a>
              <a href="/settings" className="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
              </a>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">D</div>
            <div className="user-info">
              <div className="user-name">Dave Bishop</div>
              <div className="user-role">{isAdmin ? 'Admin' : 'User'}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="main-title">Carriers</h1>
            <p className="main-subtitle">Manage your freight carriers and rate cards</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowAdd(true); setParseResult(null); setError(null); setViewingCarrier(null) }}>
            + Add Carrier
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Add New Carrier</h2>
            <div className="form-group">
              <label className="form-label">Carrier Name</label>
              <input className="form-input" type="text" placeholder="e.g. Allied Express, Mainfreight, StarTrack" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate Card <span style={{ color: '#6b7280', fontWeight: 400 }}>(required — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, rateCard: e.target.files[0] })} />
              {form.rateCard && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>✓ {form.rateCard.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Zone File <span style={{ color: '#6b7280', fontWeight: 400 }}>(required — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, zoneFile: e.target.files[0] })} />
              {form.zoneFile && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>✓ {form.zoneFile.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Additional Charges Schedule <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, surchargeDoc: e.target.files[0] })} />
              {form.surchargeDoc && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>✓ {form.surchargeDoc.name}</div>}
            </div>

            {error && <div className="error-msg">{error}</div>}

            {parsing && (
              <div style={{ margin: '16px 0', padding: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', border: '3px solid #E8521A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#0369a1' }}>{parsingStep}</span>
              </div>
            )}

            {parseResult && (
              <div className="parse-result">
                <div className="parse-result-title">✓ Analysis complete</div>
                <p style={{ marginBottom: '8px', color: '#6b7280' }}>{parseResult.summary}</p>
                <div className="parse-tags">
                  <span className="parse-tag">Model {parseResult.pricingModel || '?'}</span>
                  {parseResult.zones?.slice(0, 6).map(z => <span key={z} className="parse-tag">{z}</span>)}
                  {parseResult.zones?.length > 6 && <span className="parse-tag">+{parseResult.zones.length - 6} more zones</span>}
                  {parseResult.serviceTypes?.map(s => <span key={s} className="parse-tag">{s}</span>)}
                  <span className="parse-tag">{parseResult.rateCount} rates</span>
                  {parseResult.surcharges?.length > 0 && <span className="parse-tag">{parseResult.surcharges.length} surcharges</span>}
                </div>

                {originDepots.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                      Where do you ship from? <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {originDepots.map(depot => (
                        <button
                          key={depot}
                          onClick={() => setSelectedOrigin(depot)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '2px solid',
                            borderColor: selectedOrigin === depot ? '#E8521A' : '#e5e7eb',
                            background: selectedOrigin === depot ? '#fff5f0' : '#fff',
                            color: selectedOrigin === depot ? '#E8521A' : '#374151',
                            fontWeight: selectedOrigin === depot ? '600' : '400',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {depot}
                        </button>
                      ))}
                    </div>
                    {selectedOrigin && (
                      <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                        Rates will be calculated from <strong>{selectedOrigin}</strong> to your customer's postcode.
                      </p>
                    )}
                  </div>
                )}

                {parseResult.warnings?.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                    <strong>Warnings:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {parseResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                <SurchargeTable surcharges={parseResult.surcharges} />
              </div>
            )}

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowAdd(false); setParseResult(null); setError(null); setSelectedOrigin('') }}>Cancel</button>
              {!parseResult ? (
                <button className="btn-primary" onClick={parseFiles} disabled={parsing}>
                  {parsing ? 'Analysing...' : 'Analyse Files'}
                </button>
              ) : (
                <button className="btn-primary" onClick={saveCarrier} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Carrier'}
                </button>
              )}
            </div>
          </div>
        )}

        {viewingCarrier && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{viewingCarrier.name} — Rate Card</h2>
              <button className="btn-secondary" onClick={() => setViewingCarrier(null)}>Close</button>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>{viewingCarrier.parsed_data?.summary}</p>
            {viewingCarrier.parsed_data?.selectedOrigin && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                Shipping from: <strong>{viewingCarrier.parsed_data.selectedOrigin}</strong> · Model <strong>{viewingCarrier.parsed_data.pricingModel}</strong>
              </p>
            )}
            <RateTable carrier={viewingCarrier} />
            <SurchargeTable surcharges={viewingCarrier.parsed_data?.surcharges} />
          </div>
        )}

        {surchargeRulesCarrier && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{surchargeRulesCarrier.name} — Surcharge Rules</h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '4px' }}>Configure when each surcharge is automatically applied to a quote.</p>
              </div>
              <button className="btn-secondary" onClick={() => setSurchargeRulesCarrier(null)}>Close</button>
            </div>
            {(!surchargeRulesCarrier.parsed_data?.surcharges?.length) ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>No surcharges found for this carrier. Re-upload with a surcharge schedule to configure rules.</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: '0', marginBottom: '8px', padding: '0 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Surcharge</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Trigger</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Threshold</div>
                </div>
                {surchargeRulesCarrier.parsed_data.surcharges.map((s, i) => {
                  const key = s.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                  const rule = surchargeRules[key] || { trigger: 'manual' }
                  const isWeightDim = ['tailgate_delivery','hand_load_per_item','overlength_4_8m','overlength_over_8m'].some(k => key.includes(k.split('_')[0]))
                  const isOverlength = key.includes('overlength')
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: '12px', alignItems: 'center', padding: '12px', borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{s.amount}</div>
                      </div>
                      <div>
                        <select
                          value={rule.trigger}
                          onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, trigger: e.target.value } })}
                          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}>
                          <option value="manual">Manual only</option>
                          <option value="auto">Auto — use carrier thresholds</option>
                          <option value="auto_override">Auto with override — use my thresholds</option>
                          {key.includes('residential') && <option value="always">Always apply</option>}
                          {key.includes('residential') && <option value="never">Never apply</option>}
                        </select>
                      </div>
                      <div>
                        {rule.trigger === 'auto' && (
                          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                            {s.autoWeightKg ? 'Over ' + s.autoWeightKg + 'kg' : ''}
                            {s.autoLengthMinCm ? (s.autoWeightKg ? ' · ' : '') + 'Over ' + s.autoLengthMinCm + 'cm' : ''}
                            {!s.autoWeightKg && !s.autoLengthMinCm && 'Using carrier conditions'}
                          </div>
                        )}
                        {rule.trigger === 'auto_override' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {!isOverlength && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="number" placeholder="kg" value={rule.weightKg || ''} onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, weightKg: e.target.value } })} style={{ width: '65px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>kg</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="number" placeholder="cm" value={rule.lengthCm || ''} onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, lengthCm: e.target.value } })} style={{ width: '65px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                              <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>cm</span>
                            </div>
                          </div>
                        )}
                        {rule.trigger === 'manual' && <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Added manually</span>}
                        {rule.trigger === 'always' && <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Always included</span>}
                        {rule.trigger === 'never' && <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Never included</span>}
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" onClick={() => { saveSurchargeRules(surchargeRulesCarrier.id, surchargeRules); setSurchargeRulesCarrier(null) }}>
                    Save Surcharge Rules
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading carriers...</p></div>
        ) : carriers.length === 0 && !showAdd ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <h2>No carriers yet</h2>
            <p>Add your first carrier to start generating accurate freight quotes.</p>
            <button className="empty-cta" onClick={() => setShowAdd(true)}>Add a carrier</button>
          </div>
        ) : (
          <div className="carriers-list">
            {carriers.map(carrier => (
              <div key={carrier.id} className="carrier-card">
                {carrier.status === 'active' && !carrier.parsed_data?.postcodeMap?.length && (
                  <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                    ⚠ No postcode data — freight quotes will fail for this carrier. Contact your carrier account manager for a postcode zone file.
                  </div>
                )}
                <div className="carrier-info">
                  <div className="carrier-name">{carrier.name}</div>
                  <div className="carrier-meta">
                    {carrier.parsed_data?.rateCount} rates · {carrier.parsed_data?.zones?.length} zones · {carrier.parsed_data?.serviceTypes?.join(', ')}
                    {carrier.parsed_data?.pricingModel && ` · Model ${carrier.parsed_data.pricingModel}`}
                    {carrier.parsed_data?.selectedOrigin && ` · From ${carrier.parsed_data.selectedOrigin}`}
                    {carrier.parsed_data?.surcharges?.length > 0 && ` · ${carrier.parsed_data.surcharges.length} surcharges`}
                  </div>
                  <div className="carrier-summary">{carrier.parsed_data?.summary}</div>
                </div>
                <div className="carrier-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Fuel levy %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 17.5"
                      defaultValue={carrier.fuel_levy_pct ?? ''}
                      onBlur={e => updateFuelLevy(carrier.id, e.target.value)}
                      style={{ width: '80px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <span className={"carrier-status " + carrier.status}>{carrier.status}</span>
                  <button className="btn-secondary" onClick={() => setViewingCarrier(viewingCarrier?.id === carrier.id ? null : carrier)}>
                    {viewingCarrier?.id === carrier.id ? 'Hide Rates' : 'View Rates'}
                  </button>
                  {carrier.parsed_data?.surcharges?.length > 0 && (
                    <button className="btn-secondary" onClick={() => {
                      setSurchargeRulesCarrier(surchargeRulesCarrier?.id === carrier.id ? null : carrier)
                      setSurchargeRules(carrier.surcharge_rules || {})
                    }}>
                      {surchargeRulesCarrier?.id === carrier.id ? 'Hide Rules' : 'Surcharge Rules'}
                    </button>
                  )}
                  {carrier.status === 'active' && (
                    <button className="btn-secondary" onClick={() => {
                      if (eligibilityCarrierId === carrier.id) {
                        setEligibilityCarrierId(null)
                      } else {
                        const fresh = carriers.find(c => c.id === carrier.id)
                        const existing = fresh?.eligibility_rules || {}
                        setEligibilityCarrierId(carrier.id)
                        setEligibilityForm({
                          maxWeightKg: existing.maxWeightKg ?? '',
                          maxLengthCm: existing.maxLengthCm ?? '',
                          maxWidthCm: existing.maxWidthCm ?? '',
                          maxHeightCm: existing.maxHeightCm ?? '',
                        })
                      }
                    }}>
                      {eligibilityCarrierId === carrier.id ? 'Hide Limits' : 'Carrier Limits'}
                    </button>
                  )}
                  <button className="btn-danger" onClick={() => deleteCarrier(carrier.id)}>Delete</button>
                </div>
              {carrier.status === 'active' && eligibilityCarrierId === carrier.id && (
                <div style={{ paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>
                    Carrier Limits <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
                    Set limits if this carrier can't handle all sizes. Leave blank for no limit.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { key: 'maxWeightKg', label: 'Max Weight', unit: 'kg' },
                      { key: 'maxLengthCm', label: 'Max Length', unit: 'cm' },
                      { key: 'maxWidthCm', label: 'Max Width', unit: 'cm' },
                      { key: 'maxHeightCm', label: 'Max Height', unit: 'cm' },
                    ].map(({ key, label, unit }) => (
                      <div key={key}>
                        <label style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label} ({unit})</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="No limit"
                          value={eligibilityForm[key] ?? ''}
                          onChange={e => setEligibilityForm({ ...eligibilityForm, [key]: e.target.value })}
                          style={{ width: '100px', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                        />
                      </div>
                    ))}
                    <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => saveEligibilityRules(carrier.id)}>
                      Save Limits
                    </button>
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
