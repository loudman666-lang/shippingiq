import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

export default function Settings() {
  const { user, profile, merchant, isAdmin, signOut, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [customerType, setCustomerType] = useState('b2c')
  const [savingCustomerType, setSavingCustomerType] = useState(false)
  const [customerTypeSaved, setCustomerTypeSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [savingName2, setSavingName2] = useState(false)
  const [nameSaved2, setNameSaved2] = useState(false)
  const [nameError2, setNameError2] = useState('')

  useEffect(() => {
    if (profile?.full_name) setDisplayName(profile.full_name)
  }, [profile])

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  async function saveDisplayName() {
    if (!displayName.trim()) { setNameError2('Display name cannot be empty.'); return }
    setNameError2('')
    setSavingName2(true)
    setNameSaved2(false)
    const { error } = await supabase.from('profiles').update({ full_name: displayName.trim() }).eq('id', user.id)
    setSavingName2(false)
    if (error) {
      setNameError2('Something went wrong. Please try again.')
    } else {
      fetchProfile(user.id)
      setNameSaved2(true)
      setTimeout(() => setNameSaved2(false), 3000)
    }
  }

  useEffect(() => {
    if (merchant?.name) setStoreName(merchant.name)
  }, [merchant])

  useEffect(() => {
    if (merchant?.id) loadSettings()
  }, [merchant])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('merchants').select('settings').eq('id', merchant.id).single()
    if (data?.settings?.gstEnabled !== undefined) setGstEnabled(data.settings.gstEnabled)
    if (data?.settings?.customerType) setCustomerType(data.settings.customerType)
    setLoading(false)
  }

  async function saveStoreName() {
    if (!storeName.trim()) { setNameError(true); return }
    setNameError(false)
    setSavingName(true)
    setNameSaved(false)
    await supabase.from('merchants').update({ name: storeName.trim() }).eq('id', merchant.id)
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 3000)
  }

  async function saveCustomerType() {
    setSavingCustomerType(true)
    setCustomerTypeSaved(false)
    await supabase.from('merchants').update({ settings: { gstEnabled, customerType } }).eq('id', merchant.id)
    setSavingCustomerType(false)
    setCustomerTypeSaved(true)
    setTimeout(() => setCustomerTypeSaved(false), 3000)
  }

  async function saveSettings() {
    setSaving(true)
    setSaved(false)
    await supabase.from('merchants').update({ settings: { gstEnabled, customerType } }).eq('id', merchant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
            Rate Card Converter
          </a>
          {isAdmin && (<>
            <div className="nav-divider" />
            <a href="/team" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Team
            </a>
            <a href="/settings" className="nav-item active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          </>)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'}</div>
            <div className="user-info"><div className="user-name">{profile?.full_name || merchant?.name}</div><div className="user-role">{isAdmin ? 'Admin' : 'User'}</div></div>
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
            <h1 className="main-title">Settings</h1>
            <p className="main-subtitle">Configure how ShippingIQ works for your store</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: '520px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Your Profile</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
            Your display name is shown to other team members.
          </div>
          <div className="form-group">
            <label className="form-label">Display name</label>
            <input
              className="form-input"
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setNameError2('') }}
              style={{ maxWidth: '320px' }}
            />
            {nameError2 && <div style={{ marginTop: '6px', fontSize: '13px', color: '#dc2626' }}>{nameError2}</div>}
          </div>
          {nameSaved2 && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              ✓ Display name updated
            </div>
          )}
          <button className="btn-primary" onClick={saveDisplayName} disabled={savingName2} style={{ padding: '10px 24px' }}>
            {savingName2 ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="card" style={{ maxWidth: '520px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Customer Type</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
            Controls how surcharge defaults are set when you add a new carrier.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', border: '2px solid', borderColor: customerType === 'b2c' ? 'var(--accent)' : 'var(--border)', borderRadius: '10px', cursor: 'pointer', background: customerType === 'b2c' ? 'var(--accent-light)' : 'var(--surface)' }} onClick={() => setCustomerType('b2c')}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: customerType === 'b2c' ? 'var(--accent)' : 'var(--border-mid)', background: customerType === 'b2c' ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {customerType === 'b2c' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)', marginBottom: '3px' }}>Residential / Consumer (B2C)</div>
                {customerType === 'b2c' && <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Residential surcharges on new carriers will default to Always.</div>}
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', border: '2px solid', borderColor: customerType === 'b2b' ? 'var(--accent)' : 'var(--border)', borderRadius: '10px', cursor: 'pointer', background: customerType === 'b2b' ? 'var(--accent-light)' : 'var(--surface)' }} onClick={() => setCustomerType('b2b')}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: customerType === 'b2b' ? 'var(--accent)' : 'var(--border-mid)', background: customerType === 'b2b' ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {customerType === 'b2b' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)', marginBottom: '3px' }}>Business (B2B)</div>
                {customerType === 'b2b' && <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Residential surcharges on new carriers will default to Off.</div>}
              </div>
            </label>
          </div>
          {customerTypeSaved && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              ✓ Customer type saved
            </div>
          )}
          <button className="btn-primary" onClick={saveCustomerType} disabled={savingCustomerType} style={{ padding: '10px 24px' }}>
            {savingCustomerType ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="card" style={{ maxWidth: '520px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Store Details</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>
            The store name appears on your Dashboard and in quotes.
          </div>
          <div className="form-group">
            <label className="form-label">Store Name</label>
            <input
              className="form-input"
              type="text"
              value={storeName}
              onChange={e => { setStoreName(e.target.value); setNameError(false) }}
              style={{ maxWidth: '320px' }}
            />
            {nameError && <div style={{ marginTop: '6px', fontSize: '13px', color: '#dc2626' }}>Store name cannot be empty.</div>}
          </div>
          {nameSaved && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              ✓ Store name updated
            </div>
          )}
          <button className="btn-primary" onClick={saveStoreName} disabled={savingName} style={{ padding: '10px 24px' }}>
            {savingName ? 'Saving...' : 'Save'}
          </button>
        </div>

        {loading ? <div className="empty-state"><p>Loading settings...</p></div> : (
          <div className="card" style={{ maxWidth: '520px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>GST Display</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
              Controls how freight prices are shown to your customers at checkout and in quotes.
              Note: This setting applies to the Get a Quote page only. When using WooCommerce, GST is handled by WooCommerce's own tax settings.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', border: '2px solid', borderColor: !gstEnabled ? 'var(--accent)' : 'var(--border)', borderRadius: '10px', cursor: 'pointer', background: !gstEnabled ? 'var(--accent-light)' : 'var(--surface)' }} onClick={() => setGstEnabled(false)}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: !gstEnabled ? 'var(--accent)' : 'var(--border-mid)', background: !gstEnabled ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!gstEnabled && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)', marginBottom: '3px' }}>Ex GST — Business customers</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Prices shown without GST. Example: freight shown as <strong>$19.09</strong></div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px', border: '2px solid', borderColor: gstEnabled ? 'var(--accent)' : 'var(--border)', borderRadius: '10px', cursor: 'pointer', background: gstEnabled ? 'var(--accent-light)' : 'var(--surface)' }} onClick={() => setGstEnabled(true)}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: gstEnabled ? 'var(--accent)' : 'var(--border-mid)', background: gstEnabled ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {gstEnabled && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)', marginBottom: '3px' }}>Inc GST — Consumer customers</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Prices shown with 10% GST included. Example: freight shown as <strong>$21.00</strong></div>
                </div>
              </label>
            </div>

            {saved && (
              <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                ✓ Settings saved
              </div>
            )}

            <button className="btn-primary" onClick={saveSettings} disabled={saving} style={{ padding: '10px 24px' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
