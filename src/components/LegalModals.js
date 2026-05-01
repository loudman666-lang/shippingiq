import { useState } from 'react'

const modalOverlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '20px',
}

const modalBox = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  width: '100%',
  maxWidth: '680px',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const modalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0,
}

const modalBody = {
  padding: '24px',
  overflowY: 'auto',
  fontSize: '14px',
  lineHeight: '1.7',
  color: 'var(--ink-mid)',
}

const h2Style = { fontSize: '15px', fontWeight: '600', color: 'var(--ink)', margin: '20px 0 6px' }
const h3Style = { fontSize: '14px', fontWeight: '600', color: 'var(--ink)', margin: '16px 0 4px' }
const pStyle = { margin: '0 0 10px' }
const ulStyle = { margin: '0 0 10px', paddingLeft: '20px' }

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: '22px', lineHeight: 1, padding: '0' }}>×</button>
  )
}

export function TermsModal({ onClose }) {
  return (
    <div style={modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalBox}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)' }}>Terms of Service</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>Last updated: May 2026</div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={modalBody}>
          <p style={pStyle}>By accessing or using ShippingIQ ("the Service"), operated by ShippingIQ (ABN 12 841 621 075), you agree to be bound by these Terms of Service. If you do not agree to these Terms, you must not use the Service.</p>
          <p style={pStyle}>These Terms apply to all users of the Service.</p>

          <h2 style={h2Style}>1. Description of Service</h2>
          <p style={pStyle}>ShippingIQ is a subscription-based software service that provides freight rate management, calculation, and quoting tools for ecommerce businesses. The Service uses AI to read and extract data from carrier rate cards in CSV, Excel, and PDF formats.</p>
          <p style={pStyle}>We may update, modify, or improve the Service at any time without notice.</p>

          <h2 style={h2Style}>2. Accounts</h2>
          <p style={pStyle}>You are responsible for maintaining the confidentiality of your login details and for all activity that occurs under your account. You must not share your login credentials with others unless your subscription plan allows multiple users. We reserve the right to suspend or terminate accounts that violate these Terms or misuse the Service.</p>

          <h2 style={h2Style}>3. Subscription and Payment</h2>
          <p style={pStyle}>ShippingIQ is offered on a subscription basis with the following plans: Free ($0/mo), Starter ($39/mo), Growth ($79/mo), and Pro ($149/mo) unless otherwise stated. Subscriptions are billed monthly in advance and continue until cancelled. All prices are in Australian Dollars and inclusive of GST where applicable.</p>

          <h2 style={h2Style}>4. Free Trial</h2>
          <p style={pStyle}>New accounts on paid plans receive a 14-day free trial. No credit card is required to start the trial. At the end of the trial period, you must add a payment method to continue using paid features. We reserve the right to change or remove the free trial at any time.</p>

          <h2 style={h2Style}>5. Cancellation</h2>
          <p style={pStyle}>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months or unused time. To cancel, manage your subscription via the Billing page in the app or contact support@shippingiq.com.au.</p>

          <h2 style={h2Style}>6. Acceptable Use</h2>
          <p style={pStyle}>You agree to use the Service only for lawful business purposes. You must not:</p>
          <ul style={ulStyle}>
            <li>Share login credentials outside permitted users</li>
            <li>Attempt to reverse-engineer the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use the Service for unlawful or fraudulent activity</li>
            <li>Attempt to gain unauthorised access to systems or data</li>
          </ul>

          <h2 style={h2Style}>7. Data and Content</h2>
          <p style={pStyle}>You retain ownership of all data you upload to the Service, including carrier rate cards and zone files. By uploading data, you grant us a limited licence to store, process, and display the data solely for the purpose of providing the Service. We do not sell your data. You are responsible for the accuracy of the data you enter.</p>

          <h2 style={h2Style}>8. AI Accuracy Disclaimer</h2>
          <p style={pStyle}>ShippingIQ uses AI to parse carrier rate cards. While we strive for accuracy, AI extraction is not guaranteed to be 100% correct. Destination names, rate values, and surcharge amounts should always be verified against your original carrier documents before going live. We are not liable for freight calculation errors arising from incorrectly parsed rate card data.</p>

          <h2 style={h2Style}>9. Service Availability</h2>
          <p style={pStyle}>We aim to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for any loss arising from downtime or errors in the Service.</p>

          <h2 style={h2Style}>10. No Warranty</h2>
          <p style={pStyle}>The Service is provided "as is" and "as available" without warranties of any kind, including accuracy of freight calculations, fitness for a particular purpose, reliability, or error-free operation. You use the Service at your own risk.</p>

          <h2 style={h2Style}>11. Limitation of Liability</h2>
          <p style={pStyle}>To the maximum extent permitted by Australian law, ShippingIQ is not liable for any indirect, incidental, special, or consequential damages arising from the use of the Service. Our total liability for any claim is limited to the fees paid by you in the 30 days preceding the claim. Nothing in these Terms excludes rights that cannot be excluded under Australian Consumer Law.</p>

          <h2 style={h2Style}>12. Changes to Terms</h2>
          <p style={pStyle}>We may update these Terms from time to time. We will notify users of significant changes via email or within the Service. Continued use of the Service after changes means you accept the updated Terms.</p>

          <h2 style={h2Style}>13. Governing Law</h2>
          <p style={pStyle}>These Terms are governed by the laws of Victoria, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Victoria.</p>

          <h2 style={h2Style}>14. Contact</h2>
          <p style={pStyle}>ShippingIQ · ABN 12 841 621 075 · support@shippingiq.com.au</p>
        </div>
      </div>
    </div>
  )
}

