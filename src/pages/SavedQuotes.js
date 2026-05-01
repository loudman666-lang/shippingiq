import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function SavedQuotes() {
  const { profile, merchant, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { fetchQuotes() }, [merchant])

  async function fetchQuotes() {
    if (!merchant?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }

  async function deleteQuote(id) {
    setDeletingId(id)
    await supabase.from('quotes').delete().eq('id', id)
    setQuotes(quotes.filter(q => q.id !== id))
    setDeletingId(null)
  }

  function loadQuote(q) {
    navigate('/quote', { state: { loadQuote: q } })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  const avatarInitial = profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { href: '/carriers', label: 'Carriers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
    { href: '/rules', label: 'Rules', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { href: '/quote', label: 'Get a Quote', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { href: '/saved-quotes', label: 'Saved Quotes', active: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { href: '/resources', label: 'Resources', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { href: '/convert', label: 'Rate Card Converter', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> },
  ]

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo"><span className="sidebar-logo-dot" />ShippingIQ</div>
        <nav className="sidebar-nav">
          {sidebarLinks.map(l => (
            <a key={l.href} href={l.href} className={'nav-item' + (l.active ? ' active' : '')}>{l.icon}{l.label}</a>
          ))}
          <div className="nav-divider" />
          {isAdmin && <a href="/team" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Team</a>}
          {isAdmin && <a href="/settings" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Settings</a>}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-avatar">{avatarInitial}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.full_name || merchant?.name || 'User'}</div>
            <div className="sidebar-user-role">{profile?.role || 'member'}</div>
          </div>
          <button className="sidebar-signout" onClick={handleSignOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Saved Quotes</h1>
          <p className="page-subtitle">{merchant?.name}</p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>Loading...</div>
        ) : quotes.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--ink)', marginBottom: '8px' }}>No saved quotes yet</div>
            <div style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Calculate a freight quote and save it to see it here.</div>
            <a href="/quote" style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}>Get a Quote →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quotes.map((q) => {
              const cheapest = q.results?.filter(r => !r.error && !r.freeShipping).sort((a, b) => (a.totalCost ?? a.freightCost) - (b.totalCost ?? b.freightCost))[0]
              const free = q.results?.find(r => r.freeShipping)
              const displayResult = free || cheapest
              return (
                <div key={q.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '15px', color: 'var(--ink)', marginBottom: '3px' }}>
                      Postcode {q.postcode} · {q.items?.length} item{q.items?.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      {new Date(q.created_at).toLocaleString('en-AU')}
                      {q.items?.map(i => i.desc).filter(Boolean).join(', ') && (
                        <span style={{ marginLeft: '8px' }}>· {q.items.map(i => i.desc).filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                  </div>
                  {displayResult && (
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: displayResult.freeShipping ? '#16a34a' : 'var(--accent)' }}>
                        {displayResult.freeShipping ? 'FREE' : `$${(displayResult.totalCost ?? displayResult.freightCost)?.toFixed(2)}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>via {displayResult.carrier}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => loadQuote(q)}
                      style={{ fontSize: '13px', padding: '7px 16px', borderRadius: '6px', border: '1px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteQuote(q.id)}
                      disabled={deletingId === q.id}
                      style={{ fontSize: '13px', padding: '7px 16px', borderRadius: '6px', border: '1px solid var(--border-mid)', background: 'var(--surface)', color: 'var(--ink-muted)', cursor: 'pointer' }}
                    >
                      {deletingId === q.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
