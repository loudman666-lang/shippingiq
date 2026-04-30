import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

function cheapestRateLabel(results) {
  if (!results?.length) return null
  if (results.some(r => r.freeShipping)) {
    const freeResult = results.find(r => r.freeShipping)
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>FREE</div>
        {freeResult?.carrier && <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '1px' }}>via {freeResult.carrier}</div>}
      </div>
    )
  }
  const paid = results.filter(r => !r.error && (r.totalCost != null || r.freightCost != null))
  if (!paid.length) return <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>—</span>
  const cheapest = paid.reduce((best, r) => (r.totalCost || r.freightCost || 0) < (best.totalCost || best.freightCost || 0) ? r : best)
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)' }}>${(cheapest.totalCost || cheapest.freightCost || 0).toFixed(2)}</div>
      {cheapest.carrier && <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '1px' }}>via {cheapest.carrier}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { profile, merchant, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [carriers, setCarriers] = useState([])
  const [quoteCount, setQuoteCount] = useState(0)
  const [recentQuotes, setRecentQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (merchant?.id) fetchData()
  }, [merchant])

  async function fetchData() {
    const [carriersRes, countRes, quotesRes] = await Promise.all([
      supabase.from('carriers').select('*').eq('merchant_id', merchant.id).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id),
      supabase.from('quotes').select('postcode, items, results, created_at').eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(5),
    ])
    setCarriers(carriersRes.data || [])
    setQuoteCount(countRes.count || 0)
    setRecentQuotes(quotesRes.data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  const [nameBannerDismissed, setNameBannerDismissed] = useState(false)

  const carriersNeedingPostcode = carriers.filter(c => !c.parsed_data?.postcodeMap?.length)
  const avatarInitial = profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-dot" />
          ShippingIQ
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item active">
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
          <a href="/quote" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Get a Quote
          </a>
          <a href="/resources" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Resources
          </a>
          <a href="/convert" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>
            Convert PDF
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
            <div className="user-avatar">{avatarInitial}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name || merchant?.name}</div>
              <div className="user-role">{isAdmin ? 'Admin' : 'User'}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
        <div className="main-header">
          <div>
            <h1 className="main-title">Dashboard</h1>
            <p className="main-subtitle">{merchant?.name}</p>
          </div>
        </div>

        {profile && !profile.full_name && !nameBannerDismissed && (
          <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <span>⚠ Welcome! Add your display name in <a href="/settings" style={{ color: '#92400e', fontWeight: '600', textDecoration: 'underline' }}>Settings</a> so your team can identify you.</span>
            <button onClick={() => setNameBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '16px', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>✕</button>
          </div>
        )}

        {loading ? null : carriers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <h2>Set up your first carrier</h2>
            <p>Upload your rate card and zone file to start getting accurate freight quotes at checkout.</p>
            <a href="/carriers" className="empty-cta">Add a carrier</a>
          </div>
        ) : (
          <div className="dashboard-summary">

            {carriersNeedingPostcode.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <span>⚠ {carriersNeedingPostcode.length} carrier{carriersNeedingPostcode.length !== 1 ? 's have' : ' has'} no postcode data — quotes will fail: <strong>{carriersNeedingPostcode.map(c => c.name).join(', ')}</strong></span>
                <a href="/carriers" style={{ color: '#92400e', fontWeight: '600', textDecoration: 'underline', whiteSpace: 'nowrap', flexShrink: 0 }}>Go to Carriers →</a>
              </div>
            )}

            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-number">{carriers.length}</div>
                <div className="summary-label">Active Carrier{carriers.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">
                  {carriers.reduce((sum, c) => sum + (c.parsed_data?.modelBRates?.length || c.parsed_data?.rateCount || 0), 0)}
                </div>
                <div className="summary-label">Total Rates</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">
                  {[...new Set(carriers.flatMap(c => c.parsed_data?.zones || []))].length}
                </div>
                <div className="summary-label">Zones Covered</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{quoteCount}</div>
                <div className="summary-label">Quotes Generated</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
              <a href="/carriers" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 18px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>Add Carrier</a>
              <a href="/quote" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 18px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>Get a Quote</a>
              <a href="/rules" style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 18px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>View Rules</a>
            </div>

            {recentQuotes.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h2 className="section-title">Recent Quotes</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentQuotes.map((q, i) => {
                    const itemCount = q.items?.length || 0
                    return (
                      <a key={i} href="/quote" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', textDecoration: 'none', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '2px' }}>Postcode {q.postcode}</div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                            {itemCount} item{itemCount !== 1 ? 's' : ''} · {new Date(q.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        {cheapestRateLabel(q.results)}
                      </a>
                    )
                  })}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <a href="/quote?savedQuotes=open" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}>View all saved quotes →</a>
                </div>
              </div>
            )}

            <h2 className="section-title">Your Carriers</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {carriers.map(carrier => (
                <div key={carrier.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '2px' }}>{carrier.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      {carrier.parsed_data?.modelBRates?.length || carrier.parsed_data?.rateCount || 0} rates · {carrier.parsed_data?.zones?.length || 0} zones{carrier.parsed_data?.serviceTypes?.length ? ' · ' + carrier.parsed_data.serviceTypes.join(', ') : ''}
                    </div>
                  </div>
                  <span className="carrier-status active">active</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px' }}>
              <a href="/carriers" className="empty-cta">Manage Carriers</a>
            </div>

          </div>
        )}
        </div>
      </main>
    </div>
  )
}