export function PrivacyModal({ onClose }) {
  return (
    <div style={modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalBox}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)' }}>Privacy Policy</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>Last updated: May 2026</div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={modalBody}>
          <p style={pStyle}>ShippingIQ (ABN 12 841 621 075) is committed to protecting your privacy in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).</p>

          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}>We may collect the following information:</p>
          <ul style={ulStyle}>
            <li>Name and email address</li>
            <li>Company/store name</li>
            <li>Account login information</li>
            <li>Carrier rate cards, zone files, and surcharge documents you upload</li>
            <li>Customer postcode and order data processed at checkout via our API</li>
            <li>Freight quotes generated through the Service</li>
            <li>Usage information (login times, feature usage, activity logs)</li>
            <li>Payment-related information processed by our payment provider</li>
          </ul>

          <h2 style={h2Style}>2. How We Use Your Information</h2>
          <p style={pStyle}>We use your information to provide and operate the Service, manage your account, process subscription payments, send account-related communications, provide customer support, improve features, and maintain security. We do not sell your personal information.</p>

          <h2 style={h2Style}>3. Carrier Rate Card Data</h2>
          <p style={pStyle}>Carrier rate cards and pricing data you upload are your confidential business information. We never share, sell, or disclose your carrier pricing to any third party. This data is used solely to calculate freight rates within your account.</p>

          <h2 style={h2Style}>4. Customer Data at Checkout</h2>
          <p style={pStyle}>When your WooCommerce store calls the ShippingIQ API at checkout, customer postcode and order item data is transmitted to calculate freight costs. This data is used only for that calculation and is not stored beyond what is necessary to generate the quote.</p>

          <h2 style={h2Style}>5. Data Storage and Security</h2>
          <p style={pStyle}>Your data is stored using secure cloud infrastructure provided by Supabase. Data may be stored on servers located in Australia or the United States. We use industry-standard encryption in transit and at rest. You are responsible for keeping your login credentials secure.</p>

          <h2 style={h2Style}>6. Third-Party Services</h2>
          <p style={pStyle}>We use trusted third-party providers including Supabase (database and authentication), Stripe (payment processing), and Anthropic (AI rate card parsing). These providers may store or process your information in accordance with their own privacy policies.</p>

          <h2 style={h2Style}>7. Overseas Disclosure</h2>
          <p style={pStyle}>Our service providers may use international infrastructure. Your information may be transferred to or stored in countries outside Australia, including the United States. By using the Service, you consent to this in accordance with the Australian Privacy Principles.</p>

          <h2 style={h2Style}>8. Your Rights</h2>
          <p style={pStyle}>Under the Privacy Act 1988, you have the right to request access to, correction of, or deletion of your personal information. Contact us at support@shippingiq.com.au to exercise these rights.</p>

          <h2 style={h2Style}>9. Data Retention</h2>
          <p style={pStyle}>We retain your data while your account is active. If your subscription is cancelled, your data will normally be retained for up to 30 days before permanent deletion, to allow you to export your information.</p>

          <h2 style={h2Style}>10. Cookies</h2>
          <p style={pStyle}>ShippingIQ uses only essential cookies required for authentication, session management, and security. We do not use advertising or third-party tracking cookies.</p>

          <h2 style={h2Style}>11. Complaints</h2>
          <p style={pStyle}>If you believe we have breached the Australian Privacy Principles, contact us at support@shippingiq.com.au. If unsatisfied with our response, you may contact the Office of the Australian Information Commissioner (OAIC).</p>

          <h2 style={h2Style}>12. Contact</h2>
          <p style={pStyle}>Privacy Officer · ShippingIQ · ABN 12 841 621 075 · support@shippingiq.com.au</p>
        </div>
      </div>
    </div>
  )
}

export function RefundModal({ onClose }) {
  return (
    <div style={modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalBox}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--ink)' }}>Refund & Cancellation Policy</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>Last updated: May 2026</div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={modalBody}>
          <h2 style={h2Style}>1. Subscription Billing</h2>
          <p style={pStyle}>ShippingIQ is offered on a monthly subscription basis. Subscriptions are billed in advance and renew automatically each month until cancelled. All prices are in Australian Dollars (AUD) and include GST where applicable.</p>

          <h2 style={h2Style}>2. Free Trial</h2>
          <p style={pStyle}>New accounts on paid plans receive a 14-day free trial. No payment is required to start the trial. If you do not add a payment method before the trial ends, access to paid features will be suspended automatically. We reserve the right to modify or remove the free trial at any time.</p>

          <h2 style={h2Style}>3. Cancellation</h2>
          <p style={pStyle}>You may cancel your subscription at any time via the Billing page in the app. Cancellation takes effect at the end of the current billing period. You will continue to have access to your paid features until the billing period expires.</p>

          <h2 style={h2Style}>4. Refunds</h2>
          <p style={pStyle}>ShippingIQ is a digital subscription service. Refunds are not provided for partial billing periods, unused time, change of mind, or failure to cancel before renewal. We may provide refunds at our discretion in exceptional circumstances. Nothing in this policy excludes rights you may have under Australian Consumer Law.</p>

          <h2 style={h2Style}>5. Failed Payments</h2>
          <p style={pStyle}>If a payment cannot be processed, your account may be suspended until payment is successful. Continued non-payment may result in account cancellation and downgrade to the Free plan.</p>

          <h2 style={h2Style}>6. Account Suspension or Termination</h2>
          <p style={pStyle}>We reserve the right to suspend or terminate accounts that breach the Terms of Service, misuse the Service, or fail to pay subscription fees. No refunds will be provided for accounts terminated for breach of terms.</p>

          <h2 style={h2Style}>7. Contact</h2>
          <p style={pStyle}>For billing or refund enquiries: ShippingIQ · support@shippingiq.com.au</p>
        </div>
      </div>
    </div>
  )
}
