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
npx supabase functions deploy convert-pdf-to-csv --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy invite-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy remove-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-checkout-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy stripe-webhook --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-portal-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq

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

### Landing page
- Live at / route (Landing.js + Landing.css)
- Sections: Nav → Hero → Stats strip → Trust strip → Integrations → How the AI works → Two ways to use it → AI parser mockup → Features → Pricing → FAQ → CTA → Footer
- Mobile responsive (breakpoints at 900px and 560px)
- All CTAs link to /signup and /signin via React Router
- Shopify/Magento/BigCommerce marked as coming soon
- Pricing tiers reflect only built features

### Auth
- Auth: signup, signin, forgot password, reset password

### Dashboard (fully wired with real data as of 28 Apr 2026)
- Fetches active carriers only (status='active'), quote count, and last 5 recent quotes in parallel
- Four stat cards: Active Carriers, Total Rates (uses modelBRates.length for Model B carriers), Zones Covered, Quotes Generated
- Postcode warning banner: shown when any active carrier has no postcodeMap data — names the affected carriers, links to /carriers
- First-login banner: shown when profile is loaded and full_name is blank — yellow, same style as postcode warning, links to /settings, dismissible (state only, no persist)
- Quick actions: Add Carrier → /carriers, Get a Quote → /quote, View Rules → /rules
- Recent Quotes section: last 5 quotes showing postcode, item count, date, cheapest rate + carrier name (e.g. "$16.09 via Allied Express" or "FREE via Allied"). Each row links to /quote
- "View all saved quotes" link → /quote?savedQuotes=open (auto-opens saved panel after data loads)
- Your Carriers list: compact flex-row layout with inline active badge (not full-width bar)
- Sidebar avatar + display name: dynamic from profile.full_name with merchant.name fallback
- Merchant name shown as page subtitle via merchant.name (test merchant = "My Store")

### Team page
- Live at /team route (Team.js + Team.css)
- Shows list of team members with avatar, name, join date, role badge (admin = orange, member = grey)
- Current user marked with (You) indicator
- Invite form: email input + Send invite button — fully working including acceptance flow
- Calls invite-team-member edge function (deployed to Supabase)
- Friendly error messages: "already registered" vs generic error
- Remove button: visible to admins only, hidden on own row. Confirm dialog → calls remove-team-member edge function → refreshes list on success. Friendly error for last-admin protection.
- Sign out button in sidebar footer (icon + "Sign out" text)
- Nav: appears between Resources and Settings, visible to admin users only

### invite-team-member edge function
- POST { email, merchantId, role } → calls supabase.auth.admin.inviteUserByEmail with merchant_id and role in user_metadata
- Requires SUPABASE_SERVICE_ROLE_KEY in edge function secrets (confirmed present)
- Returns { user } on success, { error } on failure

