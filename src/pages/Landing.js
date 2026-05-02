import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'
import { TermsModal, PrivacyModal, RefundModal } from '../components/LegalModals'

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Landing() {
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showRefund, setShowRefund] = useState(false)

  return (
    <div className="landing-page">

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <span className="nav-logo-dot"></span>
          ShippingIQ
        </a>
        <ul className="nav-links">
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="nav-actions">
          <Link to="/signin" className="btn-ghost">Sign in</Link>
          <Link to="/signup" className="btn-primary">Start for free</Link>
        </div>
      </nav>

      {/* HERO */}
      <section>
        <div className="hero">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-pulse"></span>
              AI-powered freight · Australian-built
            </div>

            <h1>Your carrier rates.<br />Live at checkout.<br /><em>In under an hour.</em></h1>

            <p className="hero-sub">ShippingIQ's AI reads your carrier rate card — any format, any carrier — and turns it into accurate freight quotes at WooCommerce checkout. No developer. No manual data entry. No platform markup. Unlike Shippit or StarShipIt, we use your contracted carrier rates — not ours.</p>

            <div className="hero-cta">
              <Link to="/signup" className="btn-primary-lg">Start for free</Link>
              <a href="#how-it-works" className="btn-cta-ghost">See how it works</a>
              <span className="cta-note">No credit card required · Live in under an hour</span>
            </div>

            <div className="hero-carriers">
              <span className="carriers-label">Works with</span>
              <div className="carrier-pills">
                <span className="carrier-pill">Allied Express</span>
                <span className="carrier-pill">Hunter Express</span>
                <span className="carrier-pill">StarTrack</span>
                <span className="carrier-pill">Mainfreight</span>
                <span className="carrier-pill">+ any carrier</span>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="mockup-wrap">
              <div className="mockup-floating-tag">Live freight quote</div>
              <div className="mockup-card">
                <div className="mockup-accent-bar"></div>
                <div className="mockup-topbar">
                  <div className="mockup-dots">
                    <div className="mockup-dot dot-r"></div>
                    <div className="mockup-dot dot-y"></div>
                    <div className="mockup-dot dot-g"></div>
                  </div>
                  <div className="mockup-url-bar">
                    <span className="mockup-url">yourstore.com.au/checkout</span>
                  </div>
                </div>
                <div className="mockup-body">
                  <div style={{ marginBottom: '18px' }}>
                    <div className="mock-label">Order summary</div>
                    <div className="mock-line">
                      <span className="mock-line-label">2× Dining Chair — Oak</span>
                      <span className="mock-line-val">$798.00</span>
                    </div>
                    <div className="mock-line">
                      <span className="mock-line-label">Delivery to 6000 Perth WA</span>
                      <span className="mock-line-val" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>calculating...</span>
                    </div>
                  </div>

                  <div className="mock-label">Choose delivery</div>
                  <div className="ship-options">
                    <div className="ship-opt active">
                      <div className="ship-opt-left">
                        <div className="ship-radio"><div className="ship-radio-inner"></div></div>
                        <div>
                          <div className="ship-name">Allied Express — Standard</div>
                          <div className="ship-eta">5–7 business days</div>
                        </div>
                      </div>
                      <div className="ship-price">$64.50</div>
                    </div>
                    <div className="ship-opt">
                      <div className="ship-opt-left">
                        <div className="ship-radio"></div>
                        <div>
                          <div className="ship-name">StarTrack — Express</div>
                          <div className="ship-eta">2–3 business days</div>
                        </div>
                      </div>
                      <div className="ship-price">$112.00</div>
                    </div>
                  </div>

                  <div className="mock-total">
                    <span>Order total</span>
                    <span>$862.50</span>
                  </div>

                  <div className="mock-ai-badge">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="#E8521A" strokeWidth="1.5"/>
                      <path d="M5.5 8.5L7 10L10.5 6" stroke="#E8521A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Calculated from your Allied rate card · Zone 8
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-value">880+</div>
            <div className="stat-label">rates parsed per carrier</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">Any format</div>
            <div className="stat-label">CSV, Excel or PDF</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">Under an hour</div>
            <div className="stat-label">from upload to live checkout</div>
          </div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '20px 40px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)' }}>256-bit encryption</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>All data encrypted in transit and at rest</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-mid)', flexShrink: 0 }} className="trust-divider" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)' }}>Your rates stay yours</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>We never see or share your carrier pricing</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-mid)', flexShrink: 0 }} className="trust-divider" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)' }}>No data sharing</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Your customer data is never sold or shared</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'var(--border-mid)', flexShrink: 0 }} className="trust-divider" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)' }}>Australian owned</div>
              <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Built and operated in Australia</div>
            </div>
          </div>

        </div>
      </div>

      {/* LOGOS */}
      <div className="logos-strip">
        <div className="logos-label">Integrates with your ecommerce platform</div>
        <div className="logos-row">
          <span className="logo-name">WooCommerce</span>
          <span className="logo-sep">·</span>
          <span className="logo-name">Shopify <span className="logo-coming-soon">coming soon</span></span>
          <span className="logo-sep">·</span>
          <span className="logo-name">Magento <span className="logo-coming-soon">coming soon</span></span>
          <span className="logo-sep">·</span>
          <span className="logo-name">BigCommerce <span className="logo-coming-soon">coming soon</span></span>
        </div>
      </div>

      {/* HOW THE AI WORKS */}
      <section id="how-it-works">
        <div className="section">
          <div className="sec-label">The AI</div>
          <h2>Drop in the file. The AI does the rest.</h2>
          <p className="sec-sub">Most freight tools require you to manually enter every rate. ShippingIQ reads your carrier's own file — however it's formatted — and extracts every zone, rate, and surcharge automatically.</p>

          <div className="steps-grid">
            <div className="step">
              <span className="step-num">01</span>
              <div className="step-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="step-title">Upload your rate card</div>
              <div className="step-body">PDF, Excel, or CSV — whatever your carrier sent you. ShippingIQ's AI reads every format including messy legacy files with merged cells and inconsistent layouts.</div>
              <span className="step-time">About 5 minutes</span>
            </div>

            <div className="step">
              <span className="step-num">02</span>
              <div className="step-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div className="step-title">AI extracts everything</div>
              <div className="step-body">Zones, weight breaks, base charges, per-kg rates, surcharges, fuel levies — all extracted and mapped automatically in 20–40 seconds. You review and confirm.</div>
              <span className="step-time">20–40 seconds</span>
            </div>

            <div className="step">
              <span className="step-num">03</span>
              <div className="step-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="step-title">Connect your store</div>
              <div className="step-body">Install the plugin for your platform, paste your API key, and test a quote. Every customer gets the right freight rate automatically at checkout — no flat rates, no guessing.</div>
              <span className="step-time">About 10 minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* TWO WAYS TO USE IT */}
      <section>
        <div className="section">
          <div className="sec-label">Two ways to use it</div>
          <h2>Use it your way</h2>
          <p className="sec-sub">Start quoting freight from day one. Connect your store when you're ready.</p>

          <div className="use-cases-grid">
            <div className="use-case-card">
              <div className="use-case-tag muted">No website needed</div>
              <div className="use-case-title">Quote from the dashboard</div>
              <p className="use-case-body">ShippingIQ works as a standalone freight calculator from the moment setup is complete. Quote phone orders, check freight costs, or give your team accurate rates — before you've touched your website.</p>
              <ul className="use-case-feats">
                <li className="use-case-feat"><CheckIcon />Multi-carrier comparison</li>
                <li className="use-case-feat"><CheckIcon />Full cost breakdown with surcharges</li>
                <li className="use-case-feat"><CheckIcon />Save and review past quotes</li>
                <li className="use-case-feat"><CheckIcon />No developer required</li>
              </ul>
            </div>

            <div className="use-case-card featured">
              <div className="use-case-tag accent">WooCommerce ready</div>
              <div className="use-case-title">Live rates at checkout</div>
              <p className="use-case-body">Install the ShippingIQ plugin, enter your Merchant ID, and every customer sees real carrier rates at checkout — calculated from your own contracted prices, not industry averages.</p>
              <ul className="use-case-feats">
                <li className="use-case-feat"><CheckIcon />Automatic rate calculation</li>
                <li className="use-case-feat"><CheckIcon />Multi-carrier display at checkout</li>
                <li className="use-case-feat"><CheckIcon />Free shipping rules</li>
                <li className="use-case-feat"><CheckIcon />Surcharge handling built in</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <div className="features-bg" id="features">
        <div className="section">
          <div className="sec-label">What's included</div>
          <h2>Everything you need.<br />Nothing you don't.</h2>
          <p className="sec-sub">Built by someone who shipped bulky and small goods nationally for 12 years. Every feature exists because it solves a real problem. And unlike Shippit, StarShipIt, or Smart Send — we never touch your carrier rates. Your negotiated pricing stays yours.</p>

          {/* AI PARSE CARD */}
          <div className="ai-parse-card">
            <div className="ai-parse-header">
              <div className="ai-parse-filename">
                <span>ShippingIQ AI</span>Parsing allied-express-rates.xlsx
              </div>
              <div className="ai-parse-badge">Complete</div>
            </div>
            <div className="ai-parse-results">
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Pricing model:</span>
                <span className="ai-parse-val">Base charge + per kg rate</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Surcharges identified:</span>
                <span className="ai-parse-val">23</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Origin depots:</span>
                <span className="ai-parse-val">Sydney, Melbourne, Brisbane, Adelaide, Perth</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Cubic factor:</span>
                <span className="ai-parse-val">250 (standard domestic)</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Zones mapped:</span>
                <span className="ai-parse-val">175</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Fuel levy:</span>
                <span className="ai-parse-val">26.5%</span>
              </div>
              <div className="ai-parse-row">
                <span className="ai-parse-check">✓</span>
                <span className="ai-parse-key">Rates extracted:</span>
                <span className="ai-parse-val">880</span>
              </div>
            </div>
          </div>

          <div className="features-grid">

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="feat-title">AI rate card parsing</div>
              <div className="feat-body">Upload a PDF or Excel from any carrier. AI reads and extracts every zone, rate, and surcharge in seconds — no manual data entry, no spreadsheet wrangling, no IT team required.</div>
            </div>

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
              </div>
              <div className="feat-title">Your rates, your carriers</div>
              <div className="feat-body">Use the pricing you negotiated directly with Allied, Hunter, StarTrack or any carrier. No platform markup, ever.</div>
            </div>

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
                  <path d="M8 2v16"/>
                  <path d="M16 6v16"/>
                </svg>
              </div>
              <div className="feat-title">Zone management</div>
              <div className="feat-body">Upload your carrier's postcode-to-zone file, or enter postcode ranges manually. Every Australian postcode mapped to the right zone automatically.</div>
            </div>

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="feat-title">Free shipping rules</div>
              <div className="feat-body">Set a free shipping threshold, choose Smart or Always Free mode, and exempt bulky items with a product tag. Rules apply automatically at checkout.</div>
            </div>

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="1"/>
                  <path d="M16 8h4l3 3v5h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div className="feat-title">Surcharge control</div>
              <div className="feat-body">Tailgate, residential, hand unload, dangerous goods, overlength. Pass through at cost, add margin, or absorb. Per order or per product.</div>
            </div>

            <div>
              <div className="feat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3"/>
                  <circle cx="6" cy="6" r="3"/>
                  <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                  <line x1="6" y1="9" x2="6" y2="21"/>
                </svg>
              </div>
              <div className="feat-title">Multi-carrier routing</div>
              <div className="feat-body">Route orders to different carriers based on item size, weight, or zone. The customer always sees the right rate for the right carrier.</div>
            </div>

          </div>
        </div>
      </div>

      {/* PRICING */}
      <section id="pricing">
        <div className="section">
          <div className="sec-label">Pricing</div>
          <h2>Transparent pricing.<br />No surprises.</h2>
          <p className="sec-sub">Start free. Upgrade when you're ready. 14-day free trial on Pro — no credit card required.</p>

          <div className="pricing-grid" style={{ maxWidth: '640px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            <div className="pricing-card">
              <div className="plan-name">Free</div>
              <div className="plan-price">
                <span className="price-dollar">$</span>
                <span className="price-amount">0</span>
              </div>
              <div className="plan-desc">One carrier. Prove it works before you commit.</div>
              <div className="plan-divider"></div>
              <ul className="plan-features">
                <li className="plan-feat"><CheckIcon />1 carrier</li>
                <li className="plan-feat"><CheckIcon />WooCommerce plugin</li>
                <li className="plan-feat"><CheckIcon />Full quote tool</li>
                <li className="plan-feat"><CheckIcon />Freight rules engine</li>
                <li className="plan-feat"><CheckIcon />Surcharge management</li>
              </ul>
              <Link to="/signup" className="btn-plan btn-outline">Get started free</Link>
            </div>

            <div className="pricing-card popular">
              <div className="popular-badge">Most popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">
                <span className="price-dollar">$</span>
                <span className="price-amount">49</span>
                <span className="price-period">/mo</span>
              </div>
              <div className="plan-desc">Unlimited carriers. Your rates. Live at checkout.</div>
              <div className="plan-divider"></div>
              <ul className="plan-features">
                <li className="plan-feat"><CheckIcon />Unlimited carriers</li>
                <li className="plan-feat"><CheckIcon />WooCommerce plugin</li>
                <li className="plan-feat"><CheckIcon />Full quote tool</li>
                <li className="plan-feat"><CheckIcon />Freight rules engine</li>
                <li className="plan-feat"><CheckIcon />Surcharge management</li>
                <li className="plan-feat"><CheckIcon />Rate Card Converter</li>
                <li className="plan-feat"><CheckIcon />Team members</li>
                <li className="plan-feat"><CheckIcon />Priority email support</li>
              </ul>
              <Link to="/signup" className="btn-plan btn-filled">Start free trial</Link>
            </div>

          </div>

          <p className="pricing-footnote">All prices in AUD · 14-day free trial on Pro · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--surface)' }}>
        <div className="section" style={{ paddingBottom: '80px' }}>
          <div className="sec-label">Common questions</div>
          <h2>Everything you need to know</h2>

          <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: 0 }}>

            <div className="faq-item">
              <div className="faq-q">Can I use ShippingIQ without connecting it to my store?</div>
              <div className="faq-a">Yes. The dashboard works as a standalone freight calculator from the moment you finish setup. Use it to quote phone orders, check freight costs for wholesale customers, or give your staff accurate quotes without going live on your website first.</div>
            </div>

            <div className="faq-item">
              <div className="faq-q">Which carriers does ShippingIQ support?</div>
              <div className="faq-a">Any carrier that provides a rate card and zone file — which is all of them. Allied Express, Hunter Express, StarTrack, Mainfreight, and any regional carrier. If your carrier gave you a rate schedule when you set up your account, ShippingIQ can read it.</div>
            </div>

            <div className="faq-item">
              <div className="faq-q">Do I need a developer to set this up?</div>
              <div className="faq-a">No. The dashboard is fully self-serve — upload your files, confirm the data, set your rules, and you're quoting freight. Connecting to your store requires installing a plugin and pasting an API key. If you can install a plugin, you can set up ShippingIQ.</div>
            </div>

            <div className="faq-item">
              <div className="faq-q">What format does my rate card need to be in?</div>
              <div className="faq-a">PDF, Excel, or CSV — whatever your carrier sent you. ShippingIQ's AI reads all three, including messy legacy formats with merged cells and inconsistent layouts. You don't need to reformat anything before uploading.</div>
            </div>

            <div className="faq-item">
              <div className="faq-q">What if my carrier isn't one of the big names?</div>
              <div className="faq-a">Doesn't matter. ShippingIQ works with any carrier that provides a rate card — including small regional carriers with no API. For zoning, most carriers provide a postcode-to-zone file alongside their rate card. If yours doesn't, you can enter postcode ranges manually in the dashboard. Either way, you're covered.</div>
            </div>

            <div className="faq-item">
              <div className="faq-q">How is this different from Shippit or StarShipIt?</div>
              <div className="faq-a">Shippit and StarShipIt use their own carrier contracts and mark up the rates. You pay their price, not yours. ShippingIQ uses the rates you negotiated directly with your carrier — we never touch them. Your pricing stays between you and your carrier.</div>
            </div>

            <div className="faq-item" style={{ borderBottom: 'none' }}>
              <div className="faq-q">Is my data secure?</div>
              <div className="faq-a">Yes. All data is encrypted in transit and at rest using 256-bit encryption. We never see, access, or share your carrier rate cards — they're yours. Customer postcode and order data passed through the API at checkout is used solely to calculate freight costs and is never sold or shared with third parties. ShippingIQ is Australian owned and operated and complies with the Australian Privacy Act.</div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="waitlist-bg" id="signup">
        <div className="waitlist-inner">
          <div className="waitlist-label">Get started today</div>
          <h2 className="waitlist-headline">Stop guessing.<br />Start <em>knowing.</em></h2>
          <p className="waitlist-sub">Sign up free. Upload your rate card and zone file. Get an accurate freight quote in under an hour — before you've touched your website.</p>
          <Link to="/signup" className="btn-primary-lg" style={{ display: 'inline-block', marginBottom: '16px' }}>Start for free</Link>
          <p className="waitlist-note">No credit card required · Free plan available · Cancel anytime</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <a href="#" className="footer-logo">
          <span className="footer-logo-dot"></span>
          ShippingIQ
        </a>
        <div style={{ textAlign: 'center' }}>
          <p className="footer-copy">© 2026 ShippingIQ · ABN 12 841 621 075 · Australia · v1.0.0</p>
          <p style={{ marginTop: '6px' }}><a href="mailto:support@shippingiq.com.au" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>support@shippingiq.com.au</a></p>
        </div>
        <div className="footer-links">
          <a href="#" onClick={e => { e.preventDefault(); setShowTerms(true) }}>Terms of Service</a>
          <a href="#" onClick={e => { e.preventDefault(); setShowPrivacy(true) }}>Privacy Policy</a>
          <a href="#" onClick={e => { e.preventDefault(); setShowRefund(true) }}>Refund Policy</a>
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showRefund && <RefundModal onClose={() => setShowRefund(false)} />}

    </div>
  )
}
