# ShippingIQ — Handover Document

## How to start the next session
1. Go to github.com/loudman666-lang/shippingiq
2. Click HANDOVER.md -> Raw -> Select all -> Copy
3. Open new Claude chat
4. Paste and say: "I'm Dave Bishop, read this handover and pick up where we left off"

## App access
- Local: cd ~/Downloads/shippingiq && npm start -> http://localhost:3000
- GitHub: github.com/loudman666-lang/shippingiq
- Supabase: soaxvqkkecqzarwmbeip.supabase.co

## What's built and working
- Landing page
- Auth (signup, signin, forgot password, reset password)
- Dashboard showing carrier summary
- Carriers page: add carrier, AI parsing, view rates table with View Rates button
- GitHub workflow: Terminal git push
- Supabase Edge Function (rapid-api) for AI parsing

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js

## Database (Supabase)
Tables: profiles, merchants, carriers
RLS: DISABLED on all tables (dev only)
API: All tables exposed

## Edge Function
Name: rapid-api (should have been parse-carrier, named wrong during setup)
Does: Receives carrier name + rate card text + zone file text, calls Claude AI, returns parsed data
Current parsed data structure:
{ carrier, zones, weightBreaks, serviceTypes, rateCount, summary, rates: [{ service, weight, Zone1, Zone2... }] }

## REAL CARRIER FILE STRUCTURES

### Allied Express - Rate Card
File: BA_Furniture_-_Intra___Interstate_Services_-_Road_Express_Services_1_.xlsx
Format: Excel, sheet named ROAD
Pricing model: Basic Charge + Per Kg rate, with Minimum Charge (Model B)
Formula: MAX(Basic Charge + weight x per_kg_rate, Minimum Charge)
Origin depots across top: Sydney, Melbourne, Brisbane, Adelaide, Perth
Zones down side with codes: N01=Sydney Metro, N02=Sydney Outer Metro, V01=Melbourne Metro, Q01=Brisbane Metro etc
Columns per origin: Basic Charge, Per Kilogram, Minimum Charge
Excludes GST and fuel surcharges

### Allied Express - Zone/Transit Matrix
File: 2__Road_Express_Transit_Matrix_V20_9_NOV_2023__G_Zones_.xlsx
Format: Excel, 17,152 rows, skip first 2 header rows
Columns: STATE, POSTCODE, LOCALITY, G Zone, Zone Description, Road Transit Ex SYD, Road Transit Ex MEL, Road Transit Ex BNE, Road Transit Ex ADL, Road Transit Ex PER
Key: POSTCODE maps to G Zone code (e.g. NT1=DARWIN, NT2=COUNTRY NT)
Also includes transit days from each origin depot

### Mainfreight - Zone File
File: MFT_Rating_Locations.xlsx
Format: Excel, 15,976 rows
Columns: Suburb, Post Code, State, RatingLocation
Key: Post Code maps to RatingLocation depot name (262 unique depots e.g. ADELAIDE, SYDNEY)
Pricing model: Depot-to-depot (Model C) - origin depot + destination depot lookup

### Mainfreight - Additional Charges PDF
File: Mainfreight_Additional_Charge_Register_1_Page_2025.pdf
Key surcharges:
- Tailgate: $50.00 (no fuel levy, max 750kg)
- Hand load/unload: $20.00 (no fuel levy, max 25kg/item, max 200kg total)
- Residential delivery: $85.00 (no fuel levy, includes tailgate + hand load)
- DG surcharge: 20% + fuel levy
- Overlength 4-8m: 20% + fuel levy
- Overlength over 8m: Quote required
- Depot pick up: $25.00
- Storage: $5.00/m3/day after 2 business days
- Hiab: $440.00 + fuel levy (min 4 hours)
- Additional assistance: $35.00
- Weekend/public holiday: $250.00
- Weekday timed under 2hr: $150.00, 2-3hr: $100.00, 3-4hr: $50.00

### StarTrack - Rate Card (My Furniture proposal, ex Melbourne)
File: My_FuntitureST_EXP___PRM_MEL_Tier_3.pdf
Services: Road Express, Premium, Fixed Price Premium (3 different pricing models)
Cubic factor: 250kg/m3 for Road Express and Premium, 190kg/m3 for Fixed Price Premium

Road Express rates ex Melbourne (Model B - Basic + per kg):
Destinations listed with zone codes: ADL=Adelaide, BRS=Brisbane, SYD=Sydney, LA1=Melbourne etc
Regional zones: VC1/VC2/VC3=Victoria zones, NC1-NC6=NSW zones, QC1-QC9=QLD zones, AC1-AC9=SA zones, WC1-WC9=WA zones
Zone 10 = remote (e.g. N10=NSW Zone 10 $35.84 basic + $4.076/kg, L10=Tasmania Zone 10 $68.67 + $6.452/kg)
Example: Melbourne (LA1) $9.11 basic + $0.283/kg, min $11.94

Premium rates ex Melbourne (Model B - same structure, higher kg rates for air service)
Example: Melbourne $9.11 basic + $0.447/kg, min $11.94