### remove-team-member edge function
- POST { userId, merchantId } — requires Authorization header (caller's JWT)
- Verifies caller is admin for the same merchantId (checks profiles table via admin client)
- Confirms target user belongs to same merchant
- Rejects self-deletion; rejects removing last admin (counts admins for merchant)
- Calls supabaseAdmin.auth.admin.deleteUser(userId)
- Returns { success: true } or { error: '...' }

### handle_new_user Supabase trigger
- Fires on auth.users INSERT
- Checks raw_user_meta_data for merchant_id — if present, links invited user to existing merchant
- If no merchant_id, creates new merchant and sets role to admin
- Inserts into profiles: id, full_name, email, merchant_id, role
- Function confirmed updated with email field (was missing, caused "Database error saving new user")

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
- Carrier Limits section: eligibility weight/dim fields with two-paragraph explanation and generic example (no carrier names)
- Cubic Weight Factor displayed on carrier card and during upload. Editable inline. Help text explains standard is 250 (L × W × H ÷ 4,000) — only change if carrier contract specifies otherwise.
- Edit Rates button on each carrier card — re-upload files to update rates without deleting. Same two-step analyse → save flow. On save, updates parsed_data only — preserves fuel_levy_pct, eligibility_rules. After save, modal prompts merchant to keep existing surcharge rules or reset to new surcharges from uploaded files.
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
- **Manual postcode range entry** — carrier card "Postcode Ranges" / "Edit Ranges" button (always visible). Opens modal with two tabs: "Upload zone file" (disabled) and "Enter ranges manually" (active). Modal shows zones from rate card (pulled live from parsed_data), grid of From/To/Zone rows with row-level validation, live postcode count display, and Save Ranges → writes both `postcodeMap` and `manualPostcodeRanges` to `carriers.parsed_data`. Zone file upload in the add-carrier form is now optional (label says "optional — or enter postcode ranges manually after saving").
- **No zone file badge** — amber pill "No zone file" shown next to carrier name when postcodeMap is empty.

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
- Save Quote to Supabase quotes table with optional reference/name field

### Saved Quotes
- Dedicated page at /saved-quotes — lists all saved quotes with Load and Delete buttons
- Optional reference/name field when saving — shown as primary label on Saved Quotes page and Dashboard
- Load button navigates to Get a Quote with form, items and results pre-populated
- Yellow banner on Get a Quote shows reference name + date when a quote is loaded
- Calculate Freight clears the banner and recalculates fresh rates
- Dashboard "Recent Quotes" shows reference as primary label when set
- "View all saved quotes" on Dashboard links to /saved-quotes
- Saved Quotes nav link on all pages
- quotes table: id, merchant_id, postcode, items (jsonb), results (jsonb), reference (text), created_at

### Billing (Stripe)
- Stripe account: acct_1T9F7lDdBlDgOLr3 (shared with ImporterIQ and MarginIQ)
- Three edge functions deployed: create-checkout-session, stripe-webhook, create-portal-session
- Stripe products: Starter $39/mo, Growth $79/mo, Pro $149/mo (AUD, recurring)
- 14-day free trial, no credit card required (payment_method_collection: if_required)
- Webhook endpoint registered: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/stripe-webhook
- Webhook events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- merchants.subscription jsonb column stores: tier, status, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_ends_at
- Tier values: free | starter | growth | pro
- Status values: active | trialing | past_due | canceled
- AuthContext: planTier reads from merchant.subscription.tier (defaults to 'free')
- Billing page at /pricing — 4-plan pricing grid, upgrade buttons, current plan banner, manage billing portal link
- BillingSuccess page at /billing/success — auto-redirects to dashboard after 4 seconds
- Billing nav link on all pages (admin only)
- STRIPE_SECRET_KEY: new key created (not the original sk_live — original couldn't be copied, new key created via "+ Create secret key")
- Feature limits per tier: Free=1 carrier, Starter=3, Growth=10, Pro=unlimited. Rate Card Converter: Growth+ only. Team members: Free/Starter=1, Growth=3, Pro=unlimited.

### Legal
- Terms of Service, Privacy Policy, and Refund & Cancellation Policy modals
- Component: src/components/LegalModals.js — TermsModal, PrivacyModal, RefundModal
- Accessible from Landing page footer (3 buttons) and Settings page (Legal card)
- Modals close on × button or clicking outside
- Australian law compliant — Privacy Act 1988, Australian Consumer Law, Victorian jurisdiction
- Support email: support@shippingiq.com.au (not yet set up)

### Resources page
- Template Files section: 3 downloadable CSVs (rate-card-template.csv, zone-file-template.csv, surcharge-template.csv) served from /public/templates/
- Getting Your Carrier Files: 3 accordion cards (Rate Card, Zone File, Surcharge Schedule) with plain-English guidance and copy-paste wording for merchants
- Rate Card accordion includes: CSV/Excel preference, copy-paste wording for merchants, "Only have a PDF?" link to Rate Card Converter, key things to confirm
- How ShippingIQ Works: 3-step visual (Upload → Configure → Go Live) with callout box
- Nav order across all pages: Dashboard → Carriers → Rules → Get a Quote → Resources → Rate Card Converter → [divider] → Team → Settings (Team and Settings visible to admin only)
- Sign out button (icon + "Sign out" text) is now consistent across all pages: Dashboard, Carriers, Rules, Quote, Resources, Team, Settings

### Rate Card Converter
- Live at /convert route (PdfConverter.js + PdfConverter.css), nav label "Rate Card Converter"
- Upload a carrier PDF rate card + enter carrier name → converts to downloadable CSV
- 4 parallel AI calls with destination range splitting (ADELAIDE–CROOKWELL, DALBY–LAUNCESTON, LEONORA–PORT PIRIE, PORTLAND–YOUNG), merged and deduplicated
- Output CSV format: OriginDepot,Destination,BasicCharge,Minimum,PerKg_1-250,PerKg_251-500,PerKg_501-1000,PerKg_1001-3000,PerKg_3001-12000,PerKg_12001+
- Destination name correction map applied post-merge (COLLE→COLLIE, CRAIGIIE→CRAIGIE, DEVONFORT→DEVONPORT, GOONIWINDI→GOONDIWINDI, INGLEWOOD→INGHAM, SEABROOK→SEAFORTH, BANDANEWBURN→BANNOCKBURN, COLIE→COLLIE, SEAFORD→SEAFORTH; BREWARRINA removed)
- Model B support: detects pricing model before extraction. Model B (zone-based) uses a single focused AI call. Model C (destination cities) uses the existing 4-call parallel flow. Detection runs in parallel with cubic factor detection.
- Cubic factor detection: 5th parallel AI call reads the PDF for cubic/dim factor (250, 333, 200, 167). Returns as cubicFactor in response. PdfConverter.js shows a blue info box if detected.
- Returns corrections array {original, corrected} — yellow warning box shown if any corrections applied
- Rate limiting: 5 conversions/day per merchant via upload_logs (action='convert'); fails open if check errors
- Info box warns: CSV/Excel preferred, PDF accepted, use original not scanned, AI not 100% accurate, verify before uploading
- Action box on completion: "Before uploading this CSV, open it and compare destination names and rates against your original PDF"
- Nav item "Rate Card Converter" on all pages (Dashboard, Carriers, Rules, Quote, Resources, Team, Settings, PdfConverter), positioned after Resources, before admin divider, visible to all authenticated users
- Edge function: supabase/functions/convert-pdf-to-csv/index.ts

### Settings page
- Your Profile card: display name input, pre-filled from profile.full_name. Saves to profiles table, calls fetchProfile on success so sidebar updates immediately. Intended entry point for invited users who have no name set.
- Customer Type card: B2B or B2C radio selection, saved to merchants.settings.customerType ('b2b' or 'b2c'). Drives default residential surcharge trigger when opening Surcharge Rules on a carrier — B2C (or unset) defaults residential surcharges to Always, B2B defaults to Off. Confirmed working: Mainfreight residential = Always, Allied Express has no residential surcharge.
- Store Details card: merchant can update their store name. Updates merchants.name in Supabase. Reflected immediately on Dashboard subtitle.
- GST toggle: Ex GST (B2B default) or Inc GST (B2C)
- Note: GST applies to Get a Quote page only — WooCommerce handles GST via its own tax settings
- Fixed silent settings-clobber bug: all settings saves (GST, Customer Type) now write { gstEnabled, customerType } together — previously GST save was overwriting the entire settings jsonb and wiping other fields.
- Sign out button in sidebar footer (icon + "Sign out" text)

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
- Rate caching: 5-minute WordPress transient keyed on merchant_id + postcode + items. Cache hit skips API call entirely. Error responses not cached.
- All error_log() debug calls removed — production clean.
- Free shipping display order fixed: free filtering runs before cheapest/priority display mode, so free rates always take precedence.
- PHP 8.2 compatible — explicit property declarations, no return type on WC method overrides
- Allied Express tested end-to-end at WooCommerce checkout — correct rates confirmed

## Supabase Edge Function Secrets
STRIPE_SECRET_KEY — Stripe secret key (sk_live_...) — new key created May 2026
STRIPE_WEBHOOK_SECRET — webhook signing secret (whsec_...)
STRIPE_PRICE_STARTER — price_1TS5WDDdBlDgOLr37czglYF5
STRIPE_PRICE_GROWTH — price_1TS5Y9DdBlDgOLr3o5x9ghiO
STRIPE_PRICE_PRO — price_1TS5YPDdBlDgOLr3gKwaeT4j
APP_URL — http://localhost:3000 (update to production URL before go-live)

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/Quote.js
src/pages/Settings.js
src/pages/Rules.js
src/pages/Resources.js
src/pages/Team.js + Team.css
src/pages/PdfConverter.js + PdfConverter.css
src/pages/Pricing.js
src/pages/BillingSuccess.js
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/rapid-api/index.ts
supabase/functions/calculate-freight/index.ts
supabase/functions/convert-pdf-to-csv/index.ts
supabase/functions/invite-team-member/index.ts
supabase/functions/remove-team-member/index.ts
supabase/functions/create-checkout-session/index.ts
supabase/functions/stripe-webhook/index.ts
supabase/functions/create-portal-session/index.ts
woocommerce-plugin/shippingiq/shippingiq.php
woocommerce-plugin/shippingiq/includes/class-wc-shipping-shippingiq.php
woocommerce-plugin/shippingiq/readme.txt

## Database (Supabase)
Tables: profiles, merchants, carriers, quotes, upload_logs
RLS: ENABLED on all tables (carriers, merchants, profiles, quotes, upload_logs). Policies use get_merchant_id() and get_user_role() helper functions already defined in Supabase. Performance indexes added on merchant_id columns. upload_logs had RLS enabled but no policies — now fixed.

profiles columns: id, merchant_id (FK → merchants.id), full_name, email (NOT NULL), role (default 'user'), created_at, updated_at

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
- Sends orderValue (WooCommerce cart subtotal, pre-tax) and hasExemptItem (true if any cart item has shippingiq-exempt tag) to calculate-freight — free shipping threshold works correctly at checkout
- Fetches active carriers + merchant rules from Supabase
- Runs calculateRate across all carriers
- Applies free shipping logic server-side (same 3-step flow as Quote.js)
- When free shipping triggers, only FREE options shown at checkout — paid options hidden. Smart mode still voids free shipping and shows paid rates when surcharges apply.
- Returns { results: [...], carrierPriority: [...] }
- Each result includes carrierId for WooCommerce priority sorting
- postcodeEntry uses `suburb || locality` fallback (old carriers used locality)
- DO NOT break this interface — WooCommerce plugin depends on it

### create-checkout-session
POST { priceId, tier } — creates Stripe Checkout session with 14-day trial, no card required. Gets/creates Stripe customer linked to merchant. Returns { url } for redirect.

### stripe-webhook
Receives Stripe events, verifies signature with STRIPE_WEBHOOK_SECRET. Updates merchants.subscription jsonb on checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.

### create-portal-session
POST — creates Stripe Customer Portal session. Returns { url } for redirect. Requires existing stripe_customer_id on merchant.

## Freight calculation engine
Lives in Quote.js (client-side) AND calculate-freight/index.ts (server-side)
IMPORTANT: Keep both in sync — if engine logic changes, update both files

Multi-item: qty + weight + L/W/H per item
Chargeable = MAX(actual, cubic)
Cubic weight formula: L(cm) × W(cm) × H(cm) × cubicFactor / 1,000,000 — uses carrier's own cubicFactor from parsed_data (fallback: 250). Standard domestic = 250, air freight = 333, some regional = 200.
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

## Known decisions
- WooCommerce plugin zip is gitignored — rebuild with: `cd ~/Downloads/shippingiq/woocommerce-plugin && zip -r shippingiq.zip shippingiq/`
- Supabase handle_new_user trigger: manually maintained in Supabase SQL editor — not in codebase. Must include email field in both INSERT statements.
- profiles table has email NOT NULL column — handle_new_user trigger must always insert NEW.email
- Zone name column detection: recognises 'ratinglocation', 'rating location', 'rating_location', 'depot', 'service area' as zone name headers in addition to standard 'zone', 'zone name' etc. Added to support Mainfreight MFT_Rating_Locations.xlsx (RatingLocation column).
- Model C carrier card shows destination count ("261 destinations") not zone count — zones.length was always 1 for Model C (single origin depot). Carrier card now checks pricingModel === 'C' and uses modelCRates.length instead.

## Known merchant education points
- Postcode zone file is optional in the upload form — but without postcode data the carrier cannot calculate any quotes. Merchants either upload a zone file OR use the "Postcode Ranges" button after saving to enter ranges manually. App shows a "No zone file" amber badge on carrier cards and a Dashboard banner warning when postcodeMap is empty.
- Some carriers (including StarTrack) don't publish postcode zone files publicly. Merchants must contact their account manager and ask specifically for a postcode-to-zone mapping file (CSV or Excel), or use the manual postcode range entry feature.
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
1. Production deployment — Netlify, update APP_URL secret, update WooCommerce plugin API URL
2. support@shippingiq.com.au email setup
3. WooCommerce plugin download page — merchants need a way to download the plugin
4. Onboarding flow — guided steps for new merchants: add carrier → upload files → install plugin → go live
5. Savings calculator on landing page — high conversion tool (bigger build, post-launch)


## Logged for future build
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Surcharge modal text overflow bug — radio card label/description text overflows modal width on some screen sizes. Styles look correct (flex:1, minWidth:0 on text container, width:100% on card) but issue persists. Needs fresh diagnosis — do not iterate blind on CSS again.
- Multi-warehouse / multi-origin support
- Delivery requirement flags for customers (e.g. tailgate notice at checkout)
- Carrier rate editing without full delete and re-upload
- Split shipment across carriers when no single carrier handles full cart
- Carrier-per-product mapping (v2 of eligibility rules)
- Shared engine module in supabase/functions/_shared/ so Quote.js and calculate-freight stay in sync automatically
- Platform-agnostic product exemption flags: WooCommerce uses product tags (shippingiq-exempt etc). When Shopify/Magento plugins are built, design calculate-freight API to accept flags array per cart item (["exempt", "taillift", "2person"]) so the platform plugin handles translation.
- PDF converter gated to Growth tier and above — requires billing/tier system to be built first.
- Surcharge PDF reading improvement — rapid-api surcharges mode already accepts PDF document blocks and calls addPdfs, but the AI prompt could be tuned for better extraction from PDF surcharge schedules specifically.
- Manual quote tool landing page prominence — currently shares a card in "Two ways to use it" section, deserves its own section.
- StarTrack and Hunter Express — test with real carrier files once available.
- Residential surcharge auto-detection via address lookup — parked, current merchant-configured trigger (B2B/B2C setting) is correct for both use cases.

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
- [x] Remove all error_log() calls from WooCommerce plugin
- [x] Enable WooCommerce rate caching (5-min transient)
- [ ] Enable Supabase RLS on all tables

## Test files available
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows (MFT_Rating_Locations.xlsx), Model C depot-to-depot — confirmed working end to end
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne

### Mainfreight confirmed working pipeline
- Rate card: PDF → Rate Card Converter → CSV with standard OriginDepot,Destination,... header
- Zone file: Excel (MFT_Rating_Locations.xlsx) — columns: Suburb, Post Code, State, RatingLocation
- Surcharge schedule: PDF — read as base64 document block by rapid-api surcharges mode
- Model C browser parsing: buildModelCRatesFromCSV detects standard header, extracts all 261 rows
- RatingLocation column correctly mapped to zone field after zone parser fix (see Known Decisions)
- Carrier card shows "261 destinations" (not "1 zones")
