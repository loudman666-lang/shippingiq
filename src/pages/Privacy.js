import { Link } from 'react-router-dom'
import './Landing.css'

const h2 = { fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: '28px 0 6px' }
const p  = { margin: '0 0 12px', lineHeight: '1.7', color: 'var(--ink-mid)' }
const ul = { margin: '0 0 12px', paddingLeft: '20px', lineHeight: '1.7', color: 'var(--ink-mid)' }

export default function Privacy() {
  return (
    <div className="landing-page">

      <nav>
        <Link to="/" className="nav-logo">
          <span className="nav-logo-dot"></span>
          ShippingIQ
        </Link>
        <ul className="nav-links" />
        <div className="nav-actions">
          <Link to="/signin" className="btn-ghost">Sign in</Link>
          <Link to="/signup" className="btn-primary">Start for free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '60px auto 80px', padding: '0 24px', fontSize: '14px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--ink)', marginBottom: '4px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '32px' }}>Last updated: May 2026</p>

        <p style={p}>ShippingIQ (ABN 12 841 621 075) is committed to protecting your privacy in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).</p>

        <h2 style={h2}>1. Information We Collect</h2>
        <p style={p}>We may collect the following information:</p>
        <ul style={ul}>
          <li>Name and email address</li>
          <li>Company/store name</li>
          <li>Account login information</li>
          <li>Carrier rate cards, zone files, and surcharge documents you upload</li>
          <li>Customer postcode and order data processed at checkout via our API</li>
          <li>Freight quotes generated through the Service</li>
          <li>Usage information (login times, feature usage, activity logs)</li>
          <li>Payment-related information processed by our payment provider</li>
        </ul>

        <h2 style={h2}>2. How We Use Your Information</h2>
        <p style={p}>We use your information to provide and operate the Service, manage your account, process subscription payments, send account-related communications, provide customer support, improve features, and maintain security. We do not sell your personal information.</p>

        <h2 style={h2}>3. Carrier Rate Card Data</h2>
        <p style={p}>Carrier rate cards and pricing data you upload are your confidential business information. We never share, sell, or disclose your carrier pricing to any third party. This data is used solely to calculate freight rates within your account.</p>

        <h2 style={h2}>4. Customer Data at Checkout</h2>
        <p style={p}>When your WooCommerce store calls the ShippingIQ API at checkout, customer postcode and order item data is transmitted to calculate freight costs. This data is used only for that calculation and is not stored beyond what is necessary to generate the quote.</p>

        <h2 style={h2}>5. Data Storage and Security</h2>
        <p style={p}>Your data is stored using secure cloud infrastructure provided by Supabase. Data may be stored on servers located in Australia or the United States. We use industry-standard encryption in transit and at rest. You are responsible for keeping your login credentials secure.</p>

        <h2 style={h2}>6. Third-Party Services</h2>
        <p style={p}>We use trusted third-party providers including Supabase (database and authentication), Stripe (payment processing), and Anthropic (AI rate card parsing). These providers may store or process your information in accordance with their own privacy policies.</p>

        <h2 style={h2}>7. Overseas Disclosure</h2>
        <p style={p}>Our service providers may use international infrastructure. Your information may be transferred to or stored in countries outside Australia, including the United States. By using the Service, you consent to this in accordance with the Australian Privacy Principles.</p>

        <h2 style={h2}>8. Your Rights</h2>
        <p style={p}>Under the Privacy Act 1988, you have the right to request access to, correction of, or deletion of your personal information. Contact us at <a href="mailto:support@shippingiq.com.au" style={{ color: 'var(--primary)' }}>support@shippingiq.com.au</a> to exercise these rights.</p>

        <h2 style={h2}>9. Data Retention</h2>
        <p style={p}>We retain your data while your account is active. If your subscription is cancelled, your data will normally be retained for up to 30 days before permanent deletion, to allow you to export your information.</p>

        <h2 style={h2}>10. Cookies</h2>
        <p style={p}>ShippingIQ uses only essential cookies required for authentication, session management, and security. We do not use advertising or third-party tracking cookies.</p>

        <h2 style={h2}>11. Complaints</h2>
        <p style={p}>If you believe we have breached the Australian Privacy Principles, contact us at <a href="mailto:support@shippingiq.com.au" style={{ color: 'var(--primary)' }}>support@shippingiq.com.au</a>. If unsatisfied with our response, you may contact the Office of the Australian Information Commissioner (OAIC).</p>

        <h2 style={h2}>12. Contact</h2>
        <p style={p}>Privacy Officer · ShippingIQ · ABN 12 841 621 075 · <a href="mailto:support@shippingiq.com.au" style={{ color: 'var(--primary)' }}>support@shippingiq.com.au</a></p>
      </div>

      <footer>
        <Link to="/" className="footer-logo">
          <span className="footer-logo-dot"></span>
          ShippingIQ
        </Link>
        <div style={{ textAlign: 'center' }}>
          <p className="footer-copy">© 2026 ShippingIQ · ABN 12 841 621 075 · Australia · v1.0.0</p>
          <p style={{ marginTop: '6px' }}><a href="mailto:support@shippingiq.com.au" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>support@shippingiq.com.au</a></p>
        </div>
        <div className="footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>

    </div>
  )
}
