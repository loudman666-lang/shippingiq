# ShippingIQ — Handover Document

## How to start the next session
1. Go to github.com/loudman666-lang/shippingiq
2. Click HANDOVER.md → Raw → Select all → Copy
3. Open new Claude chat
4. Paste and say: "I'm Dave Bishop, read this handover and pick up where we left off"

## App access
- Local: cd ~/Downloads/shippingiq && npm start → http://localhost:3000
- GitHub: github.com/loudman666-lang/shippingiq
- Supabase: soaxvqkkecqzarwmbeip.supabase.co

## What's built and working
- Landing page ✅
- Auth (signup, signin, forgot password, reset password) ✅
- Dashboard showing carrier summary ✅
- Carriers page — add carrier, AI parsing, view rates table ✅
- GitHub workflow — Terminal git push ✅
- Supabase Edge Function (rapid-api) for AI parsing ✅

## Real carrier file structures — Allied Express
Rate card: Excel, pricing model = Basic Charge + Per Kg rate with minimum.
Formula: MAX(Basic + weight x per_kg, minimum_charge)
Origin depots: Sydney, Melbourne, Brisbane, Adelaide, Perth
Zone codes e.g. N01=Sydney Metro, V01=Melbourne Metro, Q01=Brisbane Metro

Zone file: Excel, 17152 rows
Columns: STATE, POSTCODE, LOCALITY, G Zone, Zone Description, transit days per depot
POSTCODE maps to G Zone code which matches rate card zone codes

## Real carrier file structures — Mainfreight
Zone file: Excel, 15976 rows
Columns: Suburb, Post Code, State, RatingLocation
262 unique depot locations e.g. ADELAIDE, SYDNEY, MELBOURNE
POSTCODE maps to RatingLocation depot name

Additional charges PDF — key surcharges:
Tailgate: $50.00, Hand load: $20.00, Residential: $85.00
DG surcharge: 20% + fuel, Overlength 4-8m: 20% + fuel
Hiab: $440 + fuel (min 4hrs), Weekend delivery: $250.00
Timed delivery under 2hr: $150, 2-3hr: $100, 3-4hr: $50

## Three pricing models AI must detect
Model A: Weight break table — flat rate per zone per weight range
Model B: Basic + per kg — Allied style, MAX(basic + weight x rate, minimum)
Model C: Depot-to-depot — Mainfreight style, origin depot + destination depot

## What to build next
1. Extend upload to accept Excel and PDF (not just CSV)
2. Three file uploads: rate card + zone file + optional surcharge doc
3. AI detects pricing model and extracts all data
4. Merchant selects origin depot (which depot they ship from)
5. Review UI: sample calculation, surcharges, warnings
6. Rules page
7. Get a Quote page
8. WooCommerce plugin

## Key product decisions DO NOT CHANGE
- Merchants upload their own files — no pre-loaded carrier data
- AI handles any format CSV, Excel, PDF, any carrier
- Multiple zones per postcode: first wins, flag conflicts
- No zone file: manual postcode entry fallback
- Surcharges auto-extracted, manual entry fallback
- Optional 3rd upload for separate surcharge document

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq

## Session workflow
Every time something works: cd ~/Downloads/shippingiq && git add -A && git commit -m "description" && git push
