import { Link } from 'react-router-dom'
import './Landing.css'

const h2 = { fontSize: '16px', fontWeight: '600', color: 'var(--ink)', margin: '28px 0 6px' }
const p  = { margin: '0 0 12px', lineHeight: '1.7', color: 'var(--ink-mid)' }
const ul = { margin: '0 0 12px', paddingLeft: '20px', lineHeight: '1.7', color: 'var(--ink-mid)' }

export default function Terms() {
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
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--ink)', marginBottom: '4px' }}>Terms of Service</h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-muted)', marginBottom: '32px' }}>Last updated: May 2026</p>

        <p style={p}>By accessing or using ShippingIQ ("the Service"), operated by ShippingIQ (ABN 12 841 621 075), you agree to be bound by these Terms of Service. If you do not agree to these Terms, you must not use the Service.</p>
        <p style={p}>These Terms apply to all users of the Service.</p>

        <h2 style={h2}>1. Description of Service</h2>
        <p style={p}>ShippingIQ is a subscription-based software service that provides freight rate management, calculation, and quoting tools for ecommerce businesses. The Service uses AI to read and extract data from carrier rate cards in CSV, Excel, and PDF formats.</p>
        <p style={p}>We may update, modify, or improve the Service at any time without notice.</p>

        <h2 style={h2}>2. Accounts</h2>
        <p style={p}>You are responsible for maintaining the confidentiality of your login details and for all activity that occurs under your account. You must not share your login credentials with others unless your subscription plan allows multiple users. We reserve the right to suspend or terminate accounts that violate these Terms or misuse the Service.</p>

        <h2 style={h2}>3. Subscription and Payment</h2>
        <p style={p}>ShippingIQ is offered on a subscription basis with the following plans: Free ($0/mo) and Pro ($29/mo) unless otherwise stated. Subscriptions are billed monthly in advance and continue until cancelled. All prices are in Australian Dollars and inclusive of GST where applicable.</p>

        <h2 style={h2}>4. Free Trial</h2>
        <p style={p}>New accounts on paid plans receive a 14-day free trial. No credit card is required to start the trial. At the end of the trial period, you must add a payment method to continue using paid features. We reserve the right to change or remove the free trial at any time.</p>

        <h2 style={h2}>5. Cancellation</h2>
        <p style={p}>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months or unused time. To cancel, manage your subscription via the Billing page in the app or contact support@shippingiq.com.au.</p>

        <h2 style={h2}>6. Acceptable Use</h2>
        <p style={p}>You agree to use the Service only for lawful business purposes. You must not:</p>
        <ul style={ul}>
          <li>Share login credentials outside permitted users</li>
          <li>Attempt to reverse-engineer the Service</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Use the Service for unlawful or fraudulent activity</li>
          <li>Attempt to gain unauthorised access to systems or data</li>
        </ul>

        <h2 style={h2}>7. Data and Content</h2>
        <p style={p}>You retain ownership of all data you upload to the Service, including carrier rate cards and zone files. By uploading data, you grant us a limited licence to store, process, and display the data solely for the purpose of providing the Service. We do not sell your data. You are responsible for the accuracy of the data you enter.</p>

        <h2 style={h2}>8. AI Accuracy Disclaimer</h2>
        <p style={p}>ShippingIQ uses AI to parse carrier rate cards. While we strive for accuracy, AI extraction is not guaranteed to be 100% correct. Destination names, rate values, and surcharge amounts should always be verified against your original carrier documents before going live. We are not liable for freight calculation errors arising from incorrectly parsed rate card data.</p>

        <h2 style={h2}>9. Service Availability</h2>
        <p style={p}>We aim to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for any loss arising from downtime or errors in the Service.</p>

        <h2 style={h2}>10. No Warranty</h2>
        <p style={p}>The Service is provided "as is" and "as available" without warranties of any kind, including accuracy of freight calculations, fitness for a particular purpose, reliability, or error-free operation. You use the Service at your own risk.</p>

        <h2 style={h2}>11. Limitation of Liability</h2>
        <p style={p}>To the maximum extent permitted by Australian law, ShippingIQ is not liable for any indirect, incidental, special, or consequential damages arising from the use of the Service. Our total liability for any claim is limited to the fees paid by you in the 30 days preceding the claim. Nothing in these Terms excludes rights that cannot be excluded under Australian Consumer Law.</p>

        <h2 style={h2}>12. Changes to Terms</h2>
        <p style={p}>We may update these Terms from time to time. We will notify users of significant changes via email or within the Service. Continued use of the Service after changes means you accept the updated Terms.</p>

        <h2 style={h2}>13. Governing Law</h2>
        <p style={p}>These Terms are governed by the laws of Victoria, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Victoria.</p>

        <h2 style={h2}>14. Contact</h2>
        <p style={p}>ShippingIQ · ABN 12 841 621 075 · <a href="mailto:support@shippingiq.com.au" style={{ color: 'var(--primary)' }}>support@shippingiq.com.au</a></p>
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
