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

const emptyItem = () => ({ id: Date.now() + Math.random(), qty: 1, desc: '', weight: '', length: '', width: '', height: '' })

export default function Quote() {
  const { merchant, isAdmin } = useAuth()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [postcode, setPostcode] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [results, setResults] = useState(null)
  const [savedQuotes, setSavedQuotes] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => { if (merchant?.id) { fetchCarriers(); fetchSavedQuotes() } }, [merchant])

  async function fetchCarriers() {
    setLoading(true)
    const { data } = await supabase.from('carriers').select('*').eq('merchant_id', merchant.id).eq('status', 'active')
    setCarriers(data || [])
    setLoading(false)
  }

  async function fetchSavedQuotes() {
    const { data } = await supabase.from('quotes').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(20)
    setSavedQuotes(data || [])
  }

  async function saveQuote() {
    if (!results) return
    setSaving(true)
    try {
      await supabase.from('quotes').insert({
        merchant_id: merchant.id,
        postcode,
        items,
        results,
        created_at: new Date().toISOString()
      })
      fetchSavedQuotes()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  function updateItem(id, field, value) { setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i)) }
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

  const totalActual = Math.round(items.reduce((s, i) => s + (parseFloat(i.weight)||0) * (parseInt(i.qty)||1), 0) * 100) / 100
  const totalCubic = Math.round(items.reduce((s, i) => i.length && i.width && i.height ? s + (parseFloat(i.length)*parseFloat(i.width)*parseFloat(i.height)/4000)*(parseInt(i.qty)||1) : s, 0) * 100) / 100
  const chargeable = Math.round(Math.max(totalActual, totalCubic) * 100) / 100

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { href: '/carriers', label: 'Carriers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
    { href: '/rules', label: 'Rules', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { href: '/quote', label: 'Get a Quote', active: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
  ]

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo"><span className="sidebar-logo-dot" />ShippingIQ</div>
        <nav className="sidebar-nav">
          {sidebarLinks.map(l => (
            <a key={l.href} href={l.href} className={'nav-item' + (l.active ? ' active' : '')}>{l.icon}{l.label}</a>
          ))}
          {isAdmin && (<>
            <div className="nav-divider" />
            <a href="/team" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Team</a>
            <a href="/settings" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Settings</a>
          </>)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">D</div>
            <div className="user-info"><div className="user-name">Dave Bishop</div><div className="user-role">{isAdmin ? 'Admin' : 'User'}</div></div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="main-title">Get a Quote</h1>
            <p className="main-subtitle">Calculate freight for a customer order — enter destination and all items</p>
          </div>
          <button className="btn-secondary" onClick={() => setShowSaved(!showSaved)}>
            {showSaved ? 'Hide Saved' : 'Saved Quotes'} {savedQuotes.length > 0 && '(' + savedQuotes.length + ')'}
          </button>
        </div>

        {showSaved && (
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--ink)' }}>Saved Quotes</div>
            {savedQuotes.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>No saved quotes yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedQuotes.map((q, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>Postcode {q.postcode} · {q.items?.length} item{q.items?.length !== 1 ? 's' : ''}</div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>{new Date(q.created_at).toLocaleString('en-AU')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {q.results?.filter(r => !r.error).map((r, j) => (
                        <div key={j} style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>${r.freightCost?.toFixed(2)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{r.carrier}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
          <div>
            <div className="card" style={{ marginBottom: '0' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '20px' }}>Order Details</div>

              <div className="form-group">
                <label className="form-label">Customer Postcode</label>
                <input className="form-input" type="text" placeholder="e.g. 2000" maxLength={4} value={postcode} onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: '160px' }} />
              </div>

              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '12px', marginTop: '4px' }}>Items</div>

              <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 68px 68px 68px 28px', gap: '6px', marginBottom: '6px' }}>
                {['Qty', 'Description', 'Wt kg', 'L cm', 'W cm', 'H cm', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
                ))}
              </div>

              {items.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 68px 68px 68px 28px', gap: '6px', marginBottom: '6px' }}>
                  <input className="form-input" type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} style={{ padding: '7px 6px', textAlign: 'center', fontSize: '13px' }} />
                  <input className="form-input" type="text" placeholder="Item name" value={item.desc} onChange={e => updateItem(item.id, 'desc', e.target.value)} style={{ padding: '7px 8px', fontSize: '13px' }} />
                  <input className="form-input" type="number" min="0.1" step="0.1" placeholder="0" value={item.weight} onChange={e => updateItem(item.id, 'weight', e.target.value)} style={{ padding: '7px 6px', fontSize: '13px' }} />
                  <input className="form-input" type="number" min="1" placeholder="0" value={item.length} onChange={e => updateItem(item.id, 'length', e.target.value)} style={{ padding: '7px 6px', fontSize: '13px' }} />
                  <input className="form-input" type="number" min="1" placeholder="0" value={item.width} onChange={e => updateItem(item.id, 'width', e.target.value)} style={{ padding: '7px 6px', fontSize: '13px' }} />
                  <input className="form-input" type="number" min="1" placeholder="0" value={item.height} onChange={e => updateItem(item.id, 'height', e.target.value)} style={{ padding: '7px 6px', fontSize: '13px' }} />
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px 0' }}>×</button>
                </div>
              ))}

              <button onClick={addItem} style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontWeight: '500' }}>
                + Add item
              </button>

              {totalActual > 0 && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--ink-muted)' }}>Actual: <strong style={{ color: 'var(--ink)' }}>{totalActual}kg</strong></span>
                    {totalCubic > 0 && <span style={{ color: 'var(--ink-muted)' }}>Cubic: <strong style={{ color: 'var(--ink)' }}>{totalCubic}kg</strong></span>}
                    <span style={{ color: 'var(--ink-muted)' }}>Chargeable: <strong style={{ color: 'var(--accent)' }}>{chargeable}kg</strong>
                      {totalCubic > 0 && <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}> ({totalCubic > totalActual ? 'cubic' : 'actual'})</span>}
                    </span>
                  </div>
                </div>
              )}

              {error && <div className="error-msg" style={{ marginTop: '16px' }}>{error}</div>}

              <button className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '12px' }} onClick={getQuote} disabled={loading}>
                Calculate Freight
              </button>
            </div>
          </div>

          <div>
            {results ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)' }}>Results</div>
                  <button className="btn-secondary" onClick={saveQuote} disabled={saving} style={{ fontSize: '13px' }}>
                    {saving ? 'Saving...' : '+ Save Quote'}
                  </button>
                </div>
                {results.map((result, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    {result.error ? (
                      <div className="card" style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
                        <div style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>{result.carrier || carriers[i]?.name}</div>
                        <div style={{ fontSize: '13px', color: '#ef4444' }}>{result.error}</div>
                      </div>
                    ) : (
                      <div className="card" style={{ borderColor: 'var(--border-mid)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingTop: '4px' }}>
                          <div>
                            <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>{result.carrier}</div>
                            <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>{result.service}</div>
                            <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>{result.origin ? result.origin + ' → ' : ''}{result.destination}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent)', lineHeight: 1 }}>${result.freightCost.toFixed(2)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>excl. GST & fuel levy</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '14px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Zone</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>{result.zone}</div>
                            {result.zoneCode && <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{result.zoneCode}</div>}
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Actual / Cubic</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>{result.totalActualWeight}kg / {result.totalCubicWeight > 0 ? result.totalCubicWeight + 'kg' : '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Chargeable</div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>{result.chargeableWeight}kg</div>
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '12px', color: 'var(--ink-muted)', fontFamily: 'monospace' }}>
                          {result.formula} = <strong style={{ color: 'var(--ink)' }}>${result.freightCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: 'var(--ink-muted)', textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.3 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '6px' }}>No quote yet</div>
                <div style={{ fontSize: '13px' }}>Fill in the order details and click Calculate Freight</div>
              </div>
            )}
          </div>
        </div>

        {!loading && carriers.length === 0 && (
          <div className="empty-state" style={{ marginTop: '32px' }}>
            <h2>No carriers set up</h2>
            <p>Add a carrier with rate cards before generating quotes.</p>
            <a href="/carriers"><button className="empty-cta">Go to Carriers</button></a>
          </div>
        )}
      </main>
    </div>
  )
}
