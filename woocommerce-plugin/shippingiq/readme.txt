=== ShippingIQ — Freight Rates for WooCommerce ===
Contributors: loudman666
Tags: shipping, freight, woocommerce, australia, rates
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 8.0
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Real-time freight rates at checkout using your own contracted carrier rate cards. Any Australian carrier supported.

== Description ==

ShippingIQ connects your WooCommerce store to your actual carrier contracts. Install the plugin, create your free account inside WordPress, upload your carrier rate cards, and your real contracted rates appear at checkout automatically — no separate sign-up step, no manual configuration.

**How it works**

1. Install this plugin and go to WooCommerce → ShippingIQ to create your free account
2. Upload your carrier rate cards (CSV, Excel, or PDF — any format)
3. Your contracted rates appear at checkout automatically

**What makes ShippingIQ different**

Most shipping plugins use their own carrier accounts and add a margin. ShippingIQ uses *your* contracted rates — so your customers see exactly what you negotiated with your carrier, with no hidden markup unless you choose to add one.

**Supported carriers**

Any Australian carrier. ShippingIQ's AI parser handles any rate card format — Allied Express, Mainfreight, StarTrack, Hunter Express, and more. If your carrier gives you a rate card, ShippingIQ can use it.

**Features**

* Real-time freight calculation at checkout
* Supports weight-break, basic charge + per kg, and depot-to-depot pricing models
* Fuel levy applied automatically
* Surcharge rules (tailgate, overlength, residential, etc.)
* Free shipping threshold with smart surcharge voiding
* Carrier eligibility rules — exclude carriers when cart items exceed weight or dimension limits
* Product tag overrides — force or exclude specific carriers per product
* Freight margin — add a flat or percentage margin to all rates
* Cheapest-only or all-carriers display mode
* 5-minute rate caching for performance

**Requirements**

* A ShippingIQ account — create one free inside the plugin after installing
* At least one active carrier with an uploaded rate card
* Products must have weight set in WooCommerce (kg)

== Installation ==

1. In WordPress admin go to Plugins → Add New
2. Search for "ShippingIQ" and click Install Now
3. Activate the plugin
4. Go to WooCommerce → ShippingIQ and create your free account (or log in if you already have one)
5. Upload your carrier rate cards at shippingiq.com.au → Carriers
6. Go to WooCommerce → Settings → Shipping
7. Add or edit a Shipping Zone (e.g. "Australia")
8. Click Add shipping method → select ShippingIQ → Add shipping method
9. Click Edit next to ShippingIQ and enter your API Key (found in ShippingIQ → Settings → API Key)
10. Save — your contracted rates will now appear at checkout

**Plugin settings**

* **Method Title** — label shown at checkout, defaults to "Freight"
* **API Key** — found in ShippingIQ → Settings → API Key
* **Display Mode** — show all eligible carriers or cheapest only

== Frequently Asked Questions ==

= Do I need a ShippingIQ account? =

Yes. After installing the plugin, go to WooCommerce → ShippingIQ to create your free account directly inside WordPress — no need to visit shippingiq.com.au first. Once connected, upload your carrier rate cards and configure your rules at app.shippingiq.com.au, and the plugin handles the rest at checkout.

= Which carriers are supported? =

Any Australian carrier. ShippingIQ uses AI to parse your carrier's rate card — CSV, Excel, or PDF. If your carrier provides a rate card file, ShippingIQ can use it.

= Do products need weight set? =

Yes. WooCommerce products must have weight set in kg. Items with no weight are excluded from the freight calculation. If all cart items have no weight, no rates will be shown.

= What dimension units should I use? =

Set WooCommerce to kg for weight and cm for dimensions (WooCommerce → Settings → General). ShippingIQ uses these for cubic weight calculation and overlength surcharge detection.

= How does free shipping work? =

Set a free shipping threshold in ShippingIQ → Rules. When the cart value meets the threshold, free shipping is shown. Smart mode voids free shipping if surcharges apply (e.g. tailgate delivery). True mode always shows free regardless of surcharges.

= Can I exclude certain carriers for oversized items? =

Yes. Set carrier eligibility limits in ShippingIQ → Carriers → Carrier Limits. Set maximum weight, length, width, or height per carrier. If any cart item exceeds a limit, that carrier is hidden at checkout.

= Can I force a specific carrier for certain products? =

Yes. Add a WooCommerce product tag in the format shippingiq-only-[carrier-slug] to restrict checkout to that carrier when the product is in the cart. Use shippingiq-exclude-[carrier-slug] to hide a carrier for that product.

= Is there a free plan? =

Yes. The free plan supports one carrier and includes full access to the quote tool, rules engine, and WooCommerce plugin.

== Screenshots ==

1. Freight rates displayed at WooCommerce checkout
2. ShippingIQ carrier management — upload your rate cards
3. Surcharge rules configuration
4. Free shipping and margin settings
5. WooCommerce → ShippingIQ account connection page — sign up or log in directly from WordPress

== External Services ==
This plugin connects to the ShippingIQ API for freight rate calculation, and to Supabase Auth for account creation and login.

ShippingIQ Freight Calculation API
What it does: Calculates freight rates based on cart items, destination postcode, and the merchant's uploaded carrier rate cards.
What data is sent: Destination postcode, cart item weights and dimensions, quantity, and the merchant's ShippingIQ Merchant ID.
When data is sent: Every time a customer reaches the checkout page and a shipping rate is requested.
API endpoint: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/calculate-freight

ShippingIQ Account API (Supabase Auth)
What it does: Creates a new ShippingIQ merchant account or authenticates an existing one directly from the WooCommerce admin.
What data is sent: Email address and password (signup or login only — entered once by the store owner in WooCommerce → ShippingIQ).
When data is sent: Only when the store owner submits the signup or login form in the plugin settings page.
API endpoints: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/register-merchant and https://soaxvqkkecqzarwmbeip.supabase.co/auth/v1/token

Terms of Service: https://shippingiq.com.au/terms
Privacy Policy: https://shippingiq.com.au/privacy

A ShippingIQ account is required to use this plugin. Create one free inside the plugin after installing.

== Changelog ==

= 1.1.0 =
* Added in-plugin account signup and login — merchants can now connect their ShippingIQ account directly from WooCommerce without visiting shippingiq.com.au
* Merchant ID is now saved automatically on signup or login — no manual entry required

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

= 1.0.0 =
Initial release.
