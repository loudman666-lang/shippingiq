import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

function calculateRate(carrier, postcode, items) {
  const data = carrier.parsed_data
  const model = data?.pricingModel
  const origin = data?.selectedOrigin
  const cubicFactor = data?.cubicFactor || 250
  const postcodeMap = data?.postcodeMap || []
  const postcodeEntry = postcodeMap.find(p => String(p.postcode) === String(postcode))
  if (!postcodeEntry) return { error: 'Postcode ' + postcode + ' not found in zone file for ' + carrier.name }

  const zoneCode = postcodeEntry.zoneCode
  const zoneName = postcodeEntry.zone
  const suburb = postcodeEntry.suburb
  const state = postcodeEntry.state

  // Calculate total consignment weight
  let totalActualWeight = 0
  let totalCubicWeight = 0
  items.forEach(item => {
    const qty = item.qty || 1
    totalActualWeight += (parseFloat(item.weight) || 0) * qty
    if (item.length && item.width && item.height) {
      totalCubicWeight += (parseFloat(item.length) * parseFloat(item.width) * parseFloat(item.height) / 4000) * qty
    }
  })
  totalActualWeight = Math.round(totalActualWeight * 100) / 100
  totalCubicWeight = Math.round(totalCubicWeight * 100) / 100
  const chargeableWeight = totalCubicWeight > 0
    ? Math.max(totalActualWeight, totalCubicWeight)
    : totalActualWeight

  if (model === 'B') {
    const rates = data.modelBRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && (r.zoneCode === zoneCode || r.zone === zoneName))
    if (!rate) return { error: 'No rate found for zone ' + zoneName + ' from ' + origin }
    const freight = Math.max(rate.basicCharge + chargeableWeight * rate.perKgRate, rate.minimumCharge)
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service: rate.service,
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
      formula: 'MAX($' + rate.basicCharge.toFixed(2) + ' + ' + chargeableWeight + 'kg x $' + rate.perKgRate.toFixed(3) + ', $' + rate.minimumCharge.toFixed(2) + ')',
      model: 'B'
    }
  }

  if (model === 'C') {
    const rates = data.modelCRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && r.destinationDepot === zoneName)
    if (!rate) return { error: 'No depot-to-depot rate found from ' + origin + ' to ' + zoneName }
    const freight = Math.max(rate.basicCharge + chargeableWeight * rate.perKgRate, rate.minimumCharge)
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, service: 'Depot to Depot',
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
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
    return {
      carrier: carrier.name, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service, weightBreak: matchedBreak,
      totalActualWeight, totalCubicWeight, chargeableWeight, cubicFactor,
      freightCost: Math.round(freight * 100) / 100,
      formula: 'Flat rate for ' + matchedBreak + ' to ' + zoneName, model: 'A'
    }
  }

  return { error: 'Unknown pricing model: ' + model }
}

const emptyItem = () => ({ id: Date.now(), qty: 1, weight: '', length: '', width: '', height: '' })

