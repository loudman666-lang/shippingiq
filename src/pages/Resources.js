import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
          Your rate card shows freight prices by weight and zone. Ask your carrier account manager for a CSV or Excel export — this gives the most accurate results in ShippingIQ.
        </p>
        <div style={{ padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
          <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, lineHeight: '1.6' }}>
            <strong>Use this exact wording with your account manager:</strong><br/>
            <em>"Can you send me a CSV or Excel export of my contracted freight rates? I need all weight breaks and zones included."</em>
          </p>
        </div>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          If your carrier only provides a PDF, use the <Link to="/convert" style={{ color: 'var(--color-text-info)', textDecoration: 'none', fontWeight: '500' }}>Rate Card Converter (Pro feature)</Link> to extract your rates automatically. Always use the original PDF from your carrier — emailed directly or exported digitally. Scanned or photographed rate cards may produce errors.
        </p>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0, borderLeft: '3px solid var(--color-border-warning)', paddingLeft: '10px' }}>
          AI conversion is not 100% accurate. Always verify destination names and rate values against your original PDF before uploading to ShippingIQ. Minor errors are possible, particularly in scanned documents or PDFs with complex formatting.
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
          Ask your carrier for a surcharge schedule or ancillary charges document. CSV or Excel files work best — PDF is also accepted. Always use the original document direct from your carrier, not a photocopy or scanned copy, as these can affect how accurately ShippingIQ reads the data.
        </p>
      </div>
    ),
  },
  {
    key: 'woocommerce',
    title: 'WooCommerce Plugin — Installation Guide',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8"/>
        <path d="M12 17v4"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-mid)', margin: 0 }}>
          The ShippingIQ WooCommerce plugin calculates live freight costs at checkout, calculated from your uploaded carrier rate cards. Installation takes about 10 minutes.
        </p>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>Step 1 — Download the plugin</div>
          <p style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.65', margin: '0 0 8px' }}>
            Install directly from WordPress.org, or download the zip file manually.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <a href="https://wordpress.org/plugins/shippingiq-freight-rates-for-woocommerce" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--accent)', color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>
              Install from WordPress.org →
            </a>
            <a href="https://github.com/loudman666-lang/shippingiq/raw/main/woocommerce-plugin/shippingiq.zip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-mid)', borderRadius: '7px', fontSize: '13px', fontWeight: '500', color: 'var(--ink)', textDecoration: 'none' }}>
              Download shippingiq.zip
            </a>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>Step 2 — Install in WordPress</div>
          <ol style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.8', margin: 0, paddingLeft: '18px' }}>
            <li>Log in to your WordPress admin panel</li>
            <li>Go to <strong>Plugins → Add New → Upload Plugin</strong></li>
            <li>Choose the <code>shippingiq.zip</code> file you downloaded</li>
            <li>Click <strong>Install Now</strong>, then <strong>Activate Plugin</strong></li>
          </ol>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>Step 3 — Add to a shipping zone</div>
          <ol style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.8', margin: 0, paddingLeft: '18px' }}>
            <li>Go to <strong>WooCommerce → Settings → Shipping</strong></li>
            <li>Click on your shipping zone (or create one for Australia)</li>
            <li>Click <strong>Add shipping method</strong> and select <strong>ShippingIQ</strong></li>
            <li>Click <strong>Edit</strong> on the ShippingIQ method</li>
          </ol>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>Step 4 — Connect your account</div>
          <p style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.65', margin: '0 0 10px' }}>Go to <strong>WooCommerce → ShippingIQ</strong> and sign in. Your account credentials are saved automatically — no manual entry required.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>Display Mode</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                <strong>All carriers</strong> — shows every eligible carrier at checkout<br/>
                <strong>Cheapest only</strong> — shows the lowest rate only<br/>
                <strong>Priority carrier</strong> — shows your top-ranked carrier that services the postcode
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>Step 5 — Test it</div>
          <ol style={{ fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.8', margin: 0, paddingLeft: '18px' }}>
            <li>Add a product to your cart</li>
            <li>Proceed to checkout and enter an Australian postcode</li>
            <li>ShippingIQ rates should appear in the shipping options</li>
            <li>If no rates appear, check the Troubleshooting section below</li>
          </ol>
        </div>
        <div style={{ padding: '12px 16px', background: 'var(--accent-light)', borderRadius: '8px', borderLeft: '3px solid var(--accent)', fontSize: '13px', color: 'var(--ink)', lineHeight: '1.6' }}>
          <strong>Important:</strong> You must have at least one active carrier with a postcode zone file uploaded in ShippingIQ before rates will appear at checkout.
        </div>
      </div>
    ),
  },
  {
    key: 'troubleshooting',
    title: 'Troubleshooting',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>No rates showing at checkout</div>
          <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.7' }}>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Go to WooCommerce → ShippingIQ and confirm your account is connected</li>
              <li>Make sure you have at least one active carrier in ShippingIQ</li>
              <li>Make sure your carrier has a postcode zone file uploaded (check for the amber "No zone file" badge on the carrier card)</li>
              <li>Check the postcode you're testing is covered by your carrier's zone file</li>
            </ul>
          </div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>Postcode not found / no quote returned</div>
          <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.7' }}>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>The postcode is not in your carrier's zone file — check your zone file covers that postcode</li>
              <li>If your carrier doesn't provide a zone file, use the manual postcode range entry on the carrier card</li>
              <li>Some remote postcodes may not be serviced by your carrier — this is correct behaviour</li>
            </ul>
          </div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>A specific carrier is not appearing</div>
          <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.7' }}>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Check the carrier is set to Active in ShippingIQ → Carriers</li>
              <li>Check the carrier has a postcode zone file (amber badge = no zone file)</li>
              <li>Check the carrier's eligibility limits (Pro feature) — if any cart item exceeds the weight or dimension limits, the carrier is excluded</li>
              <li>Check if a product tag is restricting the carrier (Pro feature) — shippingiq-only-[slug] or shippingiq-exclude-[slug]</li>
            </ul>
          </div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', fontSize: '13px', fontWeight: '600', color: 'var(--ink)' }}>Rates look wrong or too high/low</div>
          <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--ink-mid)', lineHeight: '1.7' }}>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Use ShippingIQ → Get a Quote to calculate the same order manually and compare</li>
              <li>Check your fuel levy % is correctly set on the carrier card</li>
              <li>Check your freight margin settings in Rules</li>
              <li>If you used the Rate Card Converter (PDF), verify the extracted rates match your original PDF</li>
              <li>Check your cubic factor — standard Australian road freight is 250. Change only if your carrier contract specifies otherwise</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: 0 }}>
          Still stuck? Email <a href="mailto:support@shippingiq.com.au" style={{ color: 'var(--accent)' }}>support@shippingiq.com.au</a> and include your Merchant ID.
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
    body: 'Upload your rate card, zone file, and optional surcharge document. ShippingIQ reads CSV and Excel on the free plan, plus PDF on Pro.',
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
    body: 'Install the WooCommerce plugin, sign in to connect your account, and your customers see real carrier rates — calculated from your own contracted prices.',
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
  const { profile, merchant, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState({})

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

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
          <a href="/saved-quotes" className="nav-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Saved Quotes</a>
          <a href="/resources" className="nav-item active">
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
            <h1 className="main-title">Resources</h1>
            <p className="main-subtitle">Templates, guides, and everything you need to get set up.</p>
          </div>
        </div>

        {/* Template Files */}
        <section style={{ marginBottom: '52px', maxWidth: '760px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', fontWeight: '400', color: 'var(--ink)', marginBottom: '6px' }}>
            Template Files
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
            Download these templates, fill in your carrier's rates and zones, then upload to ShippingIQ.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
            Have a PDF rate card?{' '}
            <a href="/convert" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>
              Use the Rate Card Converter (Pro feature) →
            </a>
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
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>WooCommerce Plugin</div>
                <div style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.5' }}>Install ShippingIQ directly from the WordPress.org plugin directory</div>
              </div>
              <a href="https://wordpress.org/plugins/shippingiq-freight-rates-for-woocommerce" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'var(--accent)', color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', alignSelf: 'flex-start' }}>
                View on WordPress.org →
              </a>
            </div>
          </div>
        </section>

        {/* Help & Guides */}
        <section style={{ marginBottom: '52px', maxWidth: '680px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '22px', fontWeight: '400', color: 'var(--ink)', marginBottom: '6px' }}>
            Help & Guides
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '24px' }}>
            Carrier file guides, WooCommerce installation, and troubleshooting.
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
        </div>
      </main>
    </div>
  )
}
