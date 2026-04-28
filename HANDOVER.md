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
  - Surcharge Rules per carrier: Off / On-auto (carrier triggers) / On-auto (my triggers) / Always / Never
  - Surcharge rules UI: plain English labels, one-line explanations per option, overlength inputs labelled correctly
  - Analysis progress message and spinner
  - Progress steps: 'Reading files...' → 'Building postcode map...' → 'Analysing rates — this takes 20–40 seconds...' → 'Extracting surcharges...' → 'Done.'
- Get a Quote page:
  - Multi-item with qty, dimensions per item
  - Cubic weight calculation
  - Full calculation chain: base freight + fuel levy + surcharges + GST
  - Surcharges auto-applied based on weight and dimension triggers
  - Item weight trigger: fires when any single item exceeds threshold kg (tested with Tail Lift at 30kg)
  - Consignment weight trigger: fires when total consignment weight exceeds threshold kg
  - POA surcharges flagged as warnings
  - Free shipping threshold applied (green FREE card shown)
  - Order value field for free shipping check
  - Exempt from free shipping per item — checkbox inside item row, conditional on freeShippingEnabled (tested and working)
  - Free shipping logic: 3-step flow — threshold check → exempt items → surcharge triggers per carrier
  - Smart free shipping mode: if any surcharge triggers, free shipping voided, normal freight + surcharges charged (tested and working)
  - True free shipping mode: always $0 regardless of surcharges (tested and working)
  - Quote results sorted cheapest first; error results (postcode not found) shown at bottom; free shipping ($0) at top
  - Save Quote to Supabase quotes table
- Settings page: GST toggle (ex GST B2B, inc GST B2C)
- Rules page: free shipping threshold, freight margin, carrier priority
  - Carrier priority: arrows reorder correctly (stale closure bug fixed), all active carriers shown (new carriers appended at bottom)
  - Free shipping: shippingiq-exempt tag documented inline with tip about bulky items
  - Free shipping mode: Smart / Always Free radio toggle saved with merchant rules
- Carrier eligibility limits UI — weight/dim limit fields per carrier on Carriers page, saved to carriers.eligibility_rules
  - Zero values correctly treated as no limit (bug fixed — was incorrectly excluding all carriers when any limit was set to 0)
- WooCommerce plugin at woocommerce-plugin/shippingiq/:
  - Standard WC shipping method, registers as "ShippingIQ" in WC shipping zones
  - Calls calculate-freight edge function with postcode + items + merchant_id
  - Auth via apikey + Authorization: Bearer headers (Supabase anon key) — required for edge function calls without user JWT
  - Fetches carriers.eligibility_rules from Supabase REST API, excludes carriers where any item exceeds limits (limit > 0 only)
  - Product tag rules: shippingiq-only-[carrier-slug] and shippingiq-exclude-[carrier-slug]
  - Three display modes (tested and working with Allied Express):
    - all: all eligible carriers sorted by ShippingIQ priority order
    - cheapest: lowest cost carrier only
    - priority: top-ranked carrier that services the postcode
  - calculate-freight returns carrierId per result + carrierPriority array — plugin sorts without extra query
  - error_log() debug logging throughout calculate_shipping — tail wp-content/debug.log to trace
  - PHP 8.2 compatible — explicit property declarations, no return type on WC method overrides
  - Allied Express tested end-to-end at WooCommerce checkout — correct rates confirmed

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

## File parsing architecture (browser-first, as of April 2026)

### How parsing works
1. All files (rate card, zone file, surcharge doc) are parsed entirely in the browser using SheetJS (XLSX via esm.sh)
2. Browser scans ALL tabs of ALL uploaded files for ALL data types — zone data, rate data, surcharge data — regardless of which upload slot the file came from
3. postcodeMap is built entirely in the browser. It is NEVER sent to the edge function. It is saved directly to Supabase in parsed_data.postcodeMap
4. Two focused AI calls to rapid-api:
   - `mode: 'rates'` — structure-only: Claude identifies pricingModel, originDepots, columnMap (exact CSV column headers per depot), cubicFactor, fuelLevyPct. ~200 token response for Model B. max_tokens: 4000
   - `mode: 'surcharges'` — surcharge extraction: Claude returns {surcharges: [...]} with auto-trigger thresholds
5. Browser builds modelBRates from the compact CSV rate text using Claude's columnMap — no token limits, all rate rows extracted locally
6. For Model A/C: Claude still returns weightBreaks, zones, rates/modelCRates (smaller data set, fine to return in response)

### Why this architecture
- Allied Express zone file = 16,000+ rows — too large to send to any AI
- Allied Express rate card = 84 zones × 5 depots × 2 charges = 420+ combinations — AI hits token limit trying to return all rows
- Browser parsing has no timeout or token constraints
- Tested with Allied Express: 880 rates, 23 surcharges, 2,688 postcode entries, all 5 depots — all correct

### Key browser parsing functions (Carriers.js)
- `scanExcelBytes(XLSX, bytes)` — scans all sheets, returns {postcodeRows, rateTexts, surchargeTexts}
- `scanCsvText(text, fileName)` — same for CSV files
- `parseZoneSheetToObjects(rows, sheetName)` — detects header row (scans rows 0–20), maps postcode/zone/suburb/state columns
- `extractSurchargeText(rows, sheetName)` — keyword detection, returns CSV text or null
- `buildModelBRatesFromCSV(rateText, structure)` — uses structure.columnMap to extract all rate rows from compact CSV text
- `deduplicatePostcodeMap(allRows)` — first-write-wins Map keyed by postcode
- `looksLikePostcode(val)` — handles JS number type (200–9999) and string '0200'–'9999'

### Allied Express sheet details (for debugging)
- Zone file sheet name: "AOE Matrix"
- Headers are NOT in row 0 — they appear mid-sheet; parseZoneSheetToObjects scans rows 0–20 to find them
- Zone code column is called "G Zone" — included in zoneCodeCol keyword list
- Rate card: origin depots appear as column headers; zoneCode/zone columns on left

## Edge Functions
### rapid-api
Mode: 'rates' — returns structure only: pricingModel, service, originDepots, cubicFactor, fuelLevyPct, summary, warnings, zoneCodeCol, zoneNameCol, columnMap (Model B), weightBreaks + zones + rates (Model A), modelCRates (Model C)
Mode: 'surcharges' — returns {surcharges: [...]} with auto-trigger fields
Model: claude-sonnet-4-20250514, max_tokens: 4000 (rates), 8000 (surcharges)
rateText capped at 8000 chars before sending to Claude (browser sends compact extracted text only)

### calculate-freight
POST { postcode, items, merchant_id }
Fetches active carriers + merchant rules from Supabase
Runs calculateRate across all carriers
Returns { results: [...] }
Used by WooCommerce plugin — do not break this interface
Note: postcodeEntry uses `suburb || locality` fallback (old carriers used locality field name)

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

## Known merchant education points
- Postcode zone file is required — without it the carrier cannot calculate any quotes. The app shows
  a persistent warning on any active carrier card with no postcode data. Merchants must upload a zone
  file when adding a carrier, not just a rate card.
- Some carriers (including StarTrack) do not publish postcode zone files publicly. Merchants need to
  contact their account manager and ask specifically for a postcode-to-zone mapping file (CSV or Excel).
  This is a common blocker — raise it early when onboarding new merchants.
- StarTrack Fixed Price Premium service is Model A (weight break flat rate), not Model B. The AI
  correctly detects this and may flag it as a warning in the parse results. This is expected — both
  services can coexist in the same carrier. The rate card just has two different pricing structures.

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
1. Template downloads for merchants without carrier files — downloadable sample CSV templates showing the expected format for rate cards and zone files. Helps merchants who don't have files in the right shape yet, or whose carriers don't provide machine-readable files
2. Production deployment prep — remove error_log() debug calls from plugin, enable WooCommerce rate caching, review Supabase RLS before go-live

## Logged for future build
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Saved quotes: currently shows a list of saved quotes with postcode, item count, date and cheapest rate (on both Dashboard and Quote page). Needs to be rebuilt as full order management — click a saved quote to reload all items, postcode and results into the quote form, allow editing and re-quoting, print/export as PDF quote document.
- Edit carrier without deleting (re-upload files)
- Multi-warehouse / multi-origin support
- Delivery requirement flags for customers (e.g. tailgate notice at checkout)
- Carrier rate editing without full delete and re-upload
- Split shipment across carriers when no single carrier can handle full cart
- Carrier-per-product mapping (v2 of eligibility rules)
- Shared engine module in supabase/functions/_shared/ so Quote.js and calculate-freight stay in sync automatically
- Platform-agnostic product exemption flags: currently free shipping exemption and surcharge triggers use WooCommerce product tags (shippingiq-exempt, shippingiq-taillift etc). When Shopify and Magento plugins are built, equivalent mechanisms needed — Shopify uses product tags (same concept, compatible), Magento uses product attributes. Design the calculate-freight API to accept an array of flags per cart item (e.g. ["exempt", "taillift", "2person"]) so the platform plugin handles the translation and the API stays platform-agnostic.

## Pre-launch testing checklist

### Upload guardrails
- [ ] Hash check: delete a carrier, re-upload the same files, click Analyse a second time — should show green "Files unchanged — using existing analysis." with no AI call made
- [ ] Rate limit: upload 11 carriers within 24 hours — the 11th should be blocked with "Daily upload limit reached (10/day)..."
- [ ] Admin override: run `UPDATE merchants SET upload_limit_exempt = true WHERE id = '[id]'` in Supabase SQL Editor, then attempt an 11th upload — rate limit should be bypassed
- [ ] Re-upload confirm: upload a carrier, then click "+ Add Carrier" and enter the same carrier name, upload files and click Analyse — confirmation modal should appear before proceeding
- [ ] Disable after analysis: after clicking Analyse and analysis completes, confirm carrier name field and all file inputs are greyed out until Save or Cancel is clicked

### Freight calculation
- [ ] Quote with postcode in zone file returns correct rate (Model B: verify basic + per-kg formula)
- [ ] Quote with postcode not in zone file returns a clear error, not a crash
- [ ] Fuel levy % applies correctly to freight cost
- [ ] Surcharge auto-triggers fire correctly (weight threshold, length range)
- [ ] Free shipping threshold shows FREE card when order value >= threshold
- [ ] GST toggle: ex-GST vs inc-GST totals correct

### WooCommerce plugin
- [ ] Rates appear at checkout for a real cart
- [ ] Carrier eligibility filtering excludes carriers where item exceeds maxWeightKg/maxLengthCm
- [ ] Product tag shippingiq-only-[carrier-slug] restricts to that carrier only
- [ ] Product tag shippingiq-exclude-[carrier-slug] removes that carrier from results
- [ ] Cheapest-only display mode shows single lowest rate

### Production readiness
- [ ] Remove all error_log() debug calls from WooCommerce plugin
- [ ] Review Supabase RLS — currently disabled (dev only), enable before go-live
- [ ] Enable WooCommerce rate caching in plugin settings

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