export default function Quote() {
  const { merchant, isAdmin } = useAuth()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [postcode, setPostcode] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { if (merchant?.id) fetchCarriers() }, [merchant])

  async function fetchCarriers() {
    setLoading(true)
    const { data } = await supabase.from('carriers').select('*').eq('merchant_id', merchant.id).eq('status', 'active')
    setCarriers(data || [])
    setLoading(false)
  }

  function updateItem(id, field, value) {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  function addItem() { setItems([...items, emptyItem()]) }

  function removeItem(id) { if (items.length > 1) setItems(items.filter(i => i.id !== id)) }

  function getQuote() {
    setError(null)
    setResults(null)
    if (!postcode || postcode.length < 4) { setError('Please enter a valid Australian postcode.'); return }
    if (carriers.length === 0) { setError('No active carriers found. Add a carrier first.'); return }
    const validItems = items.filter(i => i.weight && parseFloat(i.weight) > 0)
    if (validItems.length === 0) { setError('Please enter a weight for at least one item.'); return }
    setResults(carriers.map(c => calculateRate(c, postcode, validItems)))
  }

  const totalActual = items.reduce((sum, i) => sum + (parseFloat(i.weight) || 0) * (parseInt(i.qty) || 1), 0)
  const totalCubic = items.reduce((sum, i) => {
    if (i.length && i.width && i.height) return sum + (parseFloat(i.length) * parseFloat(i.width) * parseFloat(i.height) / 4000) * (parseInt(i.qty) || 1)
    return sum
  }, 0)
  const chargeable = totalCubic > 0 ? Math.max(totalActual, totalCubic) : totalActual

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo"><span className="sidebar-logo-dot" />ShippingIQ</div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/carriers" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Carriers
          </a>
          <a href="/rules" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Rules
          </a>
          <a href="/quote" className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Get a Quote
          </a>
          {isAdmin && (<>
            <div className="nav-divider" />
            <a href="/team" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Team
            </a>
            <a href="/settings" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          </>)}
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
            <h1 className="main-title">Get a Quote</h1>
            <p className="main-subtitle">Enter a destination postcode and all items in the order to calculate freight</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px', maxWidth: '640px' }}>
          <div className="form-group">
            <label className="form-label">Customer Postcode</label>
            <input className="form-input" type="text" placeholder="e.g. 2000" maxLength={4} value={postcode} onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: '160px' }} />
          </div>

          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Items in Order</div>

          <div style={{ marginBottom: '8px', display: 'grid', gridTemplateColumns: '48px 1fr 90px 80px 80px 80px 32px', gap: '8px', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Qty</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Description (optional)</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>Weight kg</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>L cm</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>W cm</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>H cm</div>
            <div></div>
          </div>

          {items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px 80px 80px 80px 32px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input className="form-input" type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} style={{ padding: '8px', textAlign: 'center' }} />
              <input className="form-input" type="text" placeholder="e.g. Sofa" value={item.desc || ''} onChange={e => updateItem(item.id, 'desc', e.target.value)} style={{ padding: '8px' }} />
              <input className="form-input" type="number" min="0.1" step="0.1" placeholder="0" value={item.weight} onChange={e => updateItem(item.id, 'weight', e.target.value)} style={{ padding: '8px' }} />
              <input className="form-input" type="number" min="1" placeholder="0" value={item.length} onChange={e => updateItem(item.id, 'length', e.target.value)} style={{ padding: '8px' }} />
              <input className="form-input" type="number" min="1" placeholder="0" value={item.width} onChange={e => updateItem(item.id, 'width', e.target.value)} style={{ padding: '8px' }} />
              <input className="form-input" type="number" min="1" placeholder="0" value={item.height} onChange={e => updateItem(item.id, 'height', e.target.value)} style={{ padding: '8px' }} />
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', padding: '0', lineHeight: 1 }}>×</button>
            </div>
          ))}

          <button onClick={addItem} style={{ fontSize: '13px', color: '#E8521A', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontWeight: '500', marginBottom: '16px' }}>
            + Add another item
          </button>

          {(totalActual > 0 || totalCubic > 0) && (
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px', fontSize: '13px', color: '#374151' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <span>Total actual: <strong>{Math.round(totalActual * 100) / 100}kg</strong></span>
                {totalCubic > 0 && <span>Total cubic: <strong>{Math.round(totalCubic * 100) / 100}kg</strong></span>}
                <span>Chargeable: <strong style={{ color: '#E8521A' }}>{Math.round(chargeable * 100) / 100}kg</strong>
                  {totalCubic > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}> ({totalCubic > totalActual ? 'cubic applies' : 'actual applies'})</span>}
                </span>
              </div>
            </div>
          )}

          {error && <div className="error-msg" style={{ marginBottom: '12px' }}>{error}</div>}
          <button className="btn-primary" style={{ width: '100%' }} onClick={getQuote} disabled={loading}>Calculate Freight</button>
        </div>

        {results && results.map((result, i) => (
          <div key={i} className="card" style={{ marginBottom: '16px', maxWidth: '640px' }}>
            {result.error ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151' }}>{result.carrier || carriers[i]?.name}</div>
                  <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '2px' }}>{result.error}</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>{result.carrier}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{result.service} · {result.origin ? 'From ' + result.origin + ' to ' : ''}{result.destination}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#E8521A' }}>${result.freightCost.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>excl. GST & fuel levy</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>{result.zone}{result.zoneCode ? ' (' + result.zoneCode + ')' : ''}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual / Cubic</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>
                      {result.totalActualWeight}kg / {result.totalCubicWeight > 0 ? result.totalCubicWeight + 'kg' : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chargeable</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#E8521A', marginTop: '2px' }}>{result.chargeableWeight}kg</div>
                  </div>
                </div>
                {result.formula && (
                  <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                    {result.formula} = <strong>${result.freightCost.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!results && !loading && carriers.length === 0 && (
          <div className="empty-state">
            <h2>No carriers set up</h2>
            <p>Add a carrier with rate cards before generating quotes.</p>
            <a href="/carriers"><button className="empty-cta">Go to Carriers</button></a>
          </div>
        )}
      </main>
    </div>
  )
}
