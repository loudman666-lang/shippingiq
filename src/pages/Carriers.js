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

// Find the first column index whose header contains any of the given terms.
function findColIndex(headers, ...terms) {
  const lower = headers.map(h => String(h ?? '').toLowerCase().trim())
  return lower.findIndex(h => terms.some(t => h === t || h.includes(t)))
}

function looksLikePostcode(val) {
  if (typeof val === 'number') return Number.isInteger(val) && val >= 200 && val <= 9999
  return /^\d{3,4}$/.test(String(val ?? '').trim())
}

function computeFileHash(files) {
  return files.filter(Boolean).map(f => `${f.name}:${f.size}:${f.lastModified}`).join('|')
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

// ---------------------------------------------------------------------------
// Browser-side file scanning — classifies and extracts data from every sheet
// in every uploaded file. postcodeMap is built entirely in the browser.
// Rate and surcharge text is forwarded to separate focused AI calls.
// ---------------------------------------------------------------------------

function parseZoneSheetToObjects(XLSX, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return null

  // Find the header row — first row in rows 0–20 that contains 2+ zone keywords.
  // Handles sheets where data starts after title rows (e.g. Allied AOE Matrix).
  const HEADER_KW = /postcode|post.?code|suburb|locality|state|zone|area/i
  let headerRowIdx = 0
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const matches = rows[r].filter(cell => HEADER_KW.test(String(cell ?? ''))).length
    if (matches >= 2) { headerRowIdx = r; break }
  }

  const headers = rows[headerRowIdx]
  console.log('[parseZoneSheetToObjects] header row index:', headerRowIdx, '| cols:', headers.map((h, i) => `[${i}]${h}`).join(' | '))

  let postcodeCol   = findColIndex(headers, 'postcode', 'post code', 'post_code', 'pc', 'zip')
  const zoneCodeCol = findColIndex(headers, 'zone code', 'zone_code', 'zonecode', 'g zone', 'g-zone', 'gzone')
  const zoneNameTerms = ['zone name', 'zone_name', 'zonename', 'zone']
  const zoneNameCol = headers.map(h => String(h ?? '').toLowerCase().trim())
    .findIndex((h, i) => i !== zoneCodeCol && zoneNameTerms.some(t => h === t || h.includes(t)))
  const suburbCol   = findColIndex(headers, 'suburb', 'locality')
  const stateCol    = findColIndex(headers, 'state')
  console.log('[parseZoneSheetToObjects] matched cols — postcode:', postcodeCol, 'zoneCode:', zoneCodeCol, 'zoneName:', zoneNameCol, 'suburb:', suburbCol, 'state:', stateCol)

  // Fallback: if postcode column still not found by header name, scan data rows below
  // the header row for a column of 4-digit numeric values.
  if (postcodeCol === -1) {
    const scanRows = rows.slice(headerRowIdx + 1, headerRowIdx + 21)
    const maxCols = Math.max(...scanRows.map(r => r.length), headers.length)
    for (let c = 0; c < maxCols; c++) {
      const first5 = scanRows.map(r => r[c]).filter(v => v !== '' && v !== null && v !== undefined).slice(0, 5)
        .map(v => `${v}(${typeof v})`)
      console.log('[parseZoneSheetToObjects] data scan col', c, '→', first5.join(', '))
      const hits = scanRows.filter(r => looksLikePostcode(r[c])).length
      if (hits >= 3) {
        postcodeCol = c
        console.log('[parseZoneSheetToObjects] postcode col found by data scan: col', c, '| header:', String(headers[c] ?? '(none)').trim(), '| hits:', hits)
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
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
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

// Return surcharge text if the sheet contains surcharge-related content, else null.
function extractSurchargeText(rows, sheetName) {
  const SURCHARGE_KW = /surcharge|tailgate|residential|fuel\s*levy|dangerous\s*goods|\bDG\b|overlength|oversize|extra\s*charge|additional\s*charge/i
  if (!rows.some(row => row.some(cell => SURCHARGE_KW.test(String(cell ?? ''))))) return null
  const lines = rows
    .map(row => row.map(cell => {
      const v = String(cell ?? '').trim()
      return v.includes(',') ? `"${v}"` : v
    }).join(','))
    .filter(line => line.replace(/,/g, '').trim() !== '')
  return lines.length > 1 ? `[${sheetName}]\n${lines.join('\n').slice(0, 4000)}` : null
}

function deduplicatePostcodeMap(allRows) {
  const seen = new Map()
  for (const row of allRows) {
    if (!seen.has(row.postcode)) seen.set(row.postcode, row)
  }
  return Array.from(seen.values())
}

// Scan all sheets in an already-loaded Excel workbook.
// Returns { postcodeRows, rateTexts, surchargeTexts }.
function scanExcelBytes(XLSX, bytes) {
  const postcodeRows = []
  const rateTexts = []
  const surchargeTexts = []
  const workbook = XLSX.read(bytes, { type: 'array' })
  for (const sheetName of workbook.SheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      // Zone detection takes priority — if found, skip rate/surcharge for this sheet.
      const zoneRows = parseZoneSheetToObjects(XLSX, sheet)
      if (zoneRows) {
        console.log('[scan] zone sheet:', sheetName, '→', zoneRows.length, 'rows')
        postcodeRows.push(...zoneRows)
        continue
      }

      const rateText = extractRateSheetCompact(XLSX, sheet)
      if (rateText) {
        console.log('[scan] rate sheet:', sheetName)
        rateTexts.push(`[${sheetName}]\n${rateText}`)
      }

      const surchargeText = extractSurchargeText(rows, sheetName)
      if (surchargeText) {
        console.log('[scan] surcharge sheet:', sheetName)
        surchargeTexts.push(surchargeText)
      }

      // Unknown sheet — add small snippet as rate context fallback
      if (!rateText && !surchargeText) {
        const csv = XLSX.utils.sheet_to_csv(sheet).trim()
        if (csv && rows.length > 1) {
          rateTexts.push(`[${sheetName}]\n${csv.slice(0, 2000)}`)
        }
      }
    } catch (e) {
      console.warn('[scan] error processing sheet', sheetName, e.message)
    }
  }
  return { postcodeRows, rateTexts, surchargeTexts }
}

// Scan a CSV file text. Returns { postcodeRows, rateTexts, surchargeTexts }.
function scanCsvText(text, fileName) {
  const postcodeRows = parseCsvZoneToObjects(text)
  if (postcodeRows) {
    console.log('[scan] zone CSV:', fileName, '→', postcodeRows.length, 'rows')
    return { postcodeRows, rateTexts: [], surchargeTexts: [] }
  }
  const SURCHARGE_KW = /surcharge|tailgate|residential|fuel\s*levy|dangerous\s*goods|\bDG\b|overlength|oversize/i
  if (SURCHARGE_KW.test(text)) {
    console.log('[scan] surcharge CSV:', fileName)
    return { postcodeRows: [], rateTexts: [], surchargeTexts: [`[${fileName}]\n${text.slice(0, 4000)}`] }
  }
  console.log('[scan] rate CSV:', fileName)
  return { postcodeRows: [], rateTexts: [`[${fileName}]\n${text.slice(0, 8000)}`], surchargeTexts: [] }
}

// Build modelBRates array from compact CSV text using the column map Claude identified.
// Claude returns structure only; this function extracts every rate row locally.
function buildModelBRatesFromCSV(rateText, structure) {
  if (structure.pricingModel !== 'B') return []
  const columnMap = structure.columnMap
  if (!columnMap || Object.keys(columnMap).length === 0) return []

  const service = structure.service || 'Road Express'
  const zoneCodeKey = (structure.zoneCodeCol || '').toLowerCase().trim()
  const zoneNameKey = (structure.zoneNameCol || '').toLowerCase().trim()

  const modelBRates = []

  // rateText may contain multiple sheet sections separated by ---
  const sections = rateText.split(/\n\n---\n\n/)

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) continue

    // Skip sheet label lines like [SheetName] or (rate table — essential columns only)
    let headerIdx = 0
    while (headerIdx < lines.length && /^\[|^\(/.test(lines[headerIdx].trim())) headerIdx++
    if (headerIdx >= lines.length - 1) continue

    const headers = parseCsvLine(lines[headerIdx]).map(h => h.toLowerCase().trim())
    const zoneCodeIdx = headers.indexOf(zoneCodeKey)
    const zoneNameIdx = headers.indexOf(zoneNameKey)

    // Pre-resolve column indices for each depot
    const depotCols = Object.entries(columnMap).map(([depot, cols]) => ({
      depot,
      basicIdx:  headers.indexOf((cols.basic   || '').toLowerCase().trim()),
      perKgIdx:  headers.indexOf((cols.perKg   || '').toLowerCase().trim()),
      minIdx:    headers.indexOf((cols.minimum || '').toLowerCase().trim()),
    })).filter(d => d.basicIdx !== -1 || d.perKgIdx !== -1)

    if (depotCols.length === 0) continue

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.every(c => !String(c).trim())) continue

      const zoneCode = zoneCodeIdx !== -1 ? String(cols[zoneCodeIdx] ?? '').trim() : ''
      const zoneName = zoneNameIdx !== -1 ? String(cols[zoneNameIdx] ?? '').trim() : zoneCode
      if (!zoneCode && !zoneName) continue

      for (const { depot, basicIdx, perKgIdx, minIdx } of depotCols) {
        const basicCharge    = basicIdx  !== -1 ? parseFloat(cols[basicIdx])  || 0 : 0
        const perKgRate      = perKgIdx  !== -1 ? parseFloat(cols[perKgIdx])  || 0 : 0
        const minimumCharge  = minIdx    !== -1 ? parseFloat(cols[minIdx])    || 0 : 0
        if (basicCharge === 0 && perKgRate === 0) continue
        modelBRates.push({
          originDepot: depot,
          service,
          zoneCode: zoneCode || zoneName,
          zone:     zoneName || zoneCode,
          basicCharge,
          perKgRate,
          minimumCharge,
        })
      }
    }
  }

  console.log('[buildModelBRatesFromCSV] built', modelBRates.length, 'rate rows from CSV')
  return modelBRates
}

export default function Carriers() {
  const { profile, merchant, isAdmin } = useAuth()
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
  const [showReUploadConfirm, setShowReUploadConfirm] = useState(null)
  const [fromCache, setFromCache] = useState(false)

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

  async function parseFiles(skipConfirm = false) {
    if (!form.name || !form.rateCard || !form.zoneFile) {
      setError('Please enter a carrier name and upload both the rate card and zone file.')
      return
    }

    setFromCache(false)
    const hash = computeFileHash([form.rateCard, form.zoneFile, form.surchargeDoc])

    // 1. File hash check — if these exact files are already parsed, skip AI entirely
    const hashMatch = carriers.find(c => c.status === 'active' && c.parsed_data?.fileHash === hash)
    if (hashMatch) {
      setParseResult(hashMatch.parsed_data)
      setSelectedOrigin(hashMatch.parsed_data?.selectedOrigin || (hashMatch.parsed_data?.originDepots?.length === 1 ? hashMatch.parsed_data.originDepots[0] : ''))
      setFromCache(true)
      setError(null)
      return
    }

    // 2. Re-upload confirmation — existing active carrier with same name
    if (!skipConfirm) {
      const existing = carriers.find(c => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.status === 'active')
      if (existing) {
        setShowReUploadConfirm(existing)
        return
      }
    }

    // 3. Rate limit check — skip if merchant is exempt
    const { data: merchantMeta } = await supabase
      .from('merchants').select('upload_limit_exempt').eq('id', merchant.id).single()
    if (!merchantMeta?.upload_limit_exempt) {
      const cutoff = new Date(Date.now() - 86400000).toISOString()
      const { count } = await supabase
        .from('upload_logs').select('*', { count: 'exact', head: true })
        .eq('merchant_id', merchant.id).gte('created_at', cutoff)
      if (count >= 10) {
        setError('Daily upload limit reached (10/day). Please try again tomorrow or contact support.')
        return
      }
    }

    setParsing(true)
    setError(null)
    setParseResult(null)
    setSelectedOrigin('')
    try {
      setParsingStep('Reading files...')
      const XLSX = await import('https://esm.sh/xlsx@0.18.5')

      const allPostcodeRows = []
      const allRateTexts    = []
      const allSurchargeTexts = []
      const pdfPayloads     = []
      let hasPdfZoneFile    = false

      const uploads = [
        { file: form.rateCard,    slot: 'rate card' },
        { file: form.zoneFile,    slot: 'zone file' },
        ...(form.surchargeDoc ? [{ file: form.surchargeDoc, slot: 'surcharge doc' }] : []),
      ]

      for (const { file, slot } of uploads) {
        if (!file) continue
        const type = getFileType(file)

        if (type === 'pdf') {
          if (slot === 'zone file') hasPdfZoneFile = true
          const data = await fileToBase64(file)
          pdfPayloads.push({ data, name: file.name, slot })
          continue
        }

        if (type === 'excel') {
          const base64 = await fileToBase64(file)
          const binary = atob(base64)
          const bytes  = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const { postcodeRows, rateTexts, surchargeTexts } = scanExcelBytes(XLSX, bytes)
          allPostcodeRows.push(...postcodeRows)
          allRateTexts.push(...rateTexts)
          allSurchargeTexts.push(...surchargeTexts)
          continue
        }

        if (type === 'csv') {
          const text = await fileReadAsText(file)
          const { postcodeRows, rateTexts, surchargeTexts } = scanCsvText(text, file.name)
          allPostcodeRows.push(...postcodeRows)
          allRateTexts.push(...rateTexts)
          allSurchargeTexts.push(...surchargeTexts)
        }
      }

      setParsingStep('Building postcode map...')
      const postcodeMap = deduplicatePostcodeMap(allPostcodeRows)
      console.log('[parseFiles] postcodeMap entries:', postcodeMap.length)

      if (hasPdfZoneFile && postcodeMap.length === 0) {
        setError('PDF zone files may have incomplete postcode data. Request an Excel or CSV zone file from your carrier for best results.')
      }

      setParsingStep('Analysing rates — this takes 20–40 seconds...')
      const combinedRateText = allRateTexts.join('\n\n---\n\n')
      const ratePayload = { mode: 'rates', carrierName: form.name, rateText: combinedRateText, pdfs: pdfPayloads }
      console.log('[payload size]', JSON.stringify(ratePayload).length, '| rateText length:', combinedRateText.length, '| pdfs:', pdfPayloads.length)
      const { data: rateData, error: rateError } = await supabase.functions.invoke('rapid-api', {
        body: ratePayload
      })
      if (rateError) throw rateError
      console.log('[parseFiles] rate structure from Claude:', JSON.stringify(rateData).slice(0, 300))

      // For Model B: build modelBRates in the browser from CSV using Claude's column map
      const modelBRates = buildModelBRatesFromCSV(combinedRateText, rateData)

      let surchargeData = null
      if (allSurchargeTexts.length > 0) {
        setParsingStep('Extracting surcharges...')
        const { data: sd } = await supabase.functions.invoke('rapid-api', {
          body: { mode: 'surcharges', carrierName: form.name, surchargeText: allSurchargeTexts.join('\n\n---\n\n') }
        })
        surchargeData = sd
      }

      // Log this successful upload
      await supabase.from('upload_logs').insert({ merchant_id: merchant.id })

      setParsingStep('Done.')
      const parsed = {
        ...rateData,
        fileHash: hash,
        modelBRates: modelBRates.length > 0 ? modelBRates : (rateData?.modelBRates ?? []),
        zones: modelBRates.length > 0
          ? [...new Set(modelBRates.map(r => r.zone).filter(Boolean))]
          : (rateData?.zones ?? []),
        postcodeMap,
        surcharges: surchargeData?.surcharges ?? rateData?.surcharges ?? [],
      }
      setParseResult(parsed)
      if (parsed.originDepots?.length === 1) setSelectedOrigin(parsed.originDepots[0])
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

  async function updateCubicFactor(id, val) {
    const carrier = carriers.find(c => c.id === id)
    if (!carrier) return
    const factor = parseFloat(val) || 250
    await supabase.from('carriers').update({ parsed_data: { ...carrier.parsed_data, cubicFactor: factor } }).eq('id', id)
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
          <a href="/resources" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Resources
          </a>
          {isAdmin && (
            <>
              <div className="nav-divider" />
              <a href="/settings" className="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
              </a>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name || merchant?.name}</div>
              <div className="user-role">{isAdmin ? 'Admin' : 'User'}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
        <div className="main-header">
          <div>
            <h1 className="main-title">Carriers</h1>
            <p className="main-subtitle">Manage your freight carriers and rate cards</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowAdd(true); setParseResult(null); setError(null); setViewingCarrier(null); setFromCache(false) }}>
            + Add Carrier
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Add New Carrier</h2>
            <div className="form-group">
              <label className="form-label">Carrier Name</label>
              <input className="form-input" type="text" placeholder="e.g. Allied Express, Mainfreight, StarTrack" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={!!parseResult || parsing} />
            </div>
            <div className="form-group">
              <label className="form-label">Rate Card <span style={{ color: '#6b7280', fontWeight: 400 }}>(required — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, rateCard: e.target.files[0] })} disabled={!!parseResult || parsing} />
              {form.rateCard && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>✓ {form.rateCard.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Zone File <span style={{ color: '#6b7280', fontWeight: 400 }}>(required — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, zoneFile: e.target.files[0] })} disabled={!!parseResult || parsing} />
              {form.zoneFile && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>✓ {form.zoneFile.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Additional Charges Schedule <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional — CSV, Excel or PDF)</span></label>
              <input className="form-input" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e => setForm({ ...form, surchargeDoc: e.target.files[0] })} disabled={!!parseResult || parsing} />
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
                {fromCache && (
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', color: '#166534', marginBottom: '12px' }}>
                    Files unchanged — using existing analysis.
                  </div>
                )}
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
                <div style={{ marginTop: '12px', padding: '12px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>Cubic weight factor</span>
                  <input
                    type="number"
                    min="100"
                    max="500"
                    step="1"
                    value={parseResult.cubicFactor ?? 250}
                    onChange={e => setParseResult({ ...parseResult, cubicFactor: parseFloat(e.target.value) || 250 })}
                    style={{ width: '80px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {(parseResult.cubicFactor ?? 250) >= 320
                      ? 'Air freight — L×W×H×factor÷1,000,000'
                      : (parseResult.cubicFactor ?? 250) <= 210
                      ? 'Regional carrier — L×W×H×factor÷1,000,000'
                      : 'Standard domestic (250 = ÷4,000 equivalent)'}
                  </span>
                </div>
                <SurchargeTable surcharges={parseResult.surcharges} />
              </div>
            )}

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowAdd(false); setParseResult(null); setError(null); setSelectedOrigin(''); setFromCache(false) }}>Cancel</button>
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
                <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '4px' }}>These surcharges were extracted from your carrier's rate card. By default they are all set to Off — you need to turn on the ones that apply to your business.</p>
                <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '6px' }}>For each surcharge, choose how it should be triggered: automatically based on the carrier's own conditions, automatically based on your own thresholds, always added to every quote, or managed manually outside the system.</p>
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
                  const isOverlength = key.includes('overlength')
                  const isOverlength8m = key === 'overlength_over_8m'
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: '12px', alignItems: 'flex-start', padding: '12px', borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{s.amount}</div>
                      </div>
                      <div>
                        <select
                          value={rule.trigger}
                          onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, trigger: e.target.value } })}
                          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', width: '100%' }}>
                          <option value="manual">Off — I'll handle this myself</option>
                          <option value="auto">On — automatic (carrier triggers)</option>
                          <option value="auto_override">On — automatic (my triggers)</option>
                          <option value="item_weight">On — per-item weight threshold</option>
                          <option value="consignment_weight">On — consignment weight threshold</option>
                          <option value="always">Always — every quote</option>
                          <option value="never">Off — never apply</option>
                        </select>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                          {rule.trigger === 'manual' && "Won't be calculated automatically. Add manually when needed."}
                          {rule.trigger === 'auto' && "Applied when carrier's own conditions are met. Thresholds from your rate card."}
                          {rule.trigger === 'auto_override' && "Applied automatically using YOUR threshold. Enter trigger values below."}
                          {rule.trigger === 'item_weight' && "Applied when any single item in the order exceeds the weight threshold you set."}
                          {rule.trigger === 'consignment_weight' && "Applied when the total consignment weight exceeds the threshold you set."}
                          {rule.trigger === 'always' && "Added to every quote with no conditions."}
                          {rule.trigger === 'never' && "Ignored completely — never added to any quote."}
                        </div>
                      </div>
                      <div>
                        {rule.trigger === 'auto' && (
                          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                            {s.autoWeightKg ? 'Over ' + s.autoWeightKg + 'kg' : ''}
                            {s.autoLengthMinCm ? (s.autoWeightKg ? ' · ' : '') + 'Over ' + s.autoLengthMinCm + 'cm' : ''}
                            {!s.autoWeightKg && !s.autoLengthMinCm && 'Using carrier conditions'}
                          </div>
                        )}
                        {(rule.trigger === 'item_weight' || rule.trigger === 'consignment_weight') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="number" placeholder="kg" value={rule.weightKg || ''} onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, weightKg: e.target.value } })} style={{ width: '65px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>kg</span>
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
                            {isOverlength8m ? (
                              <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Triggers when any item exceeds 800cm (8m)</span>
                            ) : isOverlength ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>Lower bound (cm)</span>
                                  <input type="number" placeholder="400" value={rule.lengthCm || ''} onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, lengthCm: e.target.value } })} style={{ width: '60px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Upper fixed at 800cm — 4–8m range</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="number" placeholder="cm" value={rule.lengthCm || ''} onChange={e => setSurchargeRules({ ...surchargeRules, [key]: { ...rule, lengthCm: e.target.value } })} style={{ width: '65px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }} />
                                <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>cm</span>
                              </div>
                            )}
                          </div>
                        )}
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
                    {` · Cubic ×${carrier.parsed_data?.cubicFactor ?? 250}`}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>Cubic factor</label>
                    <input
                      type="number"
                      min="100"
                      max="500"
                      step="1"
                      placeholder="250"
                      key={carrier.parsed_data?.cubicFactor}
                      defaultValue={carrier.parsed_data?.cubicFactor ?? 250}
                      onBlur={e => updateCubicFactor(carrier.id, e.target.value)}
                      style={{ width: '70px', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px' }}
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
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '8px' }}>
                    Carrier Limits <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional)</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                    Set maximum weight and dimensions this carrier can handle. At checkout, carriers that can't handle the cart items are automatically hidden — only eligible carriers appear as shipping options. Leave all fields blank if this carrier has no size restrictions.
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '12px' }}>
                    Example: if StarTrack has a 25kg max weight limit, set Max Weight to 25. Any order over 25kg will automatically show Allied Express or other unlimited carriers instead.
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
        </div>
      </main>

      {showReUploadConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Replace existing rates?</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              This will replace existing rates for <strong>{showReUploadConfirm.name}</strong>. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowReUploadConfirm(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => { setShowReUploadConfirm(null); parseFiles(true) }}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
