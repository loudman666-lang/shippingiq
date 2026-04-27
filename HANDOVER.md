# ShippingIQ — Handover Document

## How to start the next session
1. Go to github.com/loudman666-lang/shippingiq
2. Click HANDOVER.md -> Raw -> Select all -> Copy
3. Open new Claude chat
4. Paste and say: "I'm Dave Bishop, read this handover and pick up where we left off"

## Session start — run this every time
cd ~/Downloads/shippingiq && git pull && npm start

## After every build — run this every time
cd ~/Downloads/shippingiq && git add -A && git commit -m "description" && git push

## Supabase edge function deploy — run when edge function changes
npx supabase functions deploy rapid-api --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy calculate-freight --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq

## Tool preference — ALWAYS USE CLAUDE CODE
- Use Claude Code (claude command in terminal) for all file changes
- Use this chat for planning, architecture, and decisions only
- Claude Code reads/writes files directly — no copy/paste needed

## App access
- Local: http://localhost:3000
- GitHub: github.com/loudman666-lang/shippingiq
- Supabase: soaxvqkkecqzarwmbeip.supabase.co

## Dave's working preferences — NEVER CHANGE
- Dave is time-poor. Keep explanations short.
- Always provide exact terminal commands. Never assume Dave will remember git commands.
- Always use Claude Code for file changes — never manual copy/paste
- Always remind Dave to run git commit after every build.
- Never question the core product plan. Never suggest rethinking agreed decisions.
- When a layout fix fails twice, stop and diagnose properly before trying again.

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq

## What's built and working
- Landing page
- Auth (signup, signin, forgot password, reset password)
- Dashboard
- Carriers page:
  - Add carrier with 3 file uploads (rate card + zone file + optional surcharge doc)
  - CSV, Excel, PDF all working
  - AI parsing via Supabase edge function (rapid-api)
  - Pricing model detection: Model A, B, C
  - Origin depot selection after parsing
  - Rate table display filtered to selected origin
  - Surcharge extraction with auto thresholds from carrier documents
  - Fuel levy % editable per carrier (stored in carriers.fuel_levy_pct)
  - Surcharge Rules per carrier: Manual / Auto / Auto with override
  - Analysis progress message and spinner
- Get a Quote page:
  - Multi-item with qty, dimensions per item
  - Cubic weight calculation
  - Full calculation chain: base freight + fuel levy + surcharges + GST
  - Surcharges auto-applied based on weight and dimension triggers
  - POA surcharges flagged as warnings
  - Free shipping threshold applied (green FREE card shown)
  - Order value field for free shipping check
  - Exempt from free shipping per item — checkbox inside item row, conditional on freeShippingEnabled
  - Save Quote to Supabase quotes table
- Settings page: GST toggle (ex GST B2B, inc GST B2C)
- Rules page: free shipping threshold, freight margin, carrier priority
- Carrier eligibility limits UI — weight/dim limit fields per carrier on Carriers page, saved to carriers.eligibility_rules
- WooCommerce plugin at woocommerce-plugin/shippingiq/:
  - Standard WC shipping method, registers as "ShippingIQ" in WC shipping zones
  - Calls calculate-freight edge function with postcode + items + merchant_id
  - Auth via apikey + Authorization: Bearer headers (Supabase anon key) — required for edge function calls without user JWT
  - Fetches carriers.eligibility_rules from Supabase REST API, excludes carriers where any item exceeds limits
  - Product tag rules: shippingiq-only-[carrier-slug] and shippingiq-exclude-[carrier-slug]
  - Display modes: all eligible carriers or cheapest only
  - error_log() debug logging throughout calculate_shipping — tail wp-content/debug.log to trace
  - PHP 8.2 compatible — explicit property declarations, no return type on WC method overrides

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/Quote.js
src/pages/Settings.js
src/pages/Rules.js
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/rapid-api/index.ts
supabase/functions/calculate-freight/index.ts
woocommerce-plugin/shippingiq/shippingiq.php
woocommerce-plugin/shippingiq/includes/class-wc-shipping-shippingiq.php
woocommerce-plugin/shippingiq/readme.txt

## Database (Supabase)
Tables: profiles, merchants, carriers, quotes
RLS: DISABLED on all tables (dev only)
merchants.settings: jsonb — { gstEnabled: true/false }
merchants.rules: jsonb — { freeShippingEnabled, freeShippingThreshold, freightMarginType, freightMarginValue, carrierPriority }
carriers.fuel_levy_pct: numeric
carriers.surcharge_rules: jsonb — { surcharge_key: { trigger, weightKg, lengthCm } }
carriers.parsed_data: full AI output including surcharges with autoWeightKg, autoLengthMinCm, autoLengthMaxCm, autoTrigger
carriers.eligibility_rules: jsonb — { maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm } (NEW — for WooCommerce carrier filtering)

## Edge Functions
### rapid-api
Extracts: pricingModel, zones, rates, postcodeMap, surcharges with auto thresholds, cubicFactor, fuelLevyPct
Model: claude-sonnet-4-20250514, max_tokens 8000
File types: csv (text decode), excel (XLSX via esm.sh), pdf (document block)

### calculate-freight
POST { postcode, items, merchant_id }
Fetches active carriers + merchant rules from Supabase
Runs calculateRate across all carriers
Returns { results: [...] }
Used by WooCommerce plugin — do not break this interface

## Freight calculation engine
Lives in both Quote.js (client-side) and calculate-freight/index.ts (server-side)
IMPORTANT: Keep both in sync — if engine logic changes, update both files
Multi-item: qty + weight + L/W/H per item
Chargeable = MAX(actual, cubic)
Model B: MAX(basicCharge + chargeable x perKgRate, minimumCharge)
Surcharge triggers: auto (carrier thresholds), auto_override (merchant thresholds), manual, always, never
Overlength 4-8m: auto-detects 400-800cm range
Overlength over 8m: auto-detects over 800cm, flags as POA warning
Full chain: freight + fuel levy + surcharges + margin + GST
Free shipping: if order value >= threshold AND no exempt items, show FREE

## THREE PRICING MODELS — DO NOT CHANGE
Model A: Weight break table — flat rate per zone per weight range
Model B: Basic + per kg — MAX(basic + weight x rate, minimum)
Model C: Depot-to-depot — Mainfreight style

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Single origin warehouse to start (multi-warehouse logged for future)
- Fuel levy editable per carrier, not baked into rates
- GST configurable: ex GST (B2B) or inc GST (B2C)
- Surcharges NOT shown to customer — merchant sees full breakdown only
- Customer sees one clean freight total
- Auto surcharge triggers use carrier's own extracted thresholds
- Free shipping can be exempted per product/item

## WooCommerce Plugin — design decisions (BUILT)
### Carrier eligibility — how carriers are filtered at checkout
1. Weight/dimension limits per carrier (set in ShippingIQ, stored in carriers.eligibility_rules)
   - maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm
   - If any cart item exceeds a carrier's limit, that carrier is excluded
   - No limits set = carrier handles everything (default)
2. Product tags as override (set in WooCommerce on the product)
   - Tag format: shippingiq-only-[carrier-slug] e.g. shippingiq-only-startrack
   - Tag format: shippingiq-exclude-[carrier-slug] e.g. shippingiq-exclude-allied
   - Tags override weight/dim rules
3. Logic: carrier passes dim/weight check AND no exclusion tag overrides it

### Plugin settings (in WooCommerce admin)
- ShippingIQ API URL (calculate-freight endpoint)
- Merchant ID
- Display mode: All eligible carriers | Cheapest only | Selected carriers

### Philosophy
- Simple by default: add carrier, upload files, done — no rules required
- Rules only for exceptions: set limits only when a carrier can't handle something
- Merchant mental model: "My carriers handle everything unless I say otherwise"

### Split shipment
- Parked for future — not in v1
- Rare edge case given large carriers handle all sizes

## What to build next
1. Test WooCommerce plugin end-to-end with real carrier data — verify rates appear at checkout, eligibility filtering works, tag overrides work
2. Production deployment prep — remove error_log() debug calls from plugin, enable WooCommerce rate caching, review Supabase RLS before go-live

## Logged for future build
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Saved quotes: rebuild properly as part of order management with full details, reload, print/export
- Edit carrier without deleting (re-upload files)
- Multi-warehouse / multi-origin support
- Delivery requirement flags for customers (e.g. tailgate notice at checkout)
- Carrier rate editing without full delete and re-upload
- Split shipment across carriers when no single carrier can handle full cart
- Carrier-per-product mapping (v2 of eligibility rules)
- Shared engine module in supabase/functions/_shared/ so Quote.js and calculate-freight stay in sync automatically

## Test files available
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate real carrier data for Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (examples only — AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows, Model C depot-to-depot
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne
