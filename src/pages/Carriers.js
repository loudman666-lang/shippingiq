import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

function RateTable({ carrier }) {
  const data = carrier.parsed_data
  const model = data?.pricingModel

  if (model === 'B' && data?.modelBRates?.length) {
    const services = [...new Set(data.modelBRates.map(r => r.service))]
    const origins = data.originDepots?.length ? data.originDepots : ['Default']
    return (
      <div className="rate-table-wrap">
        {services.map(service => {
          const rows = data.modelBRates.filter(r => r.service === service)
          return (
            <div key={service} style={{ marginBottom: '24px' }}>
              <div className="rate-table-service">{service} — Model B (Basic + Per Kg)</div>
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
    const origins = [...new Set(data.modelCRates.map(r => r.originDepot))]
    return (
      <div className="rate-table-wrap">
        {origins.map(origin => {
          const rows = data.modelCRates.filter(r => r.originDepot === origin)
          return (
            <div key={origin} style={{ marginBottom: '24px' }}>
              <div className="rate-table-service">From: {origin} — Model C (Depot to Depot)</div>
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
        })}
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
      <div className="rate-table-service">Surcharges Detected</div>
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

function getFileType(file) {
  if (!file) return null
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel'
  if (name.endsWith('.pdf')) return 'pdf'
  return 'unknown'
}

export default function Carriers() {
  const { merchant, isAdmin } = useAuth()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [form, setForm] = useState({ name: '', rateCard: null, zoneFile: null, surchargeDoc: null })
  const [parseResult, setParseResult] = useState(null)
  const [error, setError] = useState(null)
  const [viewingCarrier, setViewingCarrier] = useState(null)

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
    setError(null)
    setParseResult(null)
    try {
      const rateCardBase64 = await fileToBase64(form.rateCard)
      const zoneFileBase64 = await fileToBase64(form.zoneFile)

      const payload = {
        carrierName: form.name,
        rateCard: { data: rateCardBase64, type: getFileType(form.rateCard), name: form.rateCard.name },
        zoneFile: { data: zoneFileBase64, type: getFileType(form.zoneFile), name: form.zoneFile.name },
      }

      if (form.surchargeDoc) {
        const surchargeBase64 = await fileToBase64(form.surchargeDoc)
        payload.surchargeDoc = {
          data: surchargeBase64,
          type: getFileType(form.surchargeDoc),
          name: form.surchargeDoc.name
        }
      }

      const { data, error } = await supabase.functions.invoke('rapid-api', { body: payload })
      if (error) throw error
      setParseResult(data)
    } catch (err) {
      console.error(err)
      setError('Could not parse files. Please check your files and try again.')
    } finally {
      setParsing(false)
    }
  }

  async function saveCarrier() {
    if (!parseResult) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('carriers').insert({
        merchant_id: merchant.id,
        name: form.name,
        parsed_data: parseResult,
        status: 'active'
      })
      if (error) throw error
      setShowAdd(false)
      setForm({ name: '', rateCard: null, zoneFile: null, surchargeDoc: null })
      setParseResult(null)
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
            {parseResult && (
              <div className="parse-result">
                <div className="parse-result-title">✓ Files parsed successfully</div>
                <p style={{ marginBottom: '8px', color: '#6b7280' }}>{parseResult.summary}</p>
                <div className="parse-tags">
                  <span className="parse-tag">Model {parseResult.pricingModel || '?'}</span>
                  {parseResult.zones?.slice(0, 6).map(z => <span key={z} className="parse-tag">{z}</span>)}
                  {parseResult.zones?.length > 6 && <span className="parse-tag">+{parseResult.zones.length - 6} more zones</span>}
                  {parseResult.serviceTypes?.map(s => <span key={s} className="parse-tag">{s}</span>)}
                  <span className="parse-tag">{parseResult.rateCount} rates</span>
                  {parseResult.surcharges?.length > 0 && <span className="parse-tag">{parseResult.surcharges.length} surcharges</span>}
                </div>
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
              <button className="btn-secondary" onClick={() => { setShowAdd(false); setParseResult(null); setError(null) }}>Cancel</button>
              {!parseResult ? (
                <button className="btn-primary" onClick={parseFiles} disabled={parsing}>{parsing ? 'Parsing files...' : 'Parse Files'}</button>
              ) : (
                <button className="btn-primary" onClick={saveCarrier} disabled={saving}>{saving ? 'Saving...' : 'Save Carrier'}</button>
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
            {viewingCarrier.parsed_data?.pricingModel && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Pricing model: <strong>Model {viewingCarrier.parsed_data.pricingModel}</strong></p>
            )}
            <RateTable carrier={viewingCarrier} />
            <SurchargeTable surcharges={viewingCarrier.parsed_data?.surcharges} />
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
                <div className="carrier-info">
                  <div className="carrier-name">{carrier.name}</div>
                  <div className="carrier-meta">
                    {carrier.parsed_data?.rateCount} rates · {carrier.parsed_data?.zones?.length} zones · {carrier.parsed_data?.serviceTypes?.join(', ')}
                    {carrier.parsed_data?.pricingModel && ` · Model ${carrier.parsed_data.pricingModel}`}
                    {carrier.parsed_data?.surcharges?.length > 0 && ` · ${carrier.parsed_data.surcharges.length} surcharges`}
                  </div>
                  <div className="carrier-summary">{carrier.parsed_data?.summary}</div>
                </div>
                <div className="carrier-actions">
                  <span className={"carrier-status " + carrier.status}>{carrier.status}</span>
                  <button className="btn-secondary" onClick={() => setViewingCarrier(viewingCarrier?.id === carrier.id ? null : carrier)}>
                    {viewingCarrier?.id === carrier.id ? 'Hide Rates' : 'View Rates'}
                  </button>
                  <button className="btn-danger" onClick={() => deleteCarrier(carrier.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
