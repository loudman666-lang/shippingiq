# ShippingIQ — Session Handover
Date: 26 April 2026

---

## WHO IS DAVE

Dave Bishop, Melbourne, Australia. Sole founder of IQ Suite:
- **ImporterIQ** — CBM/warehouse dashboard, live at importeriq.com (React/Supabase/Netlify)
- **MarginIQ** — landed cost/margin calculator, live at marginiq.com.au (separate Supabase project)
- **ShippingIQ** — freight rules engine for Australian ecommerce, IN BUILD

Dave and Claude build everything together. No developer. All code produced by Claude, pushed to GitHub, Dave runs `git pull` to sync. No zip files, no copy paste.

Dave has 12+ years running My Furniture, an Australian online furniture ecommerce business. Deep domain expertise in Australian freight — Allied, Hunter, StarTrack, Mainfreight, cubic weight, zone-based pricing, tailgate surcharges etc.

---

## SHIPPINGIQ — WHAT IT IS

A freight rules engine for Australian ecommerce merchants.
- Merchant uploads their own carrier rate card (PDF/Excel/CSV) and zone file
- AI (Claude API) parses both
- Accurate freight cost appears at checkout automatically
- Works standalone as a quoting tool from the dashboard before store integration
- Integrates with WooCommerce (Phase 1), Shopify (Phase 2)

**Core value prop:** Your rates. Your carriers. Your rules. Accurate freight at checkout. Live in under an hour.

**Pricing:**
- Free: $0, 1 carrier, 10 orders/month, documentation only
- Starter: $39/mo, 2 carriers, unlimited orders, email support
- Growth: $79/mo, unlimited carriers, full rules engine, email support
- Pro: $149/mo, everything + priority email support + automated carrier booking & label generation

---

## TECH STACK

- Frontend: React (create-react-app)
- Backend/DB: Supabase
- Hosting: Netlify
- Payments: Stripe (not yet integrated)
- Auth: Supabase Auth
- Email: hello@shippingiq.com.au (Zoho) + Resend for transactional

---

## GITHUB

- Repo: https://github.com/loudman666-lang/shippingiq (private)
- Username: loudman666-lang
- Token: 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
- Local path on Dave's Mac: ~/Downloads/shippingiq

**Workflow every session:**
1. Claude makes changes in CC, commits and pushes to GitHub
2. Dave runs in Terminal: `cd ~/Downloads/shippingiq && git pull`
3. Dave runs: `npm start`
4. App runs at http://localhost:3000

