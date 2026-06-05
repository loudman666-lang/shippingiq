# ShippingIQ — Claude Dev Notes

See HANDOVER.md for the full project state (features, schema, known decisions).

## Key Info
- **Working dir:** `~/Downloads/shippingiq/`
- **Local:** http://localhost:3000
- **Live site:** https://shippingiq.com.au (Netlify — drag `build/` folder)
- **Netlify backup URL:** https://neon-pie-9a1542.netlify.app
- **GitHub:** github.com/loudman666-lang/shippingiq
- **Supabase project ref:** `soaxvqkkecqzarwmbeip`
- **Supabase URL:** https://soaxvqkkecqzarwmbeip.supabase.co
- **Stripe account:** acct_1T9F7lDdBlDgOLr3 (shared with ImporterIQ and MarginIQ)
- **WordPress.org slug:** `shippingiq-freight-rates-for-woocommerce`
- **Stack:** React (CRA), JavaScript (not TypeScript) + Supabase

## Dev Rules
- Run `setopt NO_BANG_HIST` at start of every new terminal session
- One terminal command at a time — wait for output.
- Always use Claude Code for file changes — never copy/paste.
- Never deploy unless Dave explicitly says to.
- Never rename `woocommerce-plugin/shippingiq/` folder — broke a local WordPress install (7 May 2026).

## Session Start
```bash
cd ~/Downloads/shippingiq && git pull && npm start
```

## Build & Deploy
```bash
cd ~/Downloads/shippingiq
npm run build                 # outputs build/ folder
git add -A && git commit -m "description" && git push
```
Drag `build/` (not `dist/`) to app.netlify.com → neon-pie-9a1542 → Deploys.

## Edge Function Deploys
```bash
npx supabase functions deploy rapid-api --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy calculate-freight --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy convert-pdf-to-csv --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy invite-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy remove-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-checkout-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy stripe-webhook --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-portal-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
```
All edge functions deployed with `--no-verify-jwt`.

## WooCommerce Plugin
- Plugin folder: `woocommerce-plugin/shippingiq/`
- WP.org slug: `shippingiq-freight-rates-for-woocommerce` (live on WordPress.org as of May 2026)
- Plugin PHP name: `ShippingIQ — Freight Rates for WooCommerce`
- Text domain: `shippingiq-freight-rates-for-woocommerce`
- Class name: `ShippingIQ_Shipping_Method`
- `$this->id`: `shippingiq` (unchanged — do not change this)
- SVN: `~/shippingiq-svn/` — tag releases when updating plugin
- To rebuild zip after PHP changes:
  ```bash
  cd ~/Downloads/shippingiq/woocommerce-plugin && zip -r shippingiq.zip shippingiq/
  ```
  Then commit the new zip to GitHub (NOT in .gitignore).

## Source Layout
```
src/pages/
  Dashboard.js / Dashboard.css
  Carriers.js / Carriers.css
  Quote.js
  Rules.js
  Resources.js
  Team.js / Team.css
  PdfConverter.js / PdfConverter.css
  Settings.js
  Pricing.js
  BillingSuccess.js
  Landing.js / Landing.css
  Blog.js / Blog.css
  BlogPost.js
  SavedQuotes.js
  SignIn.js / SignUp.js / ForgotPassword.js / ResetPassword.js
  Terms.js / Privacy.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/
  rapid-api/index.ts
  calculate-freight/index.ts    ← DO NOT break this interface (WooCommerce plugin depends on it)
  convert-pdf-to-csv/index.ts
  invite-team-member/index.ts
  remove-team-member/index.ts
  create-checkout-session/index.ts
  stripe-webhook/index.ts
  create-portal-session/index.ts
woocommerce-plugin/shippingiq/
  shippingiq.php
  includes/class-wc-shipping-shippingiq.php
  readme.txt
```

## Critical Rules — DO NOT CHANGE
- Freight calculation engine lives in both `Quote.js` (client) and `calculate-freight/index.ts` (server). Keep both in sync.
- Three pricing models: Model A (weight break flat rate), Model B (basic + per kg), Model C (depot-to-depot). Do not change.
- `calculate-freight` API interface: `POST { postcode, items, merchant_id, orderValue?, hasExemptItem? }` → `{ results, carrierPriority }`. WooCommerce plugin depends on this.
- WooCommerce plugin folder name must stay as `shippingiq` — do not rename.

## Database (Supabase)
Tables: `profiles`, `merchants`, `carriers`, `quotes`, `upload_logs`
RLS: ENABLED on all tables with policies using `get_merchant_id()` and `get_user_role()` helper functions.
`handle_new_user` trigger: maintained manually in Supabase SQL editor (not in codebase). Must always include email field in both INSERT statements.

## Stripe Pricing
- Pro plan: `price_1TSRfXDdBlDgOLr3caF5T3GY` ($49/mo AUD)
- 14-day free trial, no credit card required

## Live Test Merchant
- ID: `176a2ac8-0085-457b-a042-a51e7708873c` (has carriers — confirmed live 2 May 2026)