Fixed Price Premium (Model A - pure weight break table):
Zone 1 Local City: 1kg=$9.03, 3kg=$10.05, 5kg=$11.97, 10kg=$15.36, 20kg=$22.13
Zone 2 Home State: 1kg=$9.69, 3kg=$11.12, 5kg=$17.05, 10kg=$34.77, 20kg=$63.78
Zone 3 Metro: 1kg=$9.81, 3kg=$11.50, 5kg=$17.50, 10kg=$38.14, 20kg=$84.20
Zone 4 Outer Metro: 1kg=$11.12, 3kg=$13.35, 5kg=$19.31, 10kg=$51.77, 20kg=$94.12
Excessive weight surcharge: $9.95/kg over max weight break

StarTrack surcharges (from rate card):
- Manual handling surcharge: $9.50 (items over 20kg, 1170mm length, or 600mm width/height)
- Unmanifested fee: $11.30
- Account service fee: $9.93 per invoice
- Futile pickup: $19.12
- Single consignment pickup intrastate: $38.54, short-haul: $47.28, transcontinental: $51.76
- DG surcharge: 50% of freight charge
- Return to AP Office: $8.50
- PO Box delivery: $8.50
- Controlled returns: $10.58 per consignment (up to 3 items) + $0.51/item after

StarTrack zone guide format: Geographic maps by state, zones numbered 1-10
VIC: zones 1 (Melbourne metro), 2 (regional), 3 (remote)
NSW: zones 1-6 (metro to far remote) + zone 10 (Lord Howe Island)
QLD: zones 1-9 + zone 10 (remote islands)
SA/NT: zones 1-9 + zone 10
WA: zones 1-9 + zone 10 (Christmas Island, Rottnest)
TAS: zones H1 (Hobart), L1/L2/L3 (Launceston areas) + zone 10 (islands)
NOTE: StarTrack zone file is NOT a postcode spreadsheet - it is geographic map-based
Merchant will need to provide their postcode-to-zone mapping separately or we build a lookup

## THREE PRICING MODELS AI MUST DETECT
Model A: Weight break table - flat rate per zone per weight range (StarTrack Fixed Price Premium)
Model B: Basic + per kg - MAX(Basic + weight x rate, minimum) - Allied and StarTrack Road Express/Premium
Model C: Depot-to-depot - origin depot + destination depot lookup - Mainfreight

## IMPORTANT: StarTrack zone handling
StarTrack zones are geographic (map-based), not postcode spreadsheets.
The merchant will have a rate card with zone codes (VC1, NC1, QC1 etc).
We need a postcode-to-zone lookup to match customer postcodes to StarTrack zones.
Options: 1) Merchant uploads custom postcode-zone mapping, 2) We build a standard StarTrack postcode lookup, 3) Merchant manually enters zone per postcode range.

## What to build next - in order
1. Extend upload to accept Excel and PDF (not just CSV)
2. Three file uploads: rate card + zone file + optional surcharge doc
3. AI detects pricing model and extracts all data
4. Merchant selects origin depot/city they ship from
5. Review UI: sample calculation, surcharges, warnings
6. Rules page: free shipping threshold, carrier priority, freight margin
7. Get a Quote page: postcode + weight = calculated freight cost
8. WooCommerce plugin

## Key product decisions DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Multiple zones per postcode: first wins, flag conflicts
- No zone file available: manual postcode entry fallback
- Surcharges auto-extracted, manual entry fallback
- Optional 3rd upload for separate surcharge document
- Allied formula: MAX(Basic + weight x per_kg, minimum_charge)
- Mainfreight: postcode to RatingLocation depot-to-depot rate
- StarTrack: geographic zones, needs postcode-to-zone mapping

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq

## Session workflow
Every time something works: cd ~/Downloads/shippingiq && git add -A && git commit -m "description" && git push

### Hunter Express - Rate Card (via i-Trans intermediary)
File: MY_FURNITURE_-_HUNTER_RATE_CARD.pdf
Format: PDF, single page, two-column layout
Service: National Residential Delivery
Pricing model: Basic Charge + Per Kg rate, with Minimum Charge (Model B)
Formula: MAX(Basic + weight x rate, Minimum)
Origin: Single origin (Melbourne based for My Furniture)
NOTE: Managed via i-Trans intermediary but same pricing structure as Hunter direct

Zone structure - named cities plus regional zones:
Major cities: MELBOURNE MEL $21.75 + $0.26/kg min $42.05
SYDNEY SYD $26.10 + $0.38/kg min $46.40
BRISBANE BNE $26.10 + $0.64/kg min $46.40
ADELAIDE ADL $43.50 + $0.61/kg min $46.40
PERTH PER $26.10 + $1.13/kg min $46.40
DARWIN DRW $30.45 + $2.48/kg min $55.10
HOBART HBA $30.45 + $1.57/kg min $55.10

Regional zones follow same Model B structure:
QLD ZONE 1-6 (QLD1-QLD6), NSW ZONE 1-6 (NSW1-NSW6)
SA ZONE 1-5 (SA1-SA5), WA ZONE 1-4 (WA1-WA4)
VIC ZONE 1-3 (VIC1-VIC3), TAS ZONE 1-2 (TAS1-TAS2)
NT ZONE 1-2 (NT1-NT2) - note NT zones have unusual structure ($47.00 + $43.50 + per kg)

Key surcharge: Tailgate $75.00 flat fee per delivery
All rates exclude fuel levy and GST
No zone file provided - Hunter uses postcode-to-zone mapping (not uploaded)
Zone file format likely similar to Allied - postcode maps to zone code (QLD1, NSW2 etc)
