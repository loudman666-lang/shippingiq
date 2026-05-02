=== ShippingIQ — Real-Time Freight Rates ===
Contributors: shippingiq
Tags: shipping, freight, woocommerce, australia, rates
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Display accurate, real-time freight rates at checkout using your own contracted carrier rate cards — not ours.

== Description ==

ShippingIQ connects your WooCommerce store to your actual carrier contracts. Instead of guessing at freight costs or using generic rate tables, ShippingIQ uploads your real rate cards and calculates the correct price at checkout every time.

**How it works**

1. Sign up at [shippingiq.com.au](https://shippingiq.com.au)
2. Upload your carrier rate cards (CSV, Excel, or PDF — any format)
3. Install this plugin and enter your Merchant ID
4. Your contracted rates appear at checkout automatically

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

* A ShippingIQ account — [sign up free at shippingiq.com.au](https://shippingiq.com.au)
* At least one active carrier with an uploaded rate card
* Products must have weight set in WooCommerce (kg)

== Installation ==

1. Download the plugin zip from [shippingiq.com.au/resources](https://shippingiq.com.au/resources)
2. In WordPress admin go to Plugins → Add New → Upload Plugin
3. Upload the zip file and click Install Now
4. Activate the plugin
5. Go to WooCommerce → Settings → Shipping
6. Add or edit a Shipping Zone (e.g. "Australia")
7. Click Add shipping method → select ShippingIQ → Add shipping method
8. Click Edit next to ShippingIQ and enter your settings

**Plugin settings**

* **Method Title** — label shown at checkout, defaults to "Freight"
* **Merchant ID** — your ShippingIQ merchant ID, found in ShippingIQ → Settings
* **Supabase Anon Key** — found in ShippingIQ → Settings → API Key
* **Display Mode** — show all eligible carriers or cheapest only

== Frequently Asked Questions ==

= Do I need a ShippingIQ account? =

Yes. ShippingIQ is where you upload your carrier rate cards and configure your rules. The plugin connects to your account at checkout. Sign up free at shippingiq.com.au.

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
5. Plugin settings in WooCommerce shipping zone

== Changelog ==

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
