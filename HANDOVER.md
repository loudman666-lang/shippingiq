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

## What's built and working
- Landing page
- Auth (signup, signin, forgot password, reset password)
- Dashboard
- Carriers page: add carrier, 3 file uploads (rate card + zone file + optional surcharge doc)
- File formats: CSV, Excel, PDF all working
- AI parsing via Supabase edge function (rapid-api)
- Pricing model detection: Model A, B, C
- Origin depot selection after parsing
- Rate table display filtered to selected origin
- Surcharge extraction and display
- Fuel levy % editable per carrier (stored in carriers.fuel_levy_pct)
- Analysis progress message and spinner
- Get a Quote page: multi-item, qty, dimensions per item, cubic weight
- Full calculation chain: base freight + fuel levy + GST
- Settings page: GST toggle (ex GST for B2B, inc GST for B2C)
- Save Quote to Supabase (basic — to be improved with order management)

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/Quote.js
src/pages/Settings.js
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/rapid-api/index.ts

## Database (Supabase)
Tables: profiles, merchants, carriers, quotes
RLS: DISABLED on all tables (dev only)
merchants.settings: jsonb — stores { gstEnabled: true/false }
carriers.fuel_levy_pct: numeric — fuel levy % per carrier
carriers.parsed_data: full AI-parsed output including:
  pricingModel, zones, weightBreaks, serviceTypes, originDepots,
  selectedOrigin, cubicFactor, fuelLevyPct (from rate card),
  modelBRates (each row has originDepot field),
  modelCRates, postcodeMap, surcharges, warnings

## Edge Function
Name: rapid-api
Receives: carrierName, rateCard, zoneFile, surchargeDoc (all with data/type/name)
File types: csv (text decode), excel (XLSX via esm.sh), pdf (document block)
Extracts: pricingModel, zones, rates, postcodeMap, surcharges, cubicFactor, fuelLevyPct
Model: claude-sonnet-4-20250514, max_tokens 8000

## Freight calculation engine (Quote.js)
Multi-item: qty + weight + L/W/H per item
Total actual = sum of item weights x qty
Total cubic = sum of (L x W x H / 4000) x qty
Chargeable = MAX(actual, cubic)
Model B: MAX(basicCharge + chargeable x perKgRate, minimumCharge)
Model C: same formula, depot-to-depot lookup
Model A: flat rate by weight break and zone
Fuel levy: freightCost x fuelLevyPct / 100
GST: (freightCost + fuelLevy) x 1.1 if gstEnabled

## THREE PRICING MODELS
Model A: Weight break table
Model B: Basic + per kg — MAX(basic + weight x rate, minimum)
Model C: Depot-to-depot (Mainfreight style)

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Single origin warehouse to start
- Fuel levy is separate, editable per carrier, not baked into rates
- GST configurable: ex GST (B2B) or inc GST (B2C)

## What to build next — in order
1. Rules page: free shipping threshold, freight margin, carrier priority
2. WooCommerce plugin
3. Edit carrier without deleting (re-upload files)

## Logged for future build
- Saved quotes: rebuild properly as part of order management with full customer details, all items, ability to reload and recalculate, print/export to PDF
- Multi-warehouse / multi-origin support
- Carrier rate editing without full delete and re-upload

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq
