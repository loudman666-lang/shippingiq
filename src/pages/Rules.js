import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Carriers.css'

export default function Rules() {
  const { profile, merchant, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [carriers, setCarriers] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState({
    freeShippingEnabled: false,
    freeShippingThreshold: '',
    freeShippingMode: 'smart',
    freightMarginType: 'none',
    freightMarginValue: '',
    carrierPriority: [],
  })

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  useEffect(() => { if (merchant?.id) loadRules() }, [merchant])

  async function loadRules() {
    setLoading(true)
    const [merchantRes, carriersRes] = await Promise.all([
      supabase.from('merchants').select('rules').eq('id', merchant.id).single(),
      supabase.from('carriers').select('id, name').eq('merchant_id', merchant.id).eq('status', 'active')
    ])
    const savedRules = merchantRes.data?.rules || {}
    const carrierList = carriersRes.data || []
    setCarriers(carrierList)
    setRules({
      freeShippingEnabled: savedRules.freeShippingEnabled || false,
      freeShippingThreshold: savedRules.freeShippingThreshold || '',
      freeShippingMode: savedRules.freeShippingMode || 'smart',
      freightMarginType: savedRules.freightMarginType || 'none',
      freightMarginValue: savedRules.freightMarginValue || '',
      carrierPriority: (() => {
        const saved = savedRules.carrierPriority || []
        const allIds = carrierList.map(c => c.id)
        // Keep saved order, drop deleted carriers, append new carriers at bottom
        return [
          ...saved.filter(id => allIds.includes(id)),
          ...allIds.filter(id => !saved.includes(id)),
        ]
      })(),
    })
    setLoading(false)
  }

  async function saveRules() {
    setSaving(true)
    setSaved(false)
    await supabase.from('merchants').update({ rules }).eq('id', merchant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function moveCarrier(index, direction) {
    setRules(prev => {
      const newOrder = [...prev.carrierPriority]
      const swapIndex = index + direction
      if (swapIndex < 0 || swapIndex >= newOrder.length) return prev
      ;[newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]]
      return { ...prev, carrierPriority: newOrder }
    })
  }

  function carrierName(id) {
    return carriers.find(c => c.id === id)?.name || id
  }

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { href: '/carriers', label: 'Carriers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
    { href: '/rules', label: 'Rules', active: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { href: '/quote', label: 'Get a Quote', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
    { href: '/saved-quotes', label: 'Saved Quotes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { href: '/resources', label: 'Resources', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
    { href: '/convert', label: 'Rate Card Converter', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg> },
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
            <h1 className="main-title">Rules</h1>
            <p className="main-subtitle">Configure how freight is calculated and displayed at checkout</p>
          </div>
        </div>

        {loading ? <div className="empty-state"><p>Loading rules...</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>

            <div className="card">
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Free Shipping</div>
              <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Offer free shipping when an order total exceeds a set amount.</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <button
                  onClick={() => setRules({ ...rules, freeShippingEnabled: !rules.freeShippingEnabled })}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', background: rules.freeShippingEnabled ? 'var(--accent)' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: rules.freeShippingEnabled ? '23px' : '3px', transition: 'left 0.2s' }} />
                </button>
                <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: '500' }}>
                  {rules.freeShippingEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {rules.freeShippingEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>Free shipping on orders over</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--ink-muted)' }}>$</span>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="150"
                        value={rules.freeShippingThreshold}
                        onChange={e => setRules({ ...rules, freeShippingThreshold: e.target.value })}
                        style={{ paddingLeft: '24px', width: '120px' }}
                      />
                    </div>
                    <label style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>AUD</label>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: 0 }}>
                    To exempt specific products from free shipping, tag them with <code style={{ fontSize: '12px', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border)' }}>shippingiq-exempt</code> in WooCommerce. Any order containing an exempt item will always be charged freight, regardless of order value.
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
                    Tip: use this for bulky or heavy items where freight costs exceed the benefit of free shipping.
                  </p>
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>When surcharges apply</div>
                    {[
                      { value: 'smart', label: 'Smart mode', desc: 'If a surcharge triggers (e.g. overlength, tail lift), free shipping is voided and normal freight + surcharges apply.' },
                      { value: 'true', label: 'Always free', desc: 'Free shipping always means $0, even if surcharges would normally apply. Surcharges are ignored.' },
                    ].map(opt => (
                      <label key={opt.value} onClick={() => setRules({ ...rules, freeShippingMode: opt.value })}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', border: '2px solid', borderColor: rules.freeShippingMode === opt.value ? 'var(--accent)' : 'var(--border)', borderRadius: '8px', cursor: 'pointer', background: rules.freeShippingMode === opt.value ? 'var(--accent-light)' : 'var(--surface)' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid', borderColor: rules.freeShippingMode === opt.value ? 'var(--accent)' : 'var(--border-mid)', background: rules.freeShippingMode === opt.value ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {rules.freeShippingMode === opt.value && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'white' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>{opt.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Freight Margin</div>
              <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Optionally add a margin on top of the carrier rate to cover handling costs.</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {[
                  { value: 'none', label: 'Pass through at cost', desc: 'Charge customers exactly what the carrier charges you' },
                  { value: 'percent', label: 'Add a percentage', desc: 'e.g. add 10% on top of the freight rate' },
                  { value: 'flat', label: 'Add a flat amount', desc: 'e.g. add $5.00 to every shipment' },
                ].map(opt => (
                  <label key={opt.value} onClick={() => setRules({ ...rules, freightMarginType: opt.value })}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px', border: '2px solid', borderColor: rules.freightMarginType === opt.value ? 'var(--accent)' : 'var(--border)', borderRadius: '10px', cursor: 'pointer', background: rules.freightMarginType === opt.value ? 'var(--accent-light)' : 'var(--surface)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid', borderColor: rules.freightMarginType === opt.value ? 'var(--accent)' : 'var(--border-mid)', background: rules.freightMarginType === opt.value ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {rules.freightMarginType === opt.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ink)', marginBottom: '2px' }}>{opt.label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {rules.freightMarginType === 'percent' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Add</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type="number" min="0" step="0.5" placeholder="10" value={rules.freightMarginValue} onChange={e => setRules({ ...rules, freightMarginValue: e.target.value })} style={{ width: '100px', paddingRight: '28px' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--ink-muted)' }}>%</span>
                  </div>
                  <label style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>to every freight rate</label>
                </div>
              )}

              {rules.freightMarginType === 'flat' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>Add</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--ink-muted)' }}>$</span>
                    <input className="form-input" type="number" min="0" step="0.50" placeholder="5.00" value={rules.freightMarginValue} onChange={e => setRules({ ...rules, freightMarginValue: e.target.value })} style={{ width: '100px', paddingLeft: '24px' }} />
                  </div>
                  <label style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>to every shipment</label>
                </div>
              )}
            </div>

            {carriers.length > 1 && (
              <div className="card">
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Carrier Priority</div>
                <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Set the order carriers appear at checkout. Use the arrows to reorder — top carrier is shown first.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rules.carrierPriority.map((id, index) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: index === 0 ? 'var(--accent)' : 'var(--border)', color: index === 0 ? 'white' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{index + 1}</div>
                      <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'var(--ink)' }}>{carrierName(id)}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => moveCarrier(index, -1)} disabled={index === 0} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? 'var(--border)' : 'var(--ink-mid)', fontSize: '12px' }}>↑</button>
                        <button onClick={() => moveCarrier(index, 1)} disabled={index === rules.carrierPriority.length - 1} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: index === rules.carrierPriority.length - 1 ? 'not-allowed' : 'pointer', color: index === rules.carrierPriority.length - 1 ? 'var(--border)' : 'var(--ink-mid)', fontSize: '12px' }}>↓</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {saved && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                ✓ Rules saved
              </div>
            )}

            <button className="btn-primary" onClick={saveRules} disabled={saving} style={{ padding: '12px 32px', alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
