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
- Surcharge extraction with auto thresholds from carrier documents
- Fuel levy % editable per carrier
- Surcharge Rules per carrier: Manual / Auto / Auto with override
- Analysis progress message and spinner
- Get a Quote page: multi-item, qty, dimensions per item, cubic weight
- Full calculation chain: base freight + fuel levy + surcharges + GST
- Surcharges auto-applied based on weight and dimension triggers
- POA surcharges flagged as warnings
- Settings page: GST toggle (ex GST B2B, inc GST B2C)
- Rules page: free shipping threshold, freight margin, carrier priority
- Save Quote to Supabase

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
File types: csv (text), excel (XLSX via esm.sh), pdf (document block)

## Freight calculation engine (Quote.js)
Multi-item: qty + weight + L/W/H per item
Chargeable = MAX(actual, cubic)
Model B: MAX(basicCharge + chargeable x perKgRate, minimumCharge)
Surcharge triggers: auto (carrier thresholds), auto_override (merchant thresholds), manual, always, never
Overlength 4-8m: auto-detects 400-800cm range
Overlength over 8m: auto-detects over 800cm, flags as POA warning
Full chain: freight + fuel levy + surcharges + margin + GST

## THREE PRICING MODELS
Model A: Weight break table
Model B: Basic + per kg
Model C: Depot-to-depot

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Single origin warehouse to start
- Fuel levy editable per carrier
- GST configurable: ex GST (B2B) or inc GST (B2C)
- Surcharges not shown to customer — merchant sees full breakdown only
- Auto surcharge triggers use carrier's own extracted thresholds

## What to build next — in order
1. Free shipping threshold — wire into quote engine (saved in rules but not applied yet)
2. Freight margin — verify fully wired into quote engine
3. WooCommerce plugin

## Logged for future build
- Address autocomplete to detect residential vs commercial (triggers residential surcharge)
- Saved quotes: rebuild as part of order management
- Edit carrier without deleting
- Multi-warehouse support
- Delivery requirement flags for customers (e.g. tailgate notice)

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq
