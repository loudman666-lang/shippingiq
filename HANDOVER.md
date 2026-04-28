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
- Test merchant ID: 176a2ac8-0085-457b-a042-a51e7708873c (merchant name: "My Store")

## What's built and working

### Landing page + Auth
- Landing page
- Auth: signup, signin, forgot password, reset password

### Dashboard (fully wired with real data as of 28 Apr 2026)
- Fetches active carriers only (status='active'), quote count, and last 5 recent quotes in parallel
- Four stat cards: Active Carriers, Total Rates (uses modelBRates.length for Model B carriers), Zones Covered, Quotes Generated
- Postcode warning banner: shown when any active carrier has no postcodeMap data — names the affected carriers, links to /carriers
- Quick actions: Add Carrier → /carriers, Get a Quote → /quote, View Rules → /rules
- Recent Quotes section: last 5 quotes showing postcode, item count, date, cheapest rate + carrier name (e.g. "$16.09 via Allied Express" or "FREE via Allied"). Each row links to /quote
- "View all saved quotes" link → /quote?savedQuotes=open (auto-opens saved panel after data loads)
- Your Carriers list: compact flex-row layout with inline active badge (not full-width bar)
- Sidebar avatar + display name: dynamic from profile.full_name with merchant.name fallback
- Merchant name shown as page subtitle via merchant.name (test merchant = "My Store")

### Carriers page
- Add carrier with 3 file uploads (rate card + zone file + optional surcharge doc)
- CSV, Excel, PDF all working
- AI parsing via Supabase edge function (rapid-api)
- Pricing model detection: Model A, B, C
- Origin depot selection after parsing
- Rate table display filtered to selected origin
- Surcharge extraction with auto thresholds from carrier documents
- Fuel levy % editable per carrier (stored in carriers.fuel_levy_pct)
- Surcharge Rules per carrier — five trigger types:
  - Off (manual) — won't calculate automatically
  - On — automatic (carrier triggers) — uses thresholds from rate card
  - On — automatic (my triggers / auto_override) — merchant-set thresholds with kg/cm inputs
  - On — per-item weight threshold (item_weight) — fires when any single item exceeds kg threshold
  - On — consignment weight threshold (consignment_weight) — fires when total weight exceeds kg threshold
  - Always — every quote
  - Off — never apply
  - Each option has a one-line plain English explanation below the dropdown
  - Overlength 4–8m and over 8m handled correctly; lower/upper bound inputs labelled correctly
- Carrier Limits section: eligibility weight/dim fields with two-paragraph explanation and StarTrack example
- Upload guardrails:
  - Hash check: same files → "Files unchanged — using existing analysis." (no AI call)
  - Re-upload confirmation modal when carrier name matches existing active carrier
  - Rate limit: 10 uploads per 24 hours (upload_logs table); blocked with clear error message
  - Admin override: merchants.upload_limit_exempt = true bypasses rate limit
  - Form inputs disabled after analysis completes until Save or Cancel
- Analysis progress steps: 'Reading files...' → 'Building postcode map...' → 'Analysing rates — this takes 20–40 seconds...' → 'Extracting surcharges...' → 'Done.'
- Carrier eligibility limits UI — maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm saved to carriers.eligibility_rules
  - Zero values = no limit (bug fixed — was incorrectly excluding all carriers when any limit was 0)
- Dynamic sidebar avatar across all pages (see Dashboard note above)

### Get a Quote page
- Multi-item with qty, dimensions per item
- Cubic weight calculation; chargeable = MAX(actual, cubic)
- Full calculation chain: base freight + fuel levy + surcharges + margin + GST
- Surcharge triggers: auto, auto_override, item_weight, consignment_weight, always, never
  - item_weight: tested with Tail Lift at 30kg threshold — working
  - consignment_weight: tested — working
- POA surcharges flagged as warnings
- Free shipping — 3-step logic:
  1. Order value >= threshold? No → normal freight
  2. Any exempt item? Yes → normal freight
  3. Any surcharges triggered?
     - Smart mode: free shipping voided → normal freight + surcharges (tested and working)
     - True mode: always $0, surcharges ignored (tested and working)
     - No surcharges → free shipping, $0
- Exempt from free shipping per item: checkbox inside item row (conditional on freeShippingEnabled)
- Quote results — compact table + detail panel layout (as of 28 Apr 2026):
  - Compact table at top: one row per carrier (name/service, zone, chargeable weight, price)
  - Sorted: FREE first → cheapest paid → errors at bottom
  - FREE badge (green pill) in price column; "Cheapest" badge on cheapest paid carrier
  - "Cheapest" badge hidden when any FREE result exists
  - Clicking a row updates the detail breakdown below
  - Detail panel: full formula, fuel levy, surcharges, GST breakdown for selected carrier
  - FREE carrier detail panel: shows full merchant cost breakdown with "absorbed by you" note (uses originalRate preserved at calculation time; merchant cost shown in red)
  - Error rows show reason inline; selecting shows error card below
  - Price column header: "Total" with "inc GST"/"ex GST" sub-note below each price
- Saved quotes panel: "Saved Quotes" button top-right; auto-opens when navigating from Dashboard via /quote?savedQuotes=open (opens after fetchSavedQuotes resolves — timing fixed)
- Save Quote to Supabase quotes table

### Settings page
- GST toggle: Ex GST (B2B default) or Inc GST (B2C)
- Note: applies to Get a Quote page only — WooCommerce handles GST via its own tax settings

### Rules page
- Free shipping threshold with on/off toggle
- Free shipping mode: Smart (surcharges void free shipping) / Always Free (always $0) — radio toggle, saved to merchants.rules.freeShippingMode
- shippingiq-exempt WooCommerce tag documented inline with tip about bulky items
- Freight margin: none / percentage / flat amount
- Carrier priority: drag-to-reorder (arrows), stale closure bug fixed, new carriers appended at bottom

### WooCommerce plugin (woocommerce-plugin/shippingiq/)
- Standard WC shipping method, registers as "ShippingIQ" in WC shipping zones
- Calls calculate-freight edge function: POST { postcode, items, merchant_id }
- Auth via apikey + Authorization: Bearer headers (Supabase anon key)
- Fetches carriers.eligibility_rules from Supabase REST API; excludes carriers where any item exceeds limits (limit > 0 only — zero = no limit)
- Product tag rules: shippingiq-only-[carrier-slug] and shippingiq-exclude-[carrier-slug]
- Three display modes (all tested with Allied Express):
  - all: all eligible carriers sorted by ShippingIQ carrier priority order
  - cheapest: lowest cost carrier only
  - priority: top-ranked carrier that services the postcode
- calculate-freight returns carrierId per result + carrierPriority array — plugin sorts without extra Supabase query
- Always uses totalCost (ex-GST) from API — WooCommerce handles tax independently
- error_log() debug logging throughout — tail wp-content/debug.log to trace
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
Tables: profiles, merchants, carriers, quotes, upload_logs
RLS: DISABLED on all tables (dev only — enable before go-live)

merchants.settings: jsonb — { gstEnabled: true/false }
merchants.rules: jsonb — { freeShippingEnabled, freeShippingThreshold, freeShippingMode ('smart'|'true'), freightMarginType, freightMarginValue, carrierPriority[] }
merchants.upload_limit_exempt: boolean — if true, bypasses 10/day upload rate limit

carriers.fuel_levy_pct: numeric
carriers.surcharge_rules: jsonb — { surcharge_key: { trigger, weightKg, lengthCm } }
  trigger values: 'manual' | 'auto' | 'auto_override' | 'item_weight' | 'consignment_weight' | 'always' | 'never'
  item_weight and consignment_weight use weightKg field for threshold
carriers.parsed_data: full AI output — includes postcodeMap, modelBRates (Model B), surcharges with autoWeightKg/autoLengthMinCm/autoLengthMaxCm/autoTrigger, originDepots, selectedOrigin, fileHash
carriers.eligibility_rules: jsonb — { maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm } (0 = no limit)

upload_logs: merchant_id, created_at — one row per upload attempt; rate limit checks last 24h

## File parsing architecture (browser-first)

### How parsing works
1. All files (rate card, zone file, surcharge doc) parsed entirely in the browser using SheetJS (XLSX via esm.sh)
2. Browser scans ALL tabs of ALL uploaded files for ALL data types regardless of upload slot
3. postcodeMap built entirely in browser — never sent to AI. Saved directly to Supabase in parsed_data.postcodeMap
4. Two focused AI calls to rapid-api:
   - `mode: 'rates'` — structure only: pricingModel, originDepots, columnMap, cubicFactor, fuelLevyPct (~200 tokens for Model B)
   - `mode: 'surcharges'` — surcharge extraction with auto-trigger thresholds
5. Browser builds modelBRates from compact CSV using Claude's columnMap (no token limits)
6. Model A/C: Claude returns weightBreaks, zones, rates/modelCRates directly

### Why this architecture
- Allied Express zone file = 16,000+ rows — too large for AI
- Allied Express rate card = 84 zones × 5 depots = 420+ combinations — AI hits token limit
- Tested: 880 rates, 23 surcharges, 2,688 postcodes, 5 depots — all correct

### Key browser parsing functions (Carriers.js)
- `scanExcelBytes(XLSX, bytes)` — scans all sheets, returns {postcodeRows, rateTexts, surchargeTexts}
- `scanCsvText(text, fileName)` — same for CSV
- `parseZoneSheetToObjects(rows, sheetName)` — detects header row (rows 0–20), maps postcode/zone/suburb/state
- `extractSurchargeText(rows, sheetName)` — keyword detection
- `buildModelBRatesFromCSV(rateText, structure)` — uses columnMap to extract all rate rows
- `deduplicatePostcodeMap(allRows)` — first-write-wins, keyed by postcode
- `looksLikePostcode(val)` — handles JS number (200–9999) and string '0200'–'9999'
- `computeFileHash(files)` — name:size:lastModified fingerprint for hash check

### Allied Express sheet details (for debugging)
- Zone file sheet: "AOE Matrix"; headers mid-sheet (not row 0); zone column = "G Zone"
- Rate card: origin depots as column headers, zoneCode/zone columns on left

## Edge Functions

### rapid-api
Mode 'rates': returns pricingModel, service, originDepots, cubicFactor, fuelLevyPct, summary, warnings, zoneCodeCol, zoneNameCol, columnMap (B), weightBreaks + zones + rates (A), modelCRates (C)
Mode 'surcharges': returns { surcharges: [...] } with autoWeightKg, autoLengthMinCm, autoLengthMaxCm, autoTrigger
Model: claude-sonnet-4-20250514, max_tokens: 4000 (rates), 8000 (surcharges)
rateText capped at 8000 chars before sending

### calculate-freight
POST { postcode, items, merchant_id, orderValue? (default 0), hasExemptItem? (default false) }
- orderValue and hasExemptItem are optional — WooCommerce plugin doesn't send them (defaults apply)
- Fetches active carriers + merchant rules from Supabase
- Runs calculateRate across all carriers
- Applies free shipping logic server-side (same 3-step flow as Quote.js)
- Returns { results: [...], carrierPriority: [...] }
- Each result includes carrierId for WooCommerce priority sorting
- postcodeEntry uses `suburb || locality` fallback (old carriers used locality)
- DO NOT break this interface — WooCommerce plugin depends on it

## Freight calculation engine
Lives in Quote.js (client-side) AND calculate-freight/index.ts (server-side)
IMPORTANT: Keep both in sync — if engine logic changes, update both files

Multi-item: qty + weight + L/W/H per item
Chargeable = MAX(actual, cubic)
Model B: MAX(basicCharge + chargeable × perKgRate, minimumCharge)
Surcharge triggers: auto, auto_override, item_weight, consignment_weight, always, never
  - item_weight: fires if maxItemWeight > rule.weightKg
  - consignment_weight: fires if totalWeight > rule.weightKg
  - auto_override: uses rule.weightKg (consignment) and rule.lengthCm (overlength)
Overlength 4–8m: 400–800cm range; over 8m: >800cm, POA warning
Full chain: freight + fuel levy + surcharges + margin + GST
Free shipping: 3-step (threshold → exempt → surcharges), smart vs true mode

## THREE PRICING MODELS — DO NOT CHANGE
Model A: Weight break table — flat rate per zone per weight range
Model B: Basic + per kg — MAX(basic + weight × rate, minimum)
Model C: Depot-to-depot — Mainfreight style

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Single origin warehouse to start (multi-warehouse logged for future)
- Fuel levy editable per carrier, not baked into rates
- GST configurable: ex GST (B2B) or inc GST (B2C) — Quote page only; WooCommerce uses its own tax
- Surcharges NOT shown to customer — merchant sees full breakdown only
- Customer sees one clean freight total
- Auto surcharge triggers use carrier's own extracted thresholds
- Free shipping can be exempted per product/item

## Known merchant education points
- Postcode zone file is required — without it the carrier cannot calculate any quotes. App shows a persistent warning on carrier cards and Dashboard banner. Merchants must upload a zone file, not just a rate card.
- Some carriers (including StarTrack) don't publish postcode zone files publicly. Merchants must contact their account manager and ask specifically for a postcode-to-zone mapping file (CSV or Excel).
- StarTrack Fixed Price Premium is Model A (weight break flat rate), not Model B. AI correctly detects this. Both services can coexist in the same carrier.

