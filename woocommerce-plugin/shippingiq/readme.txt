=== ShippingIQ - Freight Rates for WooCommerce ===
Contributors: loudman666
Tags: shipping, freight, woocommerce, australia, rates
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 8.0
Stable tag: 1.2.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Real-time freight rates at checkout using your own contracted carrier rate cards. Any Australian carrier supported.

== Description ==

ShippingIQ connects your WooCommerce store to your actual carrier contracts. Install the plugin, create your free account inside WordPress, upload your carrier rate cards, and your real contracted rates appear at checkout automatically - no separate sign-up step, no manual configuration.

**How it works**

1. Install this plugin and go to WooCommerce -> ShippingIQ to create your free account
2. Upload your carrier rate card (CSV or Excel) in the My Carrier tab
3. Set your shipping rules in the Rules tab
4. Your contracted rates appear at checkout automatically

**What makes ShippingIQ different**

Most shipping plugins use their own carrier accounts and add a margin. ShippingIQ uses *your* contracted rates - so your customers see exactly what you negotiated with your carrier, with no hidden markup unless you choose to add one.

**Supported carriers**

Any Australian carrier. ShippingIQ's AI parser handles any rate card format - Allied Express, Mainfreight, StarTrack, Hunter Express, and more. If your carrier gives you a rate card, ShippingIQ can use it.

**Features**

* Real-time freight calculation at checkout
* Supports weight-break, basic charge + per kg, and depot-to-depot pricing models
* Fuel levy applied automatically
* Free shipping threshold with smart surcharge voiding
* Carrier and rules management directly inside WooCommerce admin - no separate app needed on the free plan
* 100 quotes/month on the free plan, unlimited on Pro
* Carrier eligibility rules - exclude carriers when cart items exceed weight or dimension limits
* Product tag overrides - force or exclude specific carriers per product
* Freight margin - add a flat or percentage margin to all rates
* Cheapest-only or all-carriers display mode
* 5-minute rate caching for performance

**Requirements**

* A ShippingIQ account - create one free inside the plugin after installing
* At least one active carrier with an uploaded rate card
* Products must have weight set in WooCommerce (kg)

== Installation ==

1. In WordPress admin go to Plugins -> Add New
2. Search for "ShippingIQ" and click Install Now, then Activate
3. In the left menu go to WooCommerce -> ShippingIQ
4. Click Sign Up and create your free ShippingIQ account
5. You will see three tabs: My Carrier, Rules, and Account
6. Go to the My Carrier tab and enter your carrier name
7. Upload your carrier rate card file (CSV or Excel) and your zone file, then click Analyse
8. Review the analysis result and click Save Carrier - your rates are now stored
9. Go to the Rules tab to set your free shipping threshold and display preferences, then click Save Rules
10. Now go to WooCommerce -> Settings -> Shipping
11. Click on your Shipping Zone (e.g. "Australia") - if you don't have one, click Add shipping zone, name it "Australia", and set the region to Australia
12. Inside the zone, click Add shipping method
13. Select ShippingIQ from the list and click Add shipping method
14. Click Save changes
15. Your contracted carrier rates will now appear automatically at checkout when customers enter their postcode

Note: Rates will only appear for postcodes covered by your zone file. If no rates show at checkout, check that your zone file was uploaded correctly in the My Carrier tab.

= Plugin Settings =
* Method Title - label shown to customers at checkout, defaults to "Freight"
* Display Mode - show all eligible carriers or cheapest only

== Frequently Asked Questions ==

= Do I need a ShippingIQ account? =

Yes. After installing the plugin, go to WooCommerce -> ShippingIQ to create your free account directly inside WordPress - no need to visit shippingiq.com.au. Upload your rate card and configure rules in the plugin. Pro plan users get access to the full React app at app.shippingiq.com.au for advanced features.

= Which carriers are supported? =

Any Australian carrier. ShippingIQ uses AI to parse your carrier's rate card - CSV or Excel on the free plan, PDF on Pro. If your carrier provides a rate card file, ShippingIQ can use it.

= Do products need weight set? =

Yes. WooCommerce products must have weight set in kg. Items with no weight are excluded from the freight calculation. If all cart items have no weight, no rates will be shown.

= What dimension units should I use? =

Set WooCommerce to kg for weight and cm for dimensions (WooCommerce -> Settings -> General). ShippingIQ uses these for cubic weight calculation and overlength surcharge detection.

= How does free shipping work? =

Set a free shipping threshold in ShippingIQ -> Rules. When the cart value meets the threshold, free shipping is shown. Smart mode voids free shipping if surcharges apply (e.g. tailgate delivery). True mode always shows free regardless of surcharges.

= Can I exclude certain carriers for oversized items? =

Yes. Carrier eligibility limits (maximum weight, length, width, height) are available on the Pro plan via the ShippingIQ app at app.shippingiq.com.au. Upgrade to Pro at shippingiq.com.au/pricing.

= Can I force a specific carrier for certain products? =

Yes. Product tag overrides (shippingiq-only-[carrier-slug] and shippingiq-exclude-[carrier-slug]) are available on the Pro plan via the ShippingIQ app at app.shippingiq.com.au. Upgrade to Pro at shippingiq.com.au/pricing.

= Can I upload a PDF rate card? =

PDF rate card conversion is available on the Pro plan. On the free plan, upload your rate card as CSV or Excel. If your carrier only provides a PDF, ask them for a CSV or Excel version, or upgrade to Pro to use the Rate Card Converter at shippingiq.com.au.

= How many carriers can I add? =

The free plan supports 1 carrier. Upgrade to Pro at shippingiq.com.au/pricing for unlimited carriers.

= Is there a limit on checkout quotes? =

The free plan includes 100 checkout quotes per month. If you reach the limit, a "shipping unavailable" message will show at checkout until the next calendar month. Upgrade to Pro for unlimited quotes.

= Is there a free plan? =

Yes. The free plan includes 1 carrier (CSV or Excel only), basic rules (free shipping threshold and display mode), and up to 100 checkout quotes per month - all managed inside WooCommerce admin. Upgrade to Pro at shippingiq.com.au/pricing for unlimited carriers, PDF rate card conversion, advanced rules, and unlimited quotes.

== Screenshots ==

1. Sign up or log in to your ShippingIQ account directly inside WooCommerce admin.
2. Connected successfully - your merchant account is active and ready.
3. Example Carrier pre-loaded with demo rates so you can see the product working immediately.
4. AI analyses your rate card - pricing model detected, postcodes mapped, ready to save.
5. Carrier saved and live - Free plan upgrade prompt shown when 1-carrier limit is reached.
6. Shipping Rules - configure free shipping threshold and display mode without leaving WP admin.
7. Your contracted carrier rates appearing at checkout automatically.

== External Services ==
This plugin connects to the ShippingIQ API for freight rate calculation, and to Supabase Auth for account creation and login.

ShippingIQ Freight Calculation API
What it does: Calculates freight rates based on cart items, destination postcode, and the merchant's uploaded carrier rate cards.
What data is sent: Destination postcode, cart item weights and dimensions, quantity, and the merchant's ShippingIQ Merchant ID.
When data is sent: Every time a customer reaches the checkout page and a shipping rate is requested.
API endpoint: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/calculate-freight

ShippingIQ Account API (Supabase Auth)
What it does: Creates a new ShippingIQ merchant account or authenticates an existing one directly from the WooCommerce admin.
What data is sent: Email address and password (signup or login only - entered once by the store owner in WooCommerce -> ShippingIQ).
When data is sent: Only when the store owner submits the signup or login form in the plugin settings page.
API endpoints: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/register-merchant and https://soaxvqkkecqzarwmbeip.supabase.co/auth/v1/token

Terms of Service: https://shippingiq.com.au/terms
Privacy Policy: https://shippingiq.com.au/privacy

A ShippingIQ account is required to use this plugin. Create one free inside the plugin after installing.

== Changelog ==

= 1.2.1 =
* Improved rate card and zone file upload guidance with download templates and setup guide link
* Updated FAQ entries to accurately reflect free plan vs Pro plan features

= 1.2.0 =
* Added carrier management inside WooCommerce admin - upload rate cards, manage carriers, and activate/deactivate without leaving WordPress
* Added AI-powered rate card analysis - upload a CSV or Excel rate card and ShippingIQ automatically detects the pricing model and extracts rates
* Added Rules tab inside WooCommerce admin - set free shipping threshold, free shipping mode, and display mode without visiting shippingiq.com.au
* Added demo carrier on first signup - an example carrier is created automatically so merchants can test checkout rates immediately
* Added monthly quote limit (100 quotes/month) for free tier merchants with real carriers
* Fixed free shipping threshold not applying correctly when different cart values shared a cached result
* Fixed carrier analysis failing with "Unexpected end of JSON input" due to deprecated Claude model ID

= 1.1.0 =
* Added in-plugin account signup and login - merchants can now connect their ShippingIQ account directly from WooCommerce without visiting shippingiq.com.au
* Merchant ID is now saved automatically on signup or login - no manual entry required

= 1.0.0 =
* Initial release
* Real-time freight calculation at checkout
* Support for weight-break, basic charge + per kg, and depot-to-depot pricing models
* Carrier eligibility rules (weight and dimension limits)
* Product tag overrides (shippingiq-only, shippingiq-exclude)
* Free shipping threshold with smart and true modes
* Fuel levy, surcharges, and freight margin support
* Cheapest-only and all-carriers display modes
* 5-minute rate caching

== Upgrade Notice ==

= 1.2.1 =
Minor update - improved upload guidance and FAQ accuracy. No changes to checkout behaviour.

= 1.2.0 =
Adds carrier management and rules configuration directly inside WooCommerce admin. No changes to how rates are calculated at checkout.

= 1.0.0 =
Initial release.
