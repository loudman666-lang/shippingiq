ShippingIQ — WooCommerce Shipping Plugin
=========================================

Displays real-time freight rates at checkout using your ShippingIQ carrier rate cards
and eligibility rules.


REQUIREMENTS
------------
- WordPress 6.0+
- WooCommerce 6.0+
- PHP 8.0+
- ShippingIQ account with at least one active carrier


INSTALLATION
------------
1. Copy the shippingiq/ folder into wp-content/plugins/
2. In WordPress admin, go to Plugins → Installed Plugins
3. Activate "ShippingIQ"


CONFIGURATION
-------------
1. Go to WooCommerce → Settings → Shipping
2. Add or edit a Shipping Zone (e.g. "Australia")
3. Click "Add shipping method", select "ShippingIQ", click "Add shipping method"
4. Click "Edit" next to ShippingIQ to open the settings panel

Settings:

  Method Title
    Label shown at checkout. Defaults to "Freight".

  Merchant ID
    Your ShippingIQ merchant UUID.
    Find it in Supabase → Table Editor → merchants → id column.

  Calculate Freight API URL
    The calculate-freight edge function URL. Default is pre-filled:
    https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/calculate-freight

  Supabase URL
    Your Supabase project URL. Default is pre-filled:
    https://soaxvqkkecqzarwmbeip.supabase.co

  Supabase Anon Key
    Your Supabase anon key. Used to fetch carrier eligibility rules.
    Find it in Supabase → Project Settings → API → Project API keys → anon / public.

  Display Mode
    All eligible carriers — shows every carrier that can handle the cart.
    Cheapest carrier only — shows only the lowest-cost eligible option.


PRODUCT WEIGHT AND DIMENSIONS
------------------------------
The plugin reads weight and dimensions from each WooCommerce product.
For correct rate calculation:

- Set WooCommerce weight unit to kg
  (WooCommerce → Settings → General → Weight unit)
- Set WooCommerce dimension unit to cm
  (WooCommerce → Settings → General → Dimensions unit)
- Add weight to every product — items with no weight are excluded from the
  freight calculation. If all items have no weight, no rates will be shown.
- Add length, width, height to products where dimensions matter (overlength
  surcharges, eligibility rules).


CARRIER ELIGIBILITY RULES
--------------------------
Set per-carrier limits in ShippingIQ → Carriers → "Carrier Limits".

  maxWeightKg   — exclude this carrier if any single item weighs more than this
  maxLengthCm   — exclude this carrier if any single item is longer than this
  maxWidthCm    — exclude this carrier if any single item is wider than this
  maxHeightCm   — exclude this carrier if any single item is taller than this

Limits apply per item, not per cart total.
Leave a field blank = no limit (carrier handles everything).


PRODUCT TAG OVERRIDES
---------------------
Add product tags in WooCommerce to override carrier selection for specific products.

  shippingiq-only-[carrier-slug]
    Only show this carrier when this product is in the cart.
    Example tag: shippingiq-only-startrack

  shippingiq-exclude-[carrier-slug]
    Never show this carrier when this product is in the cart.
    Example tag: shippingiq-exclude-allied-express

The carrier slug is the carrier name lowercased with spaces replaced by hyphens.
  "Allied Express"  → allied-express
  "StarTrack"       → startrack
  "Mainfreight"     → mainfreight

Tag rules take precedence over eligibility rules.
If a cart contains an only-X tag, all other carriers are hidden regardless of
their eligibility rules.


HOW RATES ARE CALCULATED
-------------------------
At checkout, the plugin:

1. Reads the destination postcode from the shipping address
2. Builds an items list from the cart (qty, weight, L×W×H per product)
3. Fetches carrier eligibility rules from Supabase
4. Calls the calculate-freight edge function with postcode + items + merchant_id
5. Filters out carriers that exceed eligibility limits or are excluded by tags
6. Applies display mode (all or cheapest)
7. Registers remaining carriers as shipping rate options at checkout

The calculate-freight function handles:
- Zone lookup and freight calculation (Models A, B, C)
- Fuel levy
- Surcharges (tailgate, overlength, etc.)
- Handling margin
- Free shipping threshold


TROUBLESHOOTING
---------------
No rates showing at checkout:
  - Check Merchant ID is correct
  - Check all products in cart have weight > 0
  - Check postcode is entered and is a valid 4-digit Australian postcode
  - Check the calculate-freight edge function is deployed in Supabase
  - Check the Supabase anon key is correct if eligibility filtering is needed

Rates showing for wrong carriers:
  - Review Carrier Limits in ShippingIQ → Carriers
  - Check product tags for shippingiq-only / shippingiq-exclude prefixes
  - Verify carrier slugs match exactly (lowercase, hyphens)