## WooCommerce Plugin — design decisions
### Carrier eligibility at checkout
1. Weight/dimension limits (carriers.eligibility_rules): maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm — if any cart item exceeds limit, carrier excluded. 0 = no limit.
2. Product tags (WooCommerce): shippingiq-only-[slug] and shippingiq-exclude-[slug]
3. Logic: passes dim/weight check AND no exclusion tag

### Plugin settings (WooCommerce admin)
- API URL (calculate-freight endpoint), Merchant ID, Display mode (all/cheapest/priority)

### Philosophy
- Simple by default: add carrier, upload files, done
- Rules only for exceptions
- "My carriers handle everything unless I say otherwise"

### Split shipment — parked for v2

## What to build next
1. Team page — multi-user setup for merchant account (invite team members, role management)
2. Template downloads — downloadable sample CSV/Excel templates for rate cards and zone files; helps merchants whose carriers don't provide machine-readable files
3. Production deployment prep — remove error_log() calls from WooCommerce plugin, enable WC rate caching, enable Supabase RLS, review security before go-live
4. Settings page — add merchant name edit field (current merchant name "My Store" is set at signup and cannot be changed from within the app)

## Logged for future build
- Saved quotes: currently shows list (postcode, item count, date, cheapest rate + carrier) on Dashboard and Quote page. Needs full order management — click to reload all items/postcode/results into quote form, edit and re-quote, print/export as PDF.
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Edit carrier without deleting (re-upload files to update rates)
- Multi-warehouse / multi-origin support
- Delivery requirement flags for customers (e.g. tailgate notice at checkout)
- Carrier rate editing without full delete and re-upload
- Split shipment across carriers when no single carrier handles full cart
- Carrier-per-product mapping (v2 of eligibility rules)
- Shared engine module in supabase/functions/_shared/ so Quote.js and calculate-freight stay in sync automatically
- Platform-agnostic product exemption flags: WooCommerce uses product tags (shippingiq-exempt etc). When Shopify/Magento plugins are built, design calculate-freight API to accept flags array per cart item (["exempt", "taillift", "2person"]) so the platform plugin handles translation.

## Pre-launch testing checklist

### Upload guardrails
- [ ] Hash check: delete a carrier, re-upload same files, click Analyse — should show "Files unchanged — using existing analysis." with no AI call
- [ ] Rate limit: upload 11 carriers within 24h — 11th blocked with "Daily upload limit reached (10/day)..."
- [ ] Admin override: `UPDATE merchants SET upload_limit_exempt = true WHERE id = '[id]'` — 11th upload should succeed
- [ ] Re-upload confirm: enter same carrier name as existing active carrier, upload files, click Analyse — confirmation modal appears
- [ ] Disable after analysis: carrier name + file inputs greyed out after analysis completes until Save or Cancel

### Freight calculation
- [ ] Quote with postcode in zone file returns correct rate (Model B: verify basic + per-kg formula)
- [ ] Quote with unknown postcode returns clear error, not crash
- [ ] Fuel levy % applies correctly
- [ ] Surcharge auto-triggers fire correctly (weight threshold, length range)
- [ ] item_weight trigger fires when single item exceeds threshold
- [ ] consignment_weight trigger fires when total weight exceeds threshold
- [ ] Smart free shipping: surcharge voids free shipping
- [ ] True free shipping: always $0 regardless of surcharges
- [ ] GST toggle: ex-GST vs inc-GST totals correct
- [ ] FREE carrier detail shows merchant cost, not $0

### WooCommerce plugin
- [ ] Rates appear at checkout for a real cart
- [ ] Carrier eligibility filtering excludes carriers where item exceeds maxWeightKg/maxLengthCm
- [ ] Product tag shippingiq-only-[slug] restricts to that carrier
- [ ] Product tag shippingiq-exclude-[slug] removes that carrier
- [ ] Cheapest-only display mode shows single lowest rate
- [ ] Priority display mode shows top-ranked carrier only

### Production readiness
- [ ] Remove all error_log() calls from WooCommerce plugin
- [ ] Enable Supabase RLS on all tables
- [ ] Enable WooCommerce rate caching

## Test files available
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows, Model C depot-to-depot
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne
