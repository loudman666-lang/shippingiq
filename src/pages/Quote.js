import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

function calculateRate(carrier, postcode, weight) {
  const data = carrier.parsed_data
  const model = data?.pricingModel
  const origin = data?.selectedOrigin
  const postcodeMap = data?.postcodeMap || []
  const postcodeEntry = postcodeMap.find(p => String(p.postcode) === String(postcode))
  if (!postcodeEntry) return { error: 'Postcode ' + postcode + ' not found in zone file for ' + carrier.name }
  const zoneCode = postcodeEntry.zoneCode
  const zoneName = postcodeEntry.zone
  const suburb = postcodeEntry.suburb
  const state = postcodeEntry.state

  if (model === 'B') {
    const rates = data.modelBRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && (r.zoneCode === zoneCode || r.zone === zoneName))
    if (!rate) return { error: 'No rate found for zone ' + zoneName + ' from ' + origin }
    const freight = Math.max(rate.basicCharge + weight * rate.perKgRate, rate.minimumCharge)
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service: rate.service, weight: weight + 'kg',
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
      formula: 'MAX($' + rate.basicCharge.toFixed(2) + ' + ' + weight + 'kg x $' + rate.perKgRate.toFixed(3) + ', $' + rate.minimumCharge.toFixed(2) + ')',
      model: 'B'
    }
  }

  if (model === 'C') {
    const rates = data.modelCRates || []
    const rate = rates.find(r => (!origin || r.originDepot === origin) && r.destinationDepot === zoneName)
    if (!rate) return { error: 'No depot-to-depot rate found from ' + origin + ' to ' + zoneName }
    const freight = Math.max(rate.basicCharge + weight * rate.perKgRate, rate.minimumCharge)
    return {
      carrier: carrier.name, origin, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, service: 'Depot to Depot', weight: weight + 'kg',
      basicCharge: rate.basicCharge, perKgRate: rate.perKgRate, minimumCharge: rate.minimumCharge,
      freightCost: Math.round(freight * 100) / 100,
      formula: 'MAX($' + rate.basicCharge.toFixed(2) + ' + ' + weight + 'kg x $' + rate.perKgRate.toFixed(3) + ', $' + rate.minimumCharge.toFixed(2) + ')',
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
      if (parts.length === 2 && weight >= parseFloat(parts[0]) && weight <= parseFloat(parts[1])) { matchedBreak = wb; break }
    }
    if (!matchedBreak) return { error: 'No weight break found for ' + weight + 'kg' }
    const row = rates.find(r => r.service === service && r.weight === matchedBreak)
    if (!row) return { error: 'No rate found for ' + matchedBreak + ' to ' + zoneName }
    const freight = row[zoneName] || row[zoneCode]
    if (!freight) return { error: 'No rate for zone ' + zoneName }
    return {
      carrier: carrier.name, destination: suburb + ', ' + state + ' ' + postcode,
      zone: zoneName, zoneCode, service, weight: weight + 'kg', weightBreak: matchedBreak,
      freightCost: Math.round(freight * 100) / 100,
      formula: 'Flat rate for ' + matchedBreak + ' to ' + zoneName, model: 'A'
    }
  }

  return { error: 'Unknown pricing model: ' + model }
}

export default function Quote() {
  const { merchant, isAdmin } = useAuth()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [postcode, setPostcode] = useState('')
  const [weight, setWeight] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { if (merchant?.id) fetchCarriers() }, [merchant])

  async function fetchCarriers() {
    setLoading(true)
    const { data } = await supabase.from('carriers').select('*').eq('merchant_id', merchant.id).eq('status', 'active')
    setCarriers(data || [])
    setLoading(false)
  }

  function getQuote() {
    setError(null)
    setResults(null)
    if (!postcode || postcode.length < 4) { setError('Please enter a valid Australian postcode.'); return }
    if (!weight || isNaN(weight) || parseFloat(weight) <= 0) { setError('Please enter a valid weight in kg.'); return }
    if (carriers.length === 0) { setError('No active carriers found. Add a carrier first.'); return }
    setResults(carriers.map(c => calculateRate(c, postcode, parseFloat(weight))))
  }

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
            <p className="main-subtitle">Test your freight rates — enter a postcode and weight to see what your customers will be charged</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px', maxWidth: '480px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Customer Postcode</label>
              <input className="form-input" type="text" placeholder="e.g. 2000" maxLength={4} value={postcode} onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && getQuote()} />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Weight (kg)</label>
              <input className="form-input" type="number" placeholder="e.g. 10" min="0.1" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} onKeyDown={e => e.key === 'Enter' && getQuote()} />
            </div>
          </div>
          {error && <div className="error-msg" style={{ marginBottom: '12px' }}>{error}</div>}
          <button className="btn-primary" style={{ width: '100%' }} onClick={getQuote} disabled={loading}>Calculate Freight</button>
        </div>

        {results && results.map((result, i) => (
          <div key={i} className="card" style={{ marginBottom: '16px' }}>
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
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zone</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>{result.zone}{result.zoneCode ? ' (' + result.zoneCode + ')' : ''}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>{result.weight}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>Model {result.model}</div>
                  </div>
                </div>
                {result.formula && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
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
