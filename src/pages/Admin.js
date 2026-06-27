import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL

export default function Admin() {
  const { user, profile, merchant, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState('')

  // Guard: only loudman666@gmail.com may access this page.
  useEffect(() => {
    if (user && user.email !== 'loudman666@gmail.com') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (user?.email === 'loudman666@gmail.com') fetchMerchants()
  }, [user])

  async function fetchMerchants() {
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) { setError('Not authenticated.'); setLoading(false); return }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-merchants`, {
      headers: { 'Authorization': `Bearer ${jwt}` },
    })
    const body = await res.json()
    if (!res.ok) { setError(body.error || 'Failed to load merchants.'); setLoading(false); return }
    setMerchants(body.merchants || [])
    setLoading(false)
  }

  async function handleDeactivate(m) {
    if (!window.confirm(`Deactivate ${m.email || m.name}? Their subscription status will be set to inactive.`)) return
    setActionError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-merchants`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate', merchant_id: m.id }),
    })
    const body = await res.json()
    if (!res.ok) { setActionError(body.error || 'Deactivate failed.'); return }
    fetchMerchants()
  }

  async function handleDelete(m) {
    if (!window.confirm(`Permanently delete ${m.email || m.name}?\n\nThis will delete their merchant record, all carriers, quotes, and profiles. This cannot be undone.`)) return
    setActionError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-merchants`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', merchant_id: m.id }),
    })
    const body = await res.json()
    if (!res.ok) { setActionError(body.error || 'Delete failed.'); return }
    fetchMerchants()
  }

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  const filtered = merchants.filter(m =>
    !search || m.email?.toLowerCase().includes(search.toLowerCase()) || m.name?.toLowerCase().includes(search.toLowerCase())
  )

  const isSuperAdmin = user?.email === 'loudman666@gmail.com'

  if (!isSuperAdmin) return null

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
          <a href="/quote" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Get a Quote
          </a>
          <a href="/saved-quotes" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            Saved Quotes
          </a>
          <a href="/resources" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Resources
          </a>
          <a href="/convert" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>
            Rate Card Converter
          </a>
          {isAdmin && (<>
            <div className="nav-divider" />
            <a href="/team" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Team
            </a>
            <a href="/pricing" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Billing
            </a>
            <a href="/settings" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          </>)}
          {isSuperAdmin && (<>
            <div className="nav-divider" />
            <a href="/admin/merchants" className="nav-item active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Merchants
            </a>
          </>)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'}</div>
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
              <h1 className="main-title">Merchants</h1>
              <p className="main-subtitle">All ShippingIQ merchant accounts</p>
            </div>
            <button className="btn-primary" onClick={fetchMerchants} style={{ padding: '10px 20px' }}>
              Refresh
            </button>
          </div>

          {actionError && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
              {actionError}
            </div>
          )}

          {/* Summary card */}
          <div className="card" style={{ maxWidth: '200px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent)' }}>{merchants.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginTop: '4px' }}>Total Merchants</div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input
              className="form-input"
              type="text"
              placeholder="Search by email or store name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '360px' }}
            />
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading merchants...</p></div>
          ) : error ? (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No merchants found.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Store</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Merchant ID</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Plan</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Signed Up</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--ink-muted)' }}>Carriers</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--ink-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => {
                    const status = m.subscription?.status ?? m.plan ?? '—'
                    const tier = m.subscription?.tier ?? m.plan ?? '—'
                    const isInactive = status === 'inactive' || status === 'canceled'
                    return (
                      <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', opacity: isInactive ? 0.5 : 1 }}>
                        <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>{m.email || <span style={{ color: 'var(--ink-muted)' }}>—</span>}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--ink)' }}>{m.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'monospace' }}>{m.id.slice(0, 8)}…</code>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px',
                            background: tier === 'pro' ? '#eff6ff' : '#f9fafb',
                            color: tier === 'pro' ? '#1d4ed8' : 'var(--ink-muted)',
                            border: '1px solid',
                            borderColor: tier === 'pro' ? '#bfdbfe' : 'var(--border)',
                          }}>
                            {tier}
                          </span>
                          {isInactive && (
                            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>inactive</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--ink-muted)' }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--ink)' }}>{m.carrier_count}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleDeactivate(m)}
                              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Deactivate
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
