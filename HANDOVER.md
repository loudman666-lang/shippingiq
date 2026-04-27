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

## Current file structure
src/
  pages/
    Dashboard.js + Dashboard.css
    Carriers.js + Carriers.css
    SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
  contexts/AuthContext.js
  components/auth/ProtectedRoute.js
  lib/supabase.js
  App.js

## Database (Supabase)
Tables: profiles, merchants, carriers
RLS: DISABLED on all tables (dev only — enable before production)
API: All tables exposed

## Edge Function
Name: rapid-api (should have been parse-carrier, named wrong during setup)
Does: Receives carrier name + rate card CSV + zone file CSV, calls Claude AI, returns parsed data
Current parsed data structure:
{
  carrier, zones, weightBreaks, serviceTypes, rateCount, summary,
  rates: [{ service, weight, Zone1, Zone2... }]
}

## What to build next — in order

### 1. Extend carrier upload to handle real carrier files
Real carrier files seen in the wild:
- Mainfreight zone file: Excel, 15,976 rows, 262 depot locations (Suburb/Postcode/State/RatingLocation)
- Mainfreight additional charges: separate PDF document
- Allied, Hunter, StarTrack: all different formats
The AI must handle ANY format — CSV, Excel, PDF — any carrier, any structure.

### 2. Extended upload flow (3 files)
Upload 1 — Rate card (required): pricing by zone/depot + weight
Upload 2 — Zone file (required): postcode to zone/depot mapping
Upload 3 — Additional charges schedule (optional): surcharges

### 3. What AI extracts from uploads
From rate card:
- Zone rates (basic charge, per-kg rate, minimum per zone)
- Surcharge amounts if embedded (tailgate, residential, hand load, DG%, overlength)
- Cubic conversion factor (usually 250kg/m3)
- Fuel surcharge % if included

From zone file:
- Full postcode to zone/depot mapping (store ALL rows, not just a summary)
- Handle edge cases: multiple zones per postcode (first wins, flag conflicts)
- Cross-reference with rate card zone codes — flag mismatches

From additional charges schedule (if uploaded):
- All surcharge amounts not found in rate card

### 4. REAL SURCHARGE DATA — Mainfreight example
Extracted from Mainfreight Additional Charge Register PDF:

Depot/Storage:
- Depot pick up: $25.00 (no fuel levy, per consignment)
- Waste disposal: $30.00/m3 (no fuel levy, min 1m3)
- Storage at depot: $5.00/m3/day (no fuel levy, min 1m3, after 2 business days)

Demurrage/Waiting Time:
- 4 tonne ute/van/truck: $30.00 per 30 mins (after 30 min free)
- Rigid vehicle up to 14t: $40.00 per 30 mins
- Semi-trailer: $60.00 per 30 mins (after 60 min free)
- B-double: $75.00 per 30 mins (after 60 min free)

Special Services:
- Weekday specified time range: $150.00 (no fuel levy, per consignment)
- Weekend/public holiday: $250.00 (no fuel levy, per consignment)

Special Equipment:
- Tailgate: $50.00 (no fuel levy, per consignment, max 750kg, max 2.1m wide)
- Hand load/unload: $20.00 (no fuel levy, per consignment, max 25kg/item, max 200kg total)
- Hiab: $440.00 + fuel levy ($110/hr, min 4 hours)
- Residential delivery fee: $85.00 (no fuel levy, includes tailgate + hand load)
- Additional assistance: $35.00 (no fuel levy, per consignment)

Dangerous Goods:
- DG surcharge: 20% + fuel levy (per consignment)

Over-length:
- 4-8 metres: 20% surcharge + fuel levy
- Over 8 metres: Quote required

Metro time windows:
- Less than 2 hour window: $150.00
- 2-3 hour window: $100.00
- 3-4 hour window: $50.00
- Weekend/public holiday: $250.00

### 5. Merchant review UI (critical)
After upload, merchant sees confirmation screen:
- Sample rate table (zone vs weight)
- Sample postcode lookups (e.g. 2000 → SYDNEY, rate for 5kg = $24.50)
- Any flagged issues (zone code mismatches, postcode conflicts)
- Surcharges extracted with ability to edit amounts
Merchant confirms → carrier goes live

### 6. Surcharge configuration
Auto-populated from uploaded docs:
- Tailgate fee
- Hand load/unload fee
- Residential delivery fee
- Dangerous goods surcharge %
- Overlength surcharge schedule
- Cubic conversion factor

Merchant sets manually:
- Which surcharges are ON by default
- Pass through at cost / with margin / absorb
- Product-level flags (fragile, DG, overlength)

### 7. Rules page
Where merchants configure how rates get applied:
- Free shipping threshold (e.g. orders over $150 ship free)
- Carrier priority (if multiple carriers, which wins)
- Zone activation (turn zones on/off)
- Margin on freight (pass through at cost or add %)

### 8. Get a Quote page
Test the engine:
- Enter postcode + weight → see calculated freight cost
- Shows which carrier, which zone, which rate was used
- Merchant verifies before going live

### 9. WooCommerce plugin
- Merchant enters WooCommerce store URL + API key
- Plugin calls ShippingIQ API at checkout
- Returns accurate freight cost based on postcode + cart weight

## Key product decisions (DO NOT CHANGE)
- Merchants upload their OWN rate cards and zone files from their carrier
- AI handles any format — CSV, Excel, PDF — any carrier, any structure
- No pre-loaded carrier data — merchant data is always accurate and current
- Zone file edge cases: multiple zones per postcode = first wins, flag conflicts
- If no zone file available: manual postcode range entry as fallback
- Surcharges extracted automatically where possible, manual entry as fallback
- Surcharge document may be separate PDF (as with Mainfreight) — optional 3rd upload

## Credentials (keep safe)
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq

## Session workflow
Every time something works → immediately run:
cd ~/Downloads/shippingiq && git add -A && git commit -m "description" && git push

## Python method for writing long files
Use python3 to write files — more reliable than cat for long content.
Write file to /home/claude/ first using create_file tool, then copy to project with cp command.
