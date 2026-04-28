import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

const ACCORDION = [
  {
    key: 'rateCard',
    title: 'Rate Card',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          Your rate card shows freight prices by weight and zone. Ask your carrier account manager for: a CSV or Excel export of your contracted rates, including all weight breaks and zones. If they send a PDF, ShippingIQ can read that too.
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          <strong style={{ color: 'var(--ink)', fontWeight: '600' }}>Key things to confirm:</strong> which pricing model applies (flat rate per zone, or base + per kg), which origin depot your freight leaves from, and whether fuel levy is included or separate.
        </p>
      </div>
    ),
  },
  {
    key: 'zoneFile',
    title: 'Zone File (Postcode Mapping)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          A zone file maps each postcode to a freight zone. This is required — without it ShippingIQ cannot calculate quotes. Ask your carrier for: a postcode-to-zone mapping file in CSV or Excel format.
        </p>
        <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, lineHeight: '1.6' }}>
            <strong>Use this exact wording with your account manager:</strong><br/>
            <em>"Can you send me a postcode-to-zone mapping file for my account? CSV or Excel is fine."</em>
          </p>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          Some carriers don't publish this file publicly — you may need to specifically request it from your account manager or freight operations team.
        </p>
      </div>
    ),
  },
  {
    key: 'surcharge',
    title: 'Surcharge Schedule',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          Surcharges are optional but recommended. Common surcharges include fuel levy, tail lift, residential delivery, and overlength fees.
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          Ask your carrier for: a surcharge schedule or ancillary charges document. ShippingIQ will extract the surcharges automatically and let you configure when each one applies.
        </p>
      </div>
    ),
  },
]

const STEPS = [
  {
    num: 1,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/>
        <line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    ),
    title: 'Upload Your Carrier Files',
    body: 'Upload your rate card, zone file, and optional surcharge document. ShippingIQ reads CSV, Excel, and PDF — any format your carrier provides.',
  },
  {
    num: 2,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"/>
        <line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/>
        <line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/>
        <line x1="9" y1="8" x2="15" y2="8"/>
        <line x1="17" y1="16" x2="23" y2="16"/>
      </svg>
    ),
    title: 'Configure Your Rules',
    body: 'Set your freight margin, free shipping threshold, surcharge triggers, and carrier priority. Takes two minutes. Change anytime.',
  },
  {
    num: 3,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: 'Accurate Rates at Checkout',
    body: 'Install the WooCommerce plugin, enter your Merchant ID, and your customers see real carrier rates — calculated from your own contracted prices.',
  },
]

const TEMPLATES = [
  {
    title: 'Rate Card Template',
    desc: "Your carrier's freight rates by weight and zone",
    file: '/templates/rate-card-template.csv',
    filename: 'rate-card-template.csv',
  },
  {
    title: 'Zone File Template',
    desc: "Postcode-to-zone mapping for your carrier's network",
    file: '/templates/zone-file-template.csv',
    filename: 'zone-file-template.csv',
  },
  {
    title: 'Surcharge Template',
    desc: 'Optional: fuel levies, overlength and residential fees',
    file: '/templates/surcharge-template.csv',
    filename: 'surcharge-template.csv',
  },
]

export default function Resources() {
  const { profile, merchant, isAdmin } = useAuth()
  const [open, setOpen] = useState({})

  const toggle = key => setOpen(prev => ({ ...prev, [key]: !prev[key] }))
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
          <a href="/resources" className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Resources
          </a>
          {isAdmin && (<>
            <div className="nav-divider" />
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
        </div>
      </aside>

      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="main-title">Resources</h1>
            <p className="main-subtitle">Templates, guides, and everything you need to get set up.</p>
          </div>
        </div>

        {/* Template Files */}
        <section style={{ marginBottom: '52px', maxWidth: '760px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', fontWeight: '400', color: 'var(--ink)', marginBottom: '6px' }}>
            Template Files
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
            Download these templates, fill in your carrier's rates and zones, then upload to ShippingIQ.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            {TEMPLATES.map(t => (
              <div key={t.file} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.5' }}>{t.desc}</div>
                </div>
                <a href={t.file} download={t.filename} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: '7px', fontSize: '13px', fontWeight: '500', color: 'var(--ink)', textDecoration: 'none', alignSelf: 'flex-start' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Getting Your Carrier Files */}
        <section style={{ marginBottom: '52px', maxWidth: '680px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', fontWeight: '400', color: 'var(--ink)', marginBottom: '6px' }}>
            Getting Your Carrier Files
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
            Most carriers can provide rate cards and zone files on request. Here's how.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ACCORDION.map(item => (
              <div key={item.key} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(item.key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: 'var(--ink)' }}>{item.title}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open[item.key] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {open[item.key] && (
                  <div style={{ padding: '0 20px 20px 70px' }}>
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How ShippingIQ Works */}
        <section style={{ maxWidth: '760px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', fontWeight: '400', color: 'var(--ink)', marginBottom: '6px' }}>
            How ShippingIQ Works
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '28px' }}>
            Three steps from carrier files to live checkout rates.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {STEPS.map(step => (
              <div key={step.num} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {step.num}
                  </div>
                  <div style={{ color: 'var(--accent)' }}>{step.icon}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '8px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.65' }}>{step.body}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', borderLeft: '3px solid var(--accent)' }}>
            <p style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.65', margin: 0 }}>
              ShippingIQ never stores pre-loaded carrier data. Every rate is calculated from the files you upload — so your customers always see your actual contracted prices, not industry averages.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