**Git remote URL (with token embedded — already set on Dave's Mac):**
```
https://loudman666-lang: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@github.com/loudman666-lang/shippingiq.git
```

---

## SUPABASE

- Project: shippingiq
- Organisation: loudman666@gmail.com's Org (Pro plan)
- Project URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXh2cWtrZWNxemFyd21iZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU1NTEsImV4cCI6MjA5Mjc0MTU1MX0.dWydniFxo4a7T1TkBO6Hrj3ZfO7khjygvHegf3-3Jjw
- Service role key: in Dave's notes (not stored here for security)

**Tables created:**
- `merchants` — one per business (id, name, plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at)
- `profiles` — one per user (id, merchant_id, full_name, email, role [admin/user], created_at, updated_at)

**RLS:** Enabled on both tables with policies in place.

**Trigger:** `on_auth_user_created` — fires on new auth user, auto-creates merchant and profile using metadata passed from signup form (full_name, store_name). This is working in Supabase.

**Known issue:** After signup, dashboard shows "?" and "User" in bottom left instead of Dave's name and "Admin". The trigger is running (user created in Supabase auth) but the profile data is not being fetched correctly after signup. The `fetchProfile` function in AuthContext may be firing before the trigger completes.

---

## CURRENT FILE STRUCTURE

```
~/Downloads/shippingiq/
├── .env.local (contains anon key — not in GitHub)
├── .env.example
├── .gitignore
├── netlify.toml
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── App.js (routing)
│   ├── index.js
│   ├── components/
│   │   └── auth/
│   │       ├── Auth.css
│   │       └── ProtectedRoute.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── lib/
│   │   └── supabase.js
│   └── pages/
│       ├── Auth.css
│       ├── Dashboard.css
│       ├── Dashboard.js
│       ├── ForgotPassword.js
│       ├── ResetPassword.js
│       ├── SignIn.js
│       └── SignUp.js
├── netlify/
│   └── functions/
│       └── create-account.js (not currently used)
├── supabase-setup.sql
├── supabase-fix-rls.sql
└── shippingiq-landing.html (landing page — complete and ready)
```

---

## LANDING PAGE STATUS

Complete and ready. File: `shippingiq-landing.html` in the repo root.
- All sections done: hero, trust strip, platforms, how it works, features, pricing, FAQ, CTA, footer
- Brand: Instrument Serif headlines, DM Sans body, orange accent (#E8521A)
- Mobile responsive
- Footer: © 2026 ImporterIQ · ABN 12 841 621 075 · Australia · v1.0.0
- Contact: support@shippingiq.com.au
- Testimonials: placeholder commented out in code, add when beta merchants provide quotes
- Terms/Privacy/Refund Policy: links exist, pages not yet written
- Goes live same day as the app

---

## AUTH SYSTEM STATUS

**Working:**
- Sign up page (/signup) — collects name, store name, email, password
- Sign in page (/signin)
- Forgot password (/forgot-password)
- Reset password (/reset-password)
- Protected routes — redirects to /signin if not logged in
- Admin route — redirects if not admin
- Supabase trigger creates merchant + profile on signup
- Confirmation email sends correctly

**Not working yet:**
- Profile not loading after signup — shows "?" and "User" instead of name and Admin role
- This is the first thing to fix in the next session
- Likely cause: fetchProfile fires before trigger completes, needs a retry or delay

**User roles:** Admin and User only (mirrors MarginIQ)
- Admin: full access, billing, carrier setup, rules, can invite/remove users
- User: can use quoting tool and view rates, cannot touch settings/billing/invite others

**Plan limits on users:**
- Free: 1 user (owner/admin only)
- Starter: 2 users
- Growth: 5 users
- Pro: unlimited

---

## BUILD SEQUENCE — WHERE WE ARE

- [x] Stage 0: Landing page — COMPLETE
- [x] Stage 1: Auth and account setup — 90% COMPLETE (profile loading bug to fix)
- [ ] Stage 2: Carrier setup and AI parsing
- [ ] Stage 3: Rules engine UI
- [ ] Stage 4: Rate calculation engine + standalone quote tool
- [ ] Stage 5: API layer
- [ ] Stage 6: WooCommerce plugin
- [ ] Stage 7: Dashboard and analytics

---

## NEXT SESSION — START HERE

1. Fix profile loading after signup (AuthContext.js — fetchProfile timing issue)
2. Test sign in flow end to end
3. Test forgot password / reset password flow
4. Begin Stage 2 — Carrier setup page

---

## IMPORTANT CONVENTIONS

- Claude pushes to GitHub, Dave pulls. Never send zip files.
- Never ask Dave to paste SQL manually unless it is truly a one-time setup step
- Always use Supabase triggers/functions for backend logic, not frontend RLS workarounds
- Auth pattern: Supabase Auth + profiles table + merchants table
- Never use recursive RLS policies — use security definer functions
- Always deploy with `--no-verify-jwt` for Supabase Edge Functions if used
- Dave's preferred workflow signal: "remember my workflow" to reset drift

---

## OTHER IQ SUITE NOTES

- MarginIQ Supabase project: fkcscdzgunycjuhjqvja (separate account, to be consolidated later)
- ImporterIQ Supabase: ecxmxfwhkxwatqdwlpxk (loudman666@gmail.com account)
- All three products eventually under one Supabase org to save $45/month
- IQ Central (Phase 4): single login across all three products, bundle pricing ~$179/month

---

## TEST CARRIER FILES (TO BUILD LATER)

When AI parser is built, need dummy rate cards and zone files at 4 difficulty levels:
- Easy: clean Excel/CSV, consistent headers, simple zone codes
- Medium: PDF with merged cells, minor inconsistencies, separate surcharge sheet
- Hard: scanned/legacy PDF, mismatched zone codes, surcharges in footnotes
- Real World: based on actual Allied, Hunter, StarTrack formatting

