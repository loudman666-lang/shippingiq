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

## App access
- Local: http://localhost:3000
- GitHub: github.com/loudman666-lang/shippingiq
- Supabase: soaxvqkkecqzarwmbeip.supabase.co

## Dave's working preferences — NEVER CHANGE
- Dave is time-poor. Keep explanations short.
- Always provide exact terminal commands. Never assume Dave will remember git commands.
- Claude CANNOT push to GitHub directly (network blocked).
- Always remind Dave to run git commit after every build.
- Never question the core product plan. Never suggest rethinking agreed decisions.
- When making file changes use Python scripts via terminal — NOT heredoc for large files.
- Always test changes compile before committing.
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
  - Exempt from free shipping per item (PARTIALLY BUILT — see outstanding below)
  - Save Quote to Supabase quotes table
- Settings page: GST toggle (ex GST B2B, inc GST B2C)
- Rules page: free shipping threshold, freight margin, carrier priority

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

## Database (Supabase)
Tables: profiles, merchants, carriers, quotes
RLS: DISABLED on all tables (dev only)
merchants.settings: jsonb — { gstEnabled: true/false }
merchants.rules: jsonb — { freeShippingEnabled, freeShippingThreshold, freightMarginType, freightMarginValue, carrierPriority }
carriers.fuel_levy_pct: numeric
carriers.surcharge_rules: jsonb — { surcharge_key: { trigger, weightKg, lengthCm } }
carriers.parsed_data: full AI output including surcharges with autoWeightKg, autoLengthMinCm, autoLengthMaxCm, autoTrigger

## Edge Function (rapid-api)
Extracts: pricingModel, zones, rates, postcodeMap, surcharges with auto thresholds, cubicFactor, fuelLevyPct
Model: claude-sonnet-4-20250514, max_tokens 8000
File types: csv (text decode), excel (XLSX via esm.sh), pdf (document block)

## Freight calculation engine (Quote.js)
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

## OUTSTANDING — fix first next session
1. EXEMPT FROM FREE SHIPPING UI BUG
   - The exempt checkbox per item in the quote form is overflowing outside the card boundary
   - Logic works correctly (exempt flag bypasses free shipping)
   - The UI rendering is broken — checkbox and text appear outside the card
   - Last state: exempt checkbox was removed from display to stop overflow
   - Need to find a clean way to show it inside the card
   - Suggestion: put it as a small toggle/link INSIDE the item grid using gridColumn span, or show it as a compact badge on the item row
   - Do NOT use paddingLeft or position it outside the grid

2. FREIGHT MARGIN — verify it shows in quote breakdown
   - Margin is calculated but the display line may not be rendering
   - Test: set a 10% margin in Rules, run a quote, check if margin line appears in formula

## What to build next after fixes
1. WooCommerce plugin
   - Connects to ShippingIQ API
   - Receives postcode + cart items (weight, dimensions, order value, exempt flags)
   - Returns calculated freight cost
   - Applies free shipping, surcharges, GST based on merchant settings
   - Shows as shipping option at checkout

## Logged for future build
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Saved quotes: rebuild properly as part of order management with full details, reload, print/export
- Edit carrier without deleting (re-upload files)
- Multi-warehouse / multi-origin support
- Delivery requirement flags for customers (e.g. tailgate notice at checkout)
- Carrier rate editing without full delete and re-upload

## Test files available
In Claude outputs from this session:
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate real carrier data for Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (examples only — AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows, Model C depot-to-depot
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne
