import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

export default function Dashboard() {
  const { profile, merchant, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [carriers, setCarriers] = useState([])
  const [loadingCarriers, setLoadingCarriers] = useState(true)

  useEffect(() => {
    if (merchant?.id) fetchCarriers()
  }, [merchant])

  async function fetchCarriers() {
    const { data } = await supabase
      .from('carriers')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
    setCarriers(data || [])
    setLoadingCarriers(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

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
            <div className="user-avatar">
              {profile?.full_name?.charAt(0) || '?'}
            </div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name}</div>
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
        <div className="main-header">
          <div>
            <h1 className="main-title">Dashboard</h1>
            <p className="main-subtitle">{merchant?.name}</p>
          </div>
        </div>

        {loadingCarriers ? null : carriers.length === 0 ? (
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
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-number">{carriers.length}</div>
                <div className="summary-label">Active Carrier{carriers.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">
                  {carriers.reduce((sum, c) => sum + (c.parsed_data?.rateCount || 0), 0)}
                </div>
                <div className="summary-label">Total Rates</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">
                  {[...new Set(carriers.flatMap(c => c.parsed_data?.zones || []))].length}
                </div>
                <div className="summary-label">Zones Covered</div>
              </div>
            </div>

            <h2 className="section-title">Your Carriers</h2>
            <div className="carriers-list">
              {carriers.map(carrier => (
                <div key={carrier.id} className="carrier-card">
                  <div className="carrier-info">
                    <div className="carrier-name">{carrier.name}</div>
                    <div className="carrier-meta">
                      {carrier.parsed_data?.rateCount} rates · {carrier.parsed_data?.zones?.length} zones · {carrier.parsed_data?.serviceTypes?.join(', ')}
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
      </main>
    </div>
  )
}
