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
- Pricing model detection: Model A (weight break), Model B (basic+per kg), Model C (depot-to-depot)
- Origin depot selection after parsing
- Rate table display filtered to selected origin — no duplicates
- Surcharge extraction and display
- Analysis progress message and spinner
- Get a Quote page: multi-item, qty, dimensions, cubic weight, chargeable weight, full formula display

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/Quote.js
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/rapid-api/index.ts

## Database (Supabase)
Tables: profiles, merchants, carriers
RLS: DISABLED on all tables (dev only)
carriers.parsed_data stores full AI-parsed output including:
  pricingModel, zones, weightBreaks, serviceTypes, originDepots,
  selectedOrigin, cubicFactor, fuelLevyPct,
  modelBRates (each row has originDepot field),
  modelCRates, postcodeMap, surcharges, warnings

## Edge Function
Name: rapid-api (wrongly named, should have been parse-carrier)
Receives: carrierName, rateCard {data, type, name}, zoneFile {data, type, name}, surchargeDoc (optional)
File types handled: csv (text decode), excel (XLSX library), pdf (document block)
Calls Claude claude-sonnet-4-20250514, max_tokens 8000
Returns full parsed JSON including all fields above

## Freight calculation engine (Quote.js)
- Multi-item: qty + weight + L/W/H per item
- Total actual weight = sum of all item weights x qty
- Total cubic weight = sum of (L x W x H / 4000) x qty per item
- Chargeable weight = MAX(total actual, total cubic)
- Model B formula: MAX(basicCharge + chargeableWeight x perKgRate, minimumCharge)
- Model C formula: same as Model B but depot-to-depot lookup
- Model A formula: flat rate lookup by weight break and zone
- cubicFactor default 250 kg/m3 (divisor 4000 in cm)

## THREE PRICING MODELS
Model A: Weight break table — flat rate per zone per weight range
Model B: Basic + per kg — MAX(basic + weight x rate, minimum) — Allied, StarTrack
Model C: Depot-to-depot — Mainfreight style

## REAL CARRIER FILE STRUCTURES (examples only — AI handles any format)
Allied Express: Excel, Model B, origin depots across top, zones down side
Mainfreight: Excel zone file 15,976 rows, Model C depot-to-depot
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- No constraints on carrier types or file structures
- Single origin warehouse to start (multi-warehouse is future enhancement)
- Fuel levy is separate and configurable (not baked into rates)

## What to build next — in order
1. Fuel levy — editable % per carrier, applied on top of base freight rate
2. Edit carrier without deleting (re-upload files or update fuel levy)
3. Rules page: free shipping threshold, freight margin, carrier priority
4. WooCommerce plugin

## Logged for future build
- Multi-warehouse / multi-origin support (Scenario 2: separate rate card per depot)
- Carrier rate editing without full delete and re-upload

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq
