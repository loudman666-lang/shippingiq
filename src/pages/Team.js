import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Team.css'

const TEAM_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export default function Team() {
  const { user, profile, merchant, isAdmin, teamMembers, fetchTeamMembers, signOut } = useAuth()
  const navigate = useNavigate()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [removingId, setRemovingId] = useState(null)
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    if (isAdmin === false) navigate('/dashboard')
  }, [isAdmin])

  useEffect(() => {
    if (merchant?.id) fetchTeamMembers(merchant.id)
  }, [merchant])

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  async function handleRemove(member) {
    const name = member.full_name || 'this member'
    if (!window.confirm(`Remove ${name} from your team? This cannot be undone.`)) return
    setRemoveError('')
    setRemovingId(member.id)
    try {
      const { error } = await supabase.functions.invoke('remove-team-member', {
        body: { userId: member.id, merchantId: merchant.id },
      })
      if (error) throw error
      fetchTeamMembers(merchant.id)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('last admin')) {
        setRemoveError('Cannot remove the last admin.')
      } else {
        setRemoveError('Something went wrong. Please try again.')
      }
    }
    setRemovingId(null)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviting(true)
    try {
      const { error } = await supabase.functions.invoke('invite-team-member', {
        body: { email: inviteEmail.trim(), merchantId: merchant.id, role: 'member' },
      })
      if (error) throw error
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      fetchTeamMembers(merchant.id)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already been registered') || msg.includes('email_exists')) {
        setInviteError('This email is already registered. Ask them to sign in directly.')
      } else {
        setInviteError('Something went wrong. Please try again.')
      }
    }
    setInviting(false)
  }

  const avatarInitial = profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'

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
          <a href="/saved-quotes" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Saved Quotes</a>
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
            <a href="/team" className="nav-item active">
              {TEAM_SVG}
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
              <h1 className="main-title">Team</h1>
              <p className="main-subtitle">Manage who has access to your ShippingIQ account</p>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '640px', marginBottom: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Team members</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              Everyone with access to this merchant account.
            </div>
            {teamMembers.length === 0 ? (
              <div style={{ fontSize: '14px', color: 'var(--ink-muted)', padding: '16px 0' }}>No team members yet.</div>
            ) : (
              <div className="team-list">
                {teamMembers.map(member => (
                  <div key={member.id} className="team-member-row">
                    <div className="team-avatar">{member.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div className="team-member-info">
                      <div className="team-member-name">
                      {member.full_name || 'Invited user'}
                      {member.id === user?.id && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--ink-muted)', fontWeight: '400' }}>(You)</span>}
                    </div>
                      <div className="team-member-since">
                        Joined {new Date(member.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className={`team-role-badge team-role-${member.role}`}>{member.role}</span>
                    {isAdmin && member.id !== user?.id && (
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.id}
                        style={{ marginLeft: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '500', color: '#dc2626', background: 'transparent', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, opacity: removingId === member.id ? 0.5 : 1 }}
                      >
                        {removingId === member.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {removeError && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
                {removeError}
              </div>
            )}
          </div>

          <div className="card" style={{ maxWidth: '640px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Invite a team member</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
              They'll receive an email with a link to set up their account.
            </div>
            <form onSubmit={handleInvite}>
              <div className="team-invite-row">
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@yourstore.com"
                    required
                  />
                </div>
              </div>
              {inviteError && (
                <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div style={{ marginTop: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                  ✓ {inviteSuccess}
                </div>
              )}
              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-primary" disabled={inviting} style={{ padding: '10px 24px' }}>
                  {inviting ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
