import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Dashboard.css'

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    description: 'One carrier. Prove it works before you commit.',
    features: [
      '1 carrier',
      'WooCommerce plugin',
      'Full quote tool',
      'Saved quotes',
      'Freight rules engine',
      'Surcharge management',
    ],
    cta: 'Current plan',
    priceId: null,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 29,
    description: 'Unlimited carriers. Your rates. Live at checkout.',
    features: [
      'Unlimited carriers',
      'WooCommerce plugin',
      'Full quote tool',
      'Saved quotes',
      'Freight rules engine',
      'Surcharge management',
      'Rate Card Converter (PDF → CSV)',
      'Team members',
      'Priority email support',
    ],
    cta: 'Start free trial',
    priceId: process.env.REACT_APP_STRIPE_PRICE_PRO,
    popular: true,
  },
]

const TIER_ORDER = ['free', 'pro']

export default function Pricing() {
  const { profile, merchant, isAdmin, signOut, planTier } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  async function handleUpgrade(plan) {
    if (!plan.priceId) return
    setLoading(plan.tier)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ priceId: plan.priceId, tier: plan.tier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  async function handleManageBilling() {
    setLoading('portal')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const subscription = merchant?.subscription
  const trialEndsAt = subscription?.trial_ends_at
  const status = subscription?.status
  const avatarInitial = profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
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
          {isAdmin && (
            <>
              <div className="nav-divider" />
              <a href="/team" className="nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Team
              </a>
              <a href="/pricing" className="nav-item active">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Billing
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
              <h1 className="main-title">Billing</h1>
              <p className="main-subtitle">Manage your subscription</p>
            </div>
            {planTier !== 'free' && (
              <button
                onClick={handleManageBilling}
                disabled={loading === 'portal'}
                style={{ padding: '9px 18px', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
              >
                {loading === 'portal' ? 'Loading…' : 'Manage billing'}
              </button>
            )}
          </div>

          {status === 'past_due' && (
            <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
              ⚠ Your payment is past due. Please update your payment method to keep your subscription active.
            </div>
          )}

          {trialEndsAt && status === 'trialing' && (
            <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1e40af' }}>
              Your trial ends on {new Date(trialEndsAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Add a payment method to continue after the trial.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '720px', margin: '0 auto' }}>
            {PLANS.map(plan => {
              const isCurrent = planTier === plan.tier
              const isDowngrade = TIER_ORDER.indexOf(plan.tier) < TIER_ORDER.indexOf(planTier)
              return (
                <div key={plan.tier} style={{
                  background: 'var(--surface)',
                  border: plan.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {plan.popular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', fontSize: '11px', fontWeight: '600', padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      Most popular
                    </div>
                  )}
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{plan.name}</div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '700', color: 'var(--ink)' }}>${plan.price}</span>
                    {plan.price > 0 && <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>/mo AUD</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '24px', lineHeight: '1.5' }}>{plan.description}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--ink-mid)', padding: '5px 0', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button disabled style={{ fontSize: '13px', padding: '11px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink-muted)', cursor: 'default', width: '100%', marginTop: 'auto' }}>
                      Current plan
                    </button>
                  ) : isDowngrade ? (
                    <button disabled style={{ fontSize: '13px', padding: '11px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--ink-muted)', cursor: 'default', width: '100%', marginTop: 'auto' }}>
                      Contact us to downgrade
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={!!loading}
                      style={{ fontSize: '13px', padding: '11px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', width: '100%', fontWeight: '500', marginTop: 'auto' }}
                    >
                      {loading === plan.tier ? 'Loading...' : plan.cta}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="pricing-footnote">All prices in AUD · 14-day free trial on Pro · No credit card required · Cancel anytime</p>
        </div>
      </main>
    </div>
  )
}
