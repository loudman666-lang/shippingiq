# ShippingIQ — Handover Document

## Session 29 June 2026 (part 2) — v1.2.2 release, plugin rename, three new features

### Completed this session

#### Plugin rename
1. **Display name changed** to "ShippingIQ - Freight Calculator for WooCommerce"
   - `shippingiq.php` Plugin Name header updated
   - `readme.txt` title (line 1) updated
   - Slug, text domain, folder name, and `$this->id` unchanged

#### Language updates
2. **Consistent freight calculation language** throughout `readme.txt`
   - Tagline: "Real-time freight calculation at checkout..."
   - Description: "ShippingIQ calculates your real contracted freight costs at checkout automatically"
   - How It Works step 4: "Your contracted freight is calculated at checkout automatically"
   - "freight rates" → "freight calculation" wherever referring to the feature/product
   - "rate card" and "rates" (actual pricing numbers shown to customers) left unchanged

#### Upload form text fixes
3. **Rate card help text** (`class-shippingiq-admin.php`):
   - "ShippingIQ AI will interpret any format automatically" → "CSV or Excel only. ShippingIQ AI will interpret the structure automatically."
4. **Upload form description**:
   - "set up rates at checkout automatically" → "extract your freight calculation rules automatically"

#### Three new plugin features
5. **No active carriers warning banner**
   - Yellow banner at top of My Carrier tab when no active real carriers exist
   - Fires even with zero carriers — condition `empty($active_real) && 'analyzed' !== $state`
   - Bug fix in same session: original condition required `!empty($carriers)` which prevented banner showing when carrier list was empty

6. **Postcode ranges editor** (`class-shippingiq-admin.php`)
   - "Postcode Ranges ▼" link inline below each real carrier name
   - Expands form with From / To / Zone rows; Add Row / Remove (JS, no page reload)
   - Pre-fills from `manualPostcodeRanges` in Supabase parsed_data
   - Save: fetches current `parsed_data`, merges in new `postcodeMap` (expanded from ranges) and `manualPostcodeRanges`, PATCHes via Supabase REST — existing rate data preserved
   - Amber "No postcode data" badge when `postcodeMap` is empty
   - Max 5,000 postcodes per range

7. **Test postcode tool**
   - Postcode input + Test button below the carrier list
   - WordPress AJAX (`wp_ajax_siq_test_postcode`) → `calculate-freight` edge function with dummy 1 kg, 30×20×10 cm item
   - Inline result: carrier + service + price, or user-friendly error message
   - Nonce-protected

#### Bug fix — carrier list not rendering
8. **`fetch_carriers()` reverted to lean select** (`id,name,status,is_demo` only)
   - Root cause: adding `parsed_data` to the select caused WordPress HTTP layer (`wp_remote_get`) to silently return empty on Local by Flywheel — no WP_Error, just empty body — hiding all carriers
   - Fix: keep `fetch_carriers()` lean; `fetch_real_carriers_parsed_data()` fetches `parsed_data` separately for non-demo carriers only, called only when rendering the carrier tab
   - Rule for future: never include large JSONB columns in `fetch_carriers()` select

#### Backend fixes (carried forward from session start)
9. **admin-get-merchants v5 — service role client isolation**
   - Two separate Supabase clients: `supabaseAuth` (anon key + user JWT, auth validation only); `supabase` (service role, created fresh after auth passes, for all DB ops)
   - Fixes "permission denied for table quotes" on merchant delete

10. **quotes FK cascade** — `quotes.merchant_id` FK changed to `ON DELETE CASCADE`

11. **All test/bot accounts deleted** — only `loudman666@gmail.com` remains

12. **readme.txt installation section** — expanded to 15 explicit steps for non-technical merchants

#### v1.2.2 release
13. **Plugin bumped to v1.2.2**
    - SVN trunk: r3589034
    - SVN tag 1.2.2: r3589036
    - GitHub: `0f8a90a`

### Next steps
- **Verify WP.org listing** — check name, descriptions, and FAQ after v1.2.2 cache refresh
- **Test new features on test site** — postcode ranges editor and test postcode tool end-to-end
- **First real merchant review request**
- **Monitor WP.org search visibility** (allow 2-4 weeks from v1.2.0 listing)

---

## Session 29 June 2026 (part 1) — Admin delete fix, plugin v1.2.1, WP.org updates

### Completed this session

#### Admin delete bug — fully fixed
1. **admin-get-merchants v5 — service role client isolation**
   - Root cause: calling `supabase.auth.getUser(jwt)` on the service role client caused Supabase JS v2 to update its internal auth session to the user's JWT. All subsequent PostgREST queries used the user's JWT as `Authorization: Bearer` instead of the service role key — RLS blocked the delete on `quotes` ("permission denied for table quotes").
   - Fix: two separate clients. `supabaseAuth` (anon key + user JWT header, used only for `auth.getUser()` validation). `supabase` (service role key, created fresh after auth passes, key read directly via `Deno.env.get()`). Used for all DB operations. Deployed as v5.
   - This pattern applies to any edge function that validates a user JWT then does admin DB work — always create separate clients.

2. **quotes FK cascade migration** (`quotes_merchant_id_fk_cascade`)
   - `quotes.merchant_id` FK was `NO ACTION`. Changed to `ON DELETE CASCADE` so merchant delete cascades even if the explicit delete step fails for any reason.

3. **quote_logs added to delete sequence + error surfacing**
   - `quote_logs` (added 28 June) was missing from the delete loop in admin-get-merchants. Added.
   - Each delete step now returns its error individually rather than swallowing failures silently.

4. **Ghost merchant deleted via SQL**
   - `4394ec94-8a76-4045-b9e7-b6c1baa2946e` ("My Store") — deleted directly via Supabase SQL editor in order: quotes, quote_logs, upload_logs, carriers, profiles, merchants.
   - Only `loudman666@gmail.com` remains in the database.

#### Plugin improvements
5. **Upload form guidance** (`class-shippingiq-admin.php`)
   - Rate Card field: new help text explaining what to ask carrier for + Download template link (`https://shippingiq.com.au/templates/rate-card-template.csv`)
   - Zone File field: new help text making consequence of missing file explicit ("without it, no rates will appear at checkout") + Download template link (`https://shippingiq.com.au/templates/zone-file-template.csv`)
   - Below Analyse button: "Need help? See the ShippingIQ setup guide" link (`https://shippingiq.com.au/resources`)
   - SVN trunk committed: r3588954

6. **Template CSV download fix** (`public/_headers`)
   - CSV files at `/templates/*.csv` were rendering in browser instead of downloading.
   - Fixed by creating `public/_headers` with `Content-Disposition: attachment` and `Content-Type: text/csv` for `/templates/*.csv`.
   - Takes effect on next Netlify deploy.

#### readme.txt and WP.org listing
7. **readme.txt fully updated for v1.2.0** — SVN r3588919 (committed end of 28 June session)
   - Description, How it works, Features, Installation, FAQ all rewritten to match v1.2.0 plugin UI
   - All non-ASCII characters replaced (em dashes, right arrows) — WP.org parser was garbling them
   - 3 FAQ entries corrected for free vs Pro accuracy:
     - "Which carriers supported" — PDF is Pro only (was incorrectly listed as free)
     - "Can I exclude oversized items" — carrier eligibility limits are Pro only
     - "Can I force a specific carrier" — product tag overrides are Pro only

8. **screenshot-2.png updated in SVN assets** — r3588956 (delete), r3588957 (import)
   - New screenshot shows upload form with improved guidance text

9. **screenshot-5.png re-uploaded to SVN assets** — r3588914 (committed end of 28 June session)
   - Previous upload had rendering issues on WP.org listing

#### v1.2.1 release
10. **Plugin bumped to 1.2.1** — `shippingiq.php` Version: header, `readme.txt` Stable tag
    - Changelog and upgrade notice added
    - SVN trunk: r3588961
    - SVN tag 1.2.1: r3588962
    - GitHub: `8b61881`
    - Purpose: ship upload guidance improvements + bust WP.org listing cache so updated description and screenshots go live

### Next steps (29 June v1.2.1 session)
- **Verify WP.org listing updates** — check wordpress.org/plugins/shippingiq-freight-rates-for-woocommerce after cache refreshes: confirm description, all 7 screenshots, and FAQ entries render correctly
- **Deploy to Netlify** — drag `build/` to Netlify to activate CSV download headers (`_headers` file)
- **Ask first real merchant for a WordPress.org review**
- **Monitor WP.org search visibility** (allow 2-4 weeks from v1.2.0 listing)
- End-to-end test the upload flow — use test-files/test-rate-card.csv + test-zone-file.csv in My Carrier tab

---

## Session 28 June 2026 — Type A plugin-first build + v1.2.0 shipped to WordPress.org

### Completed this session

#### Core plugin admin UI (class-shippingiq-admin.php — full rewrite ~1580 lines)
1. **My Carrier tab** — lists carriers with Demo badge (orange), active/inactive toggle, Delete button. Upload form: carrier name, rate card file (CSV/XLSX), zone file (CSV/XLSX). Analyse → Save two-step flow entirely in PHP (no browser-side JS parsing).
2. **Rules tab** — free shipping toggle + threshold + mode (Smart/Always Free), display mode radio (All/Cheapest/Priority). Saves to `merchants.rules` JSONB and `shippingiq_display_mode` WP option. Rules tab fully tested — DB values confirmed correct after save.
3. **Demo carrier** — shown with orange "Demo" badge and "Delete Demo" button. Subtext explains it's an example for testing. Upgrade prompt shown at carrier limit.
4. **1-carrier limit for free tier** — free tier merchants with 1+ real carriers see upgrade prompt linking to `https://shippingiq.com.au/pricing` instead of the upload form.
5. **Signup/Login flows** — both now call `fire_demo_carrier()` fire-and-forget after successful auth, then redirect to My Carrier tab.
6. **PHP file parsing** — CSV and XLSX (ZipArchive + SimpleXML, no external deps). `file_bytes_to_text()` converts uploaded file to CSV text for rapid-api. `build_postcode_map()` builds postcodeMap from zone file rows. `build_model_b_rates()` extracts Model B rates using columnMap from rapid-api. `build_model_c_rates()` extracts Model C rates from standard CSV header.

#### New Supabase edge function
7. **create-demo-carrier** — fires after merchant signup/login. Checks for existing demo carrier (idempotent). Inserts "Example Carrier" (Model B, Melbourne origin, 5 zones, 5000 postcodes covering VIC/NSW/QLD/SA/WA). Uses SUPABASE_SERVICE_ROLE_KEY internally. `verify_jwt: false` — called from PHP with anon key.

#### Database changes
8. **`carriers.is_demo BOOLEAN DEFAULT false`** — migration `20260628_add_is_demo_to_carriers.sql` applied.
9. **`quote_logs` table** — migration `20260628_create_quote_logs.sql` applied. Columns: id, merchant_id (FK), created_at. RLS enabled.
10. **Anon RLS policies** — migration `anon_rls_policies_for_plugin` applied. Adds SELECT/INSERT/UPDATE/DELETE for `anon` role on `carriers`; SELECT/UPDATE for `anon` role on `merchants`. Required because the PHP plugin calls Supabase REST API with the anon key (stored server-side in wp_options — not browser-exposed).

#### calculate-freight updates
11. **100 quotes/month limit** — free tier merchants with at least one real (non-demo) carrier: counts `quote_logs` rows for current month. Returns `{ error: 'quote_limit_reached' }` at HTTP 200 when ≥ 100. Demo-only merchants skip the limit entirely. Quote logging is fire-and-forget.
12. **WooCommerce plugin handles `quote_limit_reached`** — shows "Shipping unavailable — monthly quote limit reached" rate at $0, does not cache.

### Bugs fixed this session

13. **RLS blocked anon reads — demo carrier not appearing** — all carriers/merchants RLS policies were `FOR authenticated` only. The PHP plugin's `fetch_carriers()` and `fetch_merchant_rules()` use the anon key, which runs as `anon` role. Zero rows returned. Fixed by adding anon policies (see item 10 above). Demo carrier appeared immediately after fix without re-signup.

14. **Free shipping threshold not working at checkout** — WooCommerce transient cache key was `MD5(merchant_id + postcode + items)`. `orderValue` was not part of the key. Two different cart values with identical items/postcode shared the same cache entry — the first result (no free shipping at $100) was served to carts at $200 (above threshold). Fixed: cache key now includes `orderValue` and `hasExemptItem`.
    ```php
    // fixed cache key in class-wc-shipping-shippingiq.php
    $cache_key = 'shippingiq_' . md5( $this->merchant_id . $postcode . serialize( $items ) . (string) $order_value . ( $has_exempt_item ? '1' : '0' ) );
    ```

15. **rapid-api "Unexpected end of JSON input"** — two issues:
    - Model ID `claude-sonnet-4-20250514` (original May 2025 launch ID) is deprecated. Updated to `claude-sonnet-4-6`.
    - `callClaude()` called `data.content?.[0]?.text || ''` without checking `response.ok`. Any Claude API error (400, 401, 404) returned `undefined` → `''` → `JSON.parse('')` threw "Unexpected end of JSON input", hiding the real error. Fixed to check `response.ok` and throw with the actual Claude error message.

### Test files added
- `test-files/test-rate-card.csv` — Model B rate card, 5 zones, Melbourne origin, realistic AUD rates
- `test-files/test-zone-file.csv` — 26 postcode rows covering VIC/NSW/QLD/SA/WA (Zones 1–5)

### Architecture notes — Type A plugin
- All Supabase REST API calls from PHP use anon key from `shippingiq_api_key` WP option
- Analyse step stores result in WP transient (`siq_analysis_{merchant_id}`, 30 min TTL) for the Save step
- Save step calls rapid-api mode:surcharges, then builds final `parsed_data` in PHP and INSERTs to Supabase
- `fire_demo_carrier()` is fire-and-forget (`blocking: false, timeout: 0.01`) — won't slow signup
- Display mode set in both `merchants.rules.displayMode` (read by React app) and `shippingiq_display_mode` WP option (read by WC plugin at init)

### v1.2.0 shipped to WordPress.org
- Plugin bumped to v1.2.0 in shippingiq.php and readme.txt
- SVN trunk committed **r3588429**, tagged 1.2.0 at **r3588430**
- 7 new screenshots added to plugin folder and SVN /assets/ — **r3588432**
- Screenshot captions fixed (em dashes → plain hyphens, WP.org parser was rendering them as raw bytes) — **r3588435**
- SVN shallow checkout method used throughout (`--depth files` then `svn update includes --set-depth infinity`) to avoid hanging on full checkout

### Next steps (all carried to 29 June session — completed)

---

## Session 27 June 2026 — In-plugin signup + notification email build

### Completed this session
1. register-merchant edge function deployed and tested
2. get-merchant-id edge function built and deployed — accepts user JWT, validates via supabase.auth.getUser(), fetches merchant_id from profiles using service role client, returns { merchant_id }
3. notify-new-signup confirmed working — called directly from register-merchant (Supabase webhook not available on current plan)
4. In-plugin signup flow — working and tested
5. In-plugin login flow — working and tested (POSTs to Supabase Auth → gets access_token → POSTs to get-merchant-id edge function)
6. `woocommerce-plugin/shippingiq/includes/class-shippingiq-admin.php` created — registers WooCommerce → ShippingIQ submenu, Sign Up + Log In tabs, Connected state with Disconnect button, WP nonces throughout
7. `woocommerce-plugin/shippingiq/includes/class-wc-shipping-shippingiq.php` updated — merchant_id now read from get_option('shippingiq_merchant_id') automatically; manual Merchant ID field removed from instance settings
8. `readme.txt` fully updated for v1.1.0 — in-plugin signup reflected throughout (description, how it works, requirements, installation, FAQ, screenshots, external services)
9. Plugin bumped to v1.1.0 in both shippingiq.php and readme.txt — SVN trunk r3587821, tagged r3587823, readme update r3587831
10. Admin merchants page built at /admin/merchants — shows all merchants with email, store name, plan badge, signed up date, carrier count, deactivate/delete actions, search by email. Guarded by user.email === 'loudman666@gmail.com'
11. admin-get-merchants Supabase edge function deployed — GET returns all merchants joined with admin email and carrier count; POST action=deactivate sets subscription.status=inactive; POST action=delete cascades delete (profiles → carriers → quotes → upload_logs → merchant)
12. Merchants nav item added to all page sidebars (Dashboard, Carriers, Rules, Quote, SavedQuotes, Team, PdfConverter, Settings) — visible only to loudman666@gmail.com, links to /admin/merchants
13. Deployed to Netlify
14. Resources.js updated — removed all manual Merchant ID and API Key configuration references; Step 4 rewritten to "Connect your account"; troubleshooting updated
15. Landing.js updated — removed stale "enter your Merchant ID" copy
16. Settings.js updated — Merchant ID and API Key descriptions now reflect automatic connection via plugin sign-in
17. Shopify embedded app logged as future build in HANDOVER.md
18. Type A free vs Pro split logged in HANDOVER.md

### Deployment note — Local by Flywheel
**cp is more reliable than unzip** when deploying plugin updates. Unzip can extract to the wrong directory or leave stale files:
```bash
cp -r ~/Downloads/shippingiq/woocommerce-plugin/shippingiq /path/to/local-site/wp-content/plugins/
```

### Next steps
- NEXT BUILD: Type A plugin-first merchant — rate card upload, carrier management and basic rules inside WP plugin (see Future Build section in HANDOVER for full spec)
- Delete test accounts (test-merchant3@example.com, test-signup@example.com) via /admin/merchants
- Ask first real merchant for WordPress.org review
- Update shippingiq.com.au/resources to reflect in-plugin signup
- Shopify app (after Type A complete)

## Future Build — Shopify App

- Embedded Shopify app using App Bridge — merchant never leaves Shopify admin
- Auth via Shopify OAuth — no ShippingIQ account creation needed, merchant record created automatically in Supabase
- Carrier service API endpoint to return rates at checkout
- Full carrier management, rate card upload, rules — all inside Shopify admin
- Shopify App Store listing = major distribution channel in Australia
- Priority: after Type A WooCommerce plugin-first build
- Estimated effort: 4–6 sessions

## Future Build — Plugin-First Merchant (Type A)

### Concept
Two merchant types sharing the same Supabase backend:
- Type A — Plugin-first: does everything inside the WP plugin, never visits shippingiq.com.au
- Type B — Power user: uses the full React app at app.shippingiq.com.au

### What the plugin would need for Type A
1. File upload UI inside WP admin → calls rapid-api edge function to parse rate card
2. Basic carrier management (list carriers, activate/deactivate)
3. Basic rules (free shipping threshold, display mode, margin)
4. That covers ~80% of what small merchants need

### Pricing angle
- Plugin-only (Type A) = Free plan
- React app access (Type B) = Pro trigger
- Cleaner value proposition than current model

### Technical approach
- Same Supabase backend, same merchant ID, same carriers table
- Plugin makes direct calls to existing edge functions (rapid-api, calculate-freight)
- No new backend work needed — just PHP admin pages in the plugin

### Free vs Pro split
Free (in the plugin):
- 1 carrier
- Basic rules: free shipping threshold and display mode only
- Checkout rate calculation

Pro (React app at app.shippingiq.com.au):
- Unlimited carriers
- Advanced surcharge rules
- Quote tool
- Team members
- Saved quotes
- PDF converter

### Growth strategy
The plugin is the acquisition channel — merchant installs, gets rates working for free with 1 carrier, hits the 1-carrier limit and upgrades to Pro for unlimited carriers and advanced features. Clean, honest upgrade path. Plugin sells itself.

### Not started — log only, do not build yet

### Key credentials and IDs (also in .env.local)
- Supabase project ref: soaxvqkkecqzarwmbeip
- Supabase anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvYXh2cWtrZWNxemFyd21iZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU1NTEsImV4cCI6MjA5Mjc0MTU1MX0.dWydniFxo4a7T1TkBO6Hrj3ZfO7khjygvHegf3-3Jjw
- Stripe Pro price ID: price_1TeoVPDdBlDgOLr389bLt8Kw (Pro $29/mo AUD)
- Resend API key: retrieve from Resend dashboard
- Supabase access token (CLI): retrieve from Supabase account tokens page
- Note: keys rotated 27 June 2026 — do not store actual values in HANDOVER.md
- SVN password: stored at profiles.wordpress.org/loudman666/edit/group/1/

### Design decisions made
- Email confirmation is OFF (email_confirm: true in register-merchant sets user as verified immediately — no confirmation email sent)
- notify-new-signup failure is fire-and-forget — won't fail registration if email notification fails
- Supabase webhook not available on current plan — notification triggered directly from register-merchant instead
- register-merchant relies on handle_new_user trigger for merchant/profile row creation (does not duplicate trigger logic)

## Session — 9 May 2026

### Completed
- WordPress.org plugin published and live at wordpress.org/plugins/shippingiq-freight-rates-for-woocommerce
- SVN set up, trunk committed (revision 3526027), tagged 1.0.0 (revision 3526029)
- Banner image (1544×500px) and icon (256×256px) created and uploaded to SVN /assets/ (revision 3526946)
- Resources page updated — WooCommerce Plugin card added to template grid, Step 1 now shows Install from WordPress.org + Download zip buttons
- Deployed to Netlify

### Content/promotion strategy discussed
- NexusIQ blog to be primary content hub targeting Australian importer search terms
- ShippingIQ blog to be secondary, targeting WooCommerce store owners
- Moving blog planning to NexusIQ project folder

### Next todos (ShippingIQ)
- Ask first merchant to leave a WordPress.org review
- Monitor WordPress.org search visibility (allow 2-4 weeks)
- ShippingIQ blog — build when NexusIQ blog is underway

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
npx supabase functions deploy calculate-freight --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy convert-pdf-to-csv --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy invite-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy remove-team-member --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-checkout-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy stripe-webhook --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy create-portal-session --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy register-merchant --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq
npx supabase functions deploy get-merchant-id --project-ref soaxvqkkecqzarwmbeip --workdir ~/Downloads/shippingiq

## Tool preference — ALWAYS USE CLAUDE CODE
- Use Claude Code (claude command in terminal) for all file changes
- Use this chat for planning, architecture, and decisions only
- Claude Code reads/writes files directly — no copy/paste needed

## App access
- Local: http://localhost:3000
- Live (Netlify): https://neon-pie-9a1542.netlify.app
- GitHub: github.com/loudman666-lang/shippingiq
- Supabase: soaxvqkkecqzarwmbeip.supabase.co

## Production deployment
- Netlify: https://neon-pie-9a1542.netlify.app (deployed via Netlify Drop — drag build folder)
- To redeploy: npm run build, then drag ~/Downloads/shippingiq/build folder to Netlify project
- APP_URL secret set to Netlify URL in Supabase edge function secrets
- Supabase Auth redirect URLs: https://neon-pie-9a1542.netlify.app/** and http://localhost:3000/**
- Email confirmation: disabled (turn on before serious scale, requires proper email sender setup)
- _redirects file in public/ folder handles React Router on Netlify

## Dave's working preferences — NEVER CHANGE
- Dave is time-poor. Keep explanations short.
- Always provide exact terminal commands. Never assume Dave will remember git commands.
- Always use Claude Code for file changes — never manual copy/paste
- Always remind Dave to run git commit after every build.
- Never question the core product plan. Never suggest rethinking agreed decisions.
- When a layout fix fails twice, stop and diagnose properly before trying again.

## Credentials
- Supabase URL: https://soaxvqkkecqzarwmbeip.supabase.co
- Supabase anon key: in .env.local (not in GitHub)
- Anthropic API key: in Supabase Edge Function secrets
- GitHub: loudman666-lang/shippingiq
- Live/test merchant ID: 176a2ac8-0085-457b-a042-a51e7708873c (the merchant with carriers — confirmed live 2 May 2026)

## What's built and working

### Landing page
- Live at / route (Landing.js + Landing.css)
- Sections: Nav → Hero → Stats strip → Trust strip → Integrations → How the AI works → Two ways to use it → AI parser mockup → Features → Pricing → FAQ → CTA → Footer
- Mobile responsive (breakpoints at 900px and 560px) — fixed and deployed 3 May 2026: hero stays 2-column on iPad (stacks at 560px only), pricing grid forced to 1 column on iPhone via `!important` to override inline style
- All CTAs link to /signup and /signin via React Router
- Shopify/Magento/BigCommerce marked as coming soon
- Pricing tiers reflect only built features

### Auth
- Auth: signup, signin, forgot password, reset password

### Dashboard (fully wired with real data as of 28 Apr 2026)
- Fetches active carriers only (status='active'), quote count, and last 5 recent quotes in parallel
- Four stat cards: Active Carriers, Total Rates (uses modelBRates.length for Model B carriers), Zones Covered, Quotes Generated
- Postcode warning banner: shown when any active carrier has no postcodeMap data — names the affected carriers, links to /carriers
- First-login banner: shown when profile is loaded and full_name is blank — yellow, same style as postcode warning, links to /settings, dismissible (state only, no persist)
- Quick actions: Add Carrier → /carriers, Get a Quote → /quote, View Rules → /rules
- Recent Quotes section: last 5 quotes showing postcode, item count, date, cheapest rate + carrier name (e.g. "$16.09 via Allied Express" or "FREE via Allied"). Each row links to /quote
- "View all saved quotes" link → /quote?savedQuotes=open (auto-opens saved panel after data loads)
- Your Carriers list: compact flex-row layout with inline active badge (not full-width bar)
- Sidebar avatar + display name: dynamic from profile.full_name with merchant.name fallback
- Merchant name shown as page subtitle via merchant.name (test merchant = "My Store")
- Onboarding checklist — shown to new merchants (no carriers yet). 5 steps: Create account (auto-done), Set store name (auto-detects if name ≠ "My Store"), Add first carrier (auto-detects), Configure rules (manual tick → persisted to localStorage), Install WooCommerce plugin (manual tick → persisted to localStorage; shows Merchant ID with copy button inline). Progress bar. Hides when first carrier is added; fully hidden when all steps complete.

### Onboarding checklist (May 2026)
- Shown on Dashboard when merchant has no carriers. Replaces the empty-state card. Hides as soon as first carrier is added; fully hidden once all 5 steps complete.
- 5 steps:
  1. Create your account — always done (auto)
  2. Set your store name — auto-detects if merchant.name ≠ "My Store" → links to /settings
  3. Add your first carrier — auto-detects from carriers array → links to /carriers
  4. Configure your rules — manual tick, persisted to localStorage key `shippingiq_step_rules` → links to /rules
  5. Install the WooCommerce plugin — manual tick, persisted to localStorage key `shippingiq_step_plugin` → links to /resources; shows Merchant ID copy button inline
- Progress bar above checklist (e.g. "3 of 5 completed")
- State vars: `pluginInstalled`, `rulesConfigured`, `copiedMerchantId` (in Dashboard.js)
- Manual steps have an unticked checkbox the merchant clicks to mark done — no server write, localStorage only
- Settings page — Merchant ID card: shows merchant UUID with copy button
- Settings page — API Key card: shows REACT_APP_SUPABASE_ANON_KEY truncated with copy button. Label: "Anon Key". Required for WooCommerce plugin config.
- CSS classes `settings-card` and `settings-card-title` added to Carriers.css (border-radius 12px, 24px padding, used in Settings.js)

### Team page
- Live at /team route (Team.js + Team.css)
- Shows list of team members with avatar, name, join date, role badge (admin = orange, member = grey)
- Current user marked with (You) indicator
- Invite form: email input + Send invite button — fully working including acceptance flow
- Calls invite-team-member edge function (deployed to Supabase)
- Friendly error messages: "already registered" vs generic error
- Remove button: visible to admins only, hidden on own row. Confirm dialog → calls remove-team-member edge function → refreshes list on success. Friendly error for last-admin protection.
- Sign out button in sidebar footer (icon + "Sign out" text)
- Nav: appears between Resources and Settings, visible to admin users only

### invite-team-member edge function
- POST { email, merchantId, role } → calls supabase.auth.admin.inviteUserByEmail with merchant_id and role in user_metadata
- Requires SUPABASE_SERVICE_ROLE_KEY in edge function secrets (confirmed present)
- Returns { user } on success, { error } on failure

### remove-team-member edge function
- POST { userId, merchantId } — requires Authorization header (caller's JWT)
- Verifies caller is admin for the same merchantId (checks profiles table via admin client)
- Confirms target user belongs to same merchant
- Rejects self-deletion; rejects removing last admin (counts admins for merchant)
- Calls supabaseAdmin.auth.admin.deleteUser(userId)
- Returns { success: true } or { error: '...' }

### handle_new_user Supabase trigger
- Fires on auth.users INSERT
- Checks raw_user_meta_data for merchant_id — if present, links invited user to existing merchant
- If no merchant_id, creates new merchant and sets role to admin
- Inserts into profiles: id, full_name, email, merchant_id, role
- Function confirmed updated with email field (was missing, caused "Database error saving new user")

### Carriers page
- Add carrier with 3 file uploads (rate card + zone file + optional surcharge doc)
- CSV, Excel, PDF all working
- AI parsing via Supabase edge function (rapid-api)
- Pricing model detection: Model A, B, C
- Origin depot selection after parsing
- Rate table display filtered to selected origin
- Surcharge extraction with auto thresholds from carrier documents
- Fuel levy % editable per carrier (stored in carriers.fuel_levy_pct)
- Surcharge Rules per carrier — five trigger types:
  - Off (manual) — won't calculate automatically
  - On — automatic (carrier triggers) — uses thresholds from rate card
  - On — automatic (my triggers / auto_override) — merchant-set thresholds with kg/cm inputs
  - On — per-item weight threshold (item_weight) — fires when any single item exceeds kg threshold
  - On — consignment weight threshold (consignment_weight) — fires when total weight exceeds kg threshold
  - Always — every quote
  - Off — never apply
  - Each option has a one-line plain English explanation below the dropdown
  - Overlength 4–8m and over 8m handled correctly; lower/upper bound inputs labelled correctly
- Carrier Limits section: eligibility weight/dim fields with two-paragraph explanation and generic example (no carrier names)
- Cubic Weight Factor displayed on carrier card and during upload. Editable inline. Help text explains standard is 250 (L × W × H ÷ 4,000) — only change if carrier contract specifies otherwise.
- Edit Rates button on each carrier card — re-upload files to update rates without deleting. Same two-step analyse → save flow. On save, updates parsed_data only — preserves fuel_levy_pct, eligibility_rules. After save, modal prompts merchant to keep existing surcharge rules or reset to new surcharges from uploaded files.
- Upload guardrails:
  - Hash check: same files → "Files unchanged — using existing analysis." (no AI call)
  - Re-upload confirmation modal when carrier name matches existing active carrier
  - Rate limit: 10 uploads per 24 hours (upload_logs table); blocked with clear error message
  - Admin override: merchants.upload_limit_exempt = true bypasses rate limit
  - Form inputs disabled after analysis completes until Save or Cancel
- Analysis progress steps: 'Reading files...' → 'Building postcode map...' → 'Analysing rates — this takes 20–40 seconds...' → 'Extracting surcharges...' → 'Done.'
- Carrier eligibility limits UI — maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm saved to carriers.eligibility_rules
  - Zero values = no limit (bug fixed — was incorrectly excluding all carriers when any limit was 0)
- Dynamic sidebar avatar across all pages (see Dashboard note above)
- **Manual postcode range entry** — carrier card "Postcode Ranges" / "Edit Ranges" button (always visible). Opens modal with two tabs: "Upload zone file" (disabled) and "Enter ranges manually" (active). Modal shows zones from rate card (pulled live from parsed_data), grid of From/To/Zone rows with row-level validation, live postcode count display, and Save Ranges → writes both `postcodeMap` and `manualPostcodeRanges` to `carriers.parsed_data`. Zone file upload in the add-carrier form is now optional (label says "optional — or enter postcode ranges manually after saving").
- **No zone file badge** — amber pill "No zone file" shown next to carrier name when postcodeMap is empty.

### Get a Quote page
- Multi-item with qty, dimensions per item
- Cubic weight calculation; chargeable = MAX(actual, cubic)
- Full calculation chain: base freight + fuel levy + surcharges + margin + GST
- Surcharge triggers: auto, auto_override, item_weight, consignment_weight, always, never
  - item_weight: tested with Tail Lift at 30kg threshold — working
  - consignment_weight: tested — working
- POA surcharges flagged as warnings
- Free shipping — 3-step logic:
  1. Order value >= threshold? No → normal freight
  2. Any exempt item? Yes → normal freight
  3. Any surcharges triggered?
     - Smart mode: free shipping voided → normal freight + surcharges (tested and working)
     - True mode: always $0, surcharges ignored (tested and working)
     - No surcharges → free shipping, $0
- Exempt from free shipping per item: checkbox inside item row (conditional on freeShippingEnabled)
- Quote results — compact table + detail panel layout (as of 28 Apr 2026):
  - Compact table at top: one row per carrier (name/service, zone, chargeable weight, price)
  - Sorted: FREE first → cheapest paid → errors at bottom
  - FREE badge (green pill) in price column; "Cheapest" badge on cheapest paid carrier
  - "Cheapest" badge hidden when any FREE result exists
  - Clicking a row updates the detail breakdown below
  - Detail panel: full formula, fuel levy, surcharges, GST breakdown for selected carrier
  - FREE carrier detail panel: shows full merchant cost breakdown with "absorbed by you" note (uses originalRate preserved at calculation time; merchant cost shown in red)
  - Error rows show reason inline; selecting shows error card below
  - Price column header: "Total" with "inc GST"/"ex GST" sub-note below each price
- Save Quote to Supabase quotes table with optional reference/name field

### Saved Quotes
- Dedicated page at /saved-quotes — lists all saved quotes with Load and Delete buttons
- Optional reference/name field when saving — shown as primary label on Saved Quotes page and Dashboard
- Load button navigates to Get a Quote with form, items and results pre-populated
- Yellow banner on Get a Quote shows reference name + date when a quote is loaded
- Calculate Freight clears the banner and recalculates fresh rates
- Dashboard "Recent Quotes" shows reference as primary label when set
- "View all saved quotes" on Dashboard links to /saved-quotes
- Saved Quotes nav link on all pages
- quotes table: id, merchant_id, postcode, items (jsonb), results (jsonb), reference (text), created_at

### Billing (Stripe)
- Stripe account: acct_1T9F7lDdBlDgOLr3 (shared with ImporterIQ and MarginIQ)
- Three edge functions deployed: create-checkout-session, stripe-webhook, create-portal-session
- 14-day free trial on Pro, no credit card required (payment_method_collection: if_required)
- Webhook endpoint registered: https://soaxvqkkecqzarwmbeip.supabase.co/functions/v1/stripe-webhook
- Webhook events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- merchants.subscription jsonb column stores: tier, status, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_ends_at
- Tier values: free | pro
- Status values: active | trialing | past_due | canceled
- AuthContext: planTier reads from merchant.subscription.tier (defaults to 'free')
- Billing page at /pricing — 2-plan pricing grid (Free + Pro), upgrade button, current plan indicator, manage billing portal link
- BillingSuccess page at /billing/success — auto-redirects to dashboard after 4 seconds
- Billing nav link on all pages (admin only)
- STRIPE_SECRET_KEY: new key created (not the original sk_live — original couldn't be copied, new key created via "+ Create secret key")

### Pricing (simplified May 2026)
- Two plans only: **Free ($0/mo)** and **Pro ($29/mo AUD)**
- Free: 1 carrier, WooCommerce plugin, full quote tool, rules engine, surcharge management, team members
- Pro: unlimited carriers, everything in Free + Rate Card Converter (10/day), priority support
- 14-day free trial on Pro, no credit card required
- Annual option: not yet built (future consideration: $39/mo paid annually)
- Pricing page at /pricing, Landing.js pricing grid — both show 2 plans in 1fr 1fr grid, max-width 640–720px, centred
- Footnote on both: "All prices in AUD · 14-day free trial on Pro · No credit card required · Cancel anytime"
- Landing.js hero subtitle: "Unlike Shippit or StarShipIt, we use your contracted carrier rates — not ours."

Stripe:
- One active price: `price_1TeoVPDdBlDgOLr389bLt8Kw` (Pro $29/mo)
- Old prices archived: Starter $39, Growth $79, Pro $149
- STRIPE_PRICE_PRO secret updated in Supabase edge function secrets
- `.env.local` updated: REACT_APP_STRIPE_PRICE_PRO=price_1TeoVPDdBlDgOLr389bLt8Kw

Feature gating (src/lib/tierLimits.js):
- Carriers: Free=1, Pro=unlimited (enforced in Carriers.js)
- Rate Card Converter: Free=locked, Pro=10/day (PdfConverter.js + convert-pdf-to-csv edge function)
- Team members: unlimited on all plans (gating removed entirely from Team.js)

### Legal
- Terms of Service, Privacy Policy, and Refund & Cancellation Policy modals
- Component: src/components/LegalModals.js — TermsModal, PrivacyModal, RefundModal
- Accessible from Landing page footer (3 buttons) and Settings page (Legal card)
- Modals close on × button or clicking outside
- Australian law compliant — Privacy Act 1988, Australian Consumer Law, Victorian jurisdiction
- Support email: support@shippingiq.com.au — live (Zoho, MX on GoDaddy, set up 3 May 2026)

### Resources page (updated May 2026)
- Template Files section: 3 downloadable CSVs (rate-card-template.csv, zone-file-template.csv, surcharge-template.csv) served from /public/templates/
- **Help & Guides** section (renamed from "Getting Your Carrier Files"): 5 accordion cards (Rate Card, Zone File, Surcharge Schedule, WooCommerce Plugin Installation Guide, Troubleshooting)
  - Rate Card accordion includes: CSV/Excel preference, copy-paste wording for merchants, "Only have a PDF?" link to Rate Card Converter, key things to confirm
  - **WooCommerce Plugin Installation Guide** — 5-step guide with Download Plugin button (GitHub raw URL), WordPress install steps, plugin config fields (Merchant ID, API URL, Anon Key, Display Mode), test instructions, important callout
  - **Troubleshooting** — 4 bordered issue cards: no rates showing, postcode not found, carrier not appearing, rates wrong. Support email at bottom (support@shippingiq.com.au)
  - Plugin zip committed to GitHub repo (removed from .gitignore) — download URL: https://github.com/loudman666-lang/shippingiq/raw/main/woocommerce-plugin/shippingiq.zip
- How ShippingIQ Works: 3-step visual (Upload → Configure → Go Live) with callout box
- Nav order across all pages: Dashboard → Carriers → Rules → Get a Quote → Resources → Rate Card Converter → [divider] → Team → Settings (Team and Settings visible to admin only)
- Sign out button (icon + "Sign out" text) is now consistent across all pages: Dashboard, Carriers, Rules, Quote, Resources, Team, Settings

### Rate Card Converter
- Live at /convert route (PdfConverter.js + PdfConverter.css), nav label "Rate Card Converter"
- Upload a carrier PDF rate card + enter carrier name → converts to downloadable CSV
- 4 parallel AI calls with destination range splitting (ADELAIDE–CROOKWELL, DALBY–LAUNCESTON, LEONORA–PORT PIRIE, PORTLAND–YOUNG), merged and deduplicated
- Output CSV format: OriginDepot,Destination,BasicCharge,Minimum,PerKg_1-250,PerKg_251-500,PerKg_501-1000,PerKg_1001-3000,PerKg_3001-12000,PerKg_12001+
- Destination name correction map applied post-merge (COLLE→COLLIE, CRAIGIIE→CRAIGIE, DEVONFORT→DEVONPORT, GOONIWINDI→GOONDIWINDI, INGLEWOOD→INGHAM, SEABROOK→SEAFORTH, BANDANEWBURN→BANNOCKBURN, COLIE→COLLIE, SEAFORD→SEAFORTH; BREWARRINA removed)
- Model B support: detects pricing model before extraction. Model B (zone-based) uses a single focused AI call. Model C (destination cities) uses the existing 4-call parallel flow. Detection runs in parallel with cubic factor detection.
- Cubic factor detection: 5th parallel AI call reads the PDF for cubic/dim factor (250, 333, 200, 167). Returns as cubicFactor in response. PdfConverter.js shows a blue info box if detected.
- Returns corrections array {original, corrected} — yellow warning box shown if any corrections applied
- Rate limiting: 10 conversions/day per merchant via upload_logs (action='convert'); fails open if check errors
- Info box warns: CSV/Excel preferred, PDF accepted, use original not scanned, AI not 100% accurate, verify before uploading
- Action box on completion: "Before uploading this CSV, open it and compare destination names and rates against your original PDF"
- Nav item "Rate Card Converter" on all pages (Dashboard, Carriers, Rules, Quote, Resources, Team, Settings, PdfConverter), positioned after Resources, before admin divider, visible to all authenticated users
- Edge function: supabase/functions/convert-pdf-to-csv/index.ts

### Settings page
- Your Profile card: display name input, pre-filled from profile.full_name. Saves to profiles table, calls fetchProfile on success so sidebar updates immediately. Intended entry point for invited users who have no name set.
- Customer Type card: B2B or B2C radio selection, saved to merchants.settings.customerType ('b2b' or 'b2c'). Drives default residential surcharge trigger when opening Surcharge Rules on a carrier — B2C (or unset) defaults residential surcharges to Always, B2B defaults to Off. Confirmed working: Mainfreight residential = Always, Allied Express has no residential surcharge.
- Store Details card: merchant can update their store name. Updates merchants.name in Supabase. Reflected immediately on Dashboard subtitle.
- GST toggle: Ex GST (B2B default) or Inc GST (B2C)
- Note: GST applies to Get a Quote page only — WooCommerce handles GST via its own tax settings
- Fixed silent settings-clobber bug: all settings saves (GST, Customer Type) now write { gstEnabled, customerType } together — previously GST save was overwriting the entire settings jsonb and wiping other fields.
- Sign out button in sidebar footer (icon + "Sign out" text)
- Merchant ID card — shows merchant UUID with copy button
- API Key card — shows Supabase anon key (REACT_APP_SUPABASE_ANON_KEY) with copy button; required for WooCommerce plugin configuration
- settings-card and settings-card-title CSS classes added to Carriers.css

### Rules page
- Free shipping threshold with on/off toggle
- Free shipping mode: Smart (surcharges void free shipping) / Always Free (always $0) — radio toggle, saved to merchants.rules.freeShippingMode
- shippingiq-exempt WooCommerce tag documented inline with tip about bulky items
- Freight margin: none / percentage / flat amount
- Carrier priority: drag-to-reorder (arrows), stale closure bug fixed, new carriers appended at bottom

### WooCommerce plugin (woocommerce-plugin/shippingiq/)
- Standard WC shipping method, registers as "ShippingIQ" in WC shipping zones
- Calls calculate-freight edge function: POST { postcode, items, merchant_id }
- Auth via apikey + Authorization: Bearer headers (Supabase anon key)
- Fetches carriers.eligibility_rules from Supabase REST API; excludes carriers where any item exceeds limits (limit > 0 only — zero = no limit)
- Product tag rules: shippingiq-only-[carrier-slug] and shippingiq-exclude-[carrier-slug]
- Three display modes (all tested with Allied Express):
  - all: all eligible carriers sorted by ShippingIQ carrier priority order
  - cheapest: lowest cost carrier only
  - priority: top-ranked carrier that services the postcode
- calculate-freight returns carrierId per result + carrierPriority array — plugin sorts without extra Supabase query
- Always uses totalCost (ex-GST) from API — WooCommerce handles tax independently
- Rate caching: 5-minute WordPress transient keyed on merchant_id + postcode + items. Cache hit skips API call entirely. Error responses not cached.
- All error_log() debug calls removed — production clean.
- Free shipping display order fixed: free filtering runs before cheapest/priority display mode, so free rates always take precedence.
- PHP 8.2 compatible — explicit property declarations, no return type on WC method overrides
- Allied Express tested end-to-end at WooCommerce checkout — correct rates confirmed
- **Submitted to WordPress.org plugin directory** (2 May 2026) — slug: `shippingiq`, awaiting human review (1–2 weeks). Automated scan passed. Plugin cleaned up before submission: readme.txt rewritten to WP.org standard, error_log calls removed, Tested up to set to 6.9, Author URI removed, plugin name matched between readme.txt and PHP header. Screenshots 1–5 added to plugin folder.
- **WordPress.org review feedback received and addressed** (6 May 2026): reviewer requested changes — all addressed: plugin renamed to `ShippingIQ — Freight Rates for WooCommerce` (readme.txt line 1 + PHP Plugin Name header), WordPress.org contact email updated to support@shippingiq.com.au, `loudman666` added to Contributors in readme.txt, External Services section added to readme.txt (data sent, when, service provider, ToS + Privacy Policy links), class renamed from `WC_Shipping_ShippingIQ` to `ShippingIQ_Shipping_Method` in both class file and shippingiq.php. New slug requested: `shippingiq-freight-rates-for-woocommerce`. Awaiting reviewer response.
- **WordPress.org second review round addressed** (7 May 2026): text domain in all 17 gettext functions updated to `shippingiq-freight-rates-for-woocommerce` (was `shippingiq` — must match WP.org slug). External Services section in readme.txt updated to explicitly name `soaxvqkkecqzarwmbeip.supabase.co` as the API endpoint with direct /terms and /privacy links. Plugin Check text domain warning is a false positive (local folder name vs WP.org slug mismatch — expected behaviour, not a real error). Submitted as shippingiq-submit-v4.zip — awaiting review response. Local WordPress test site rebuilt fresh via Local by Flywheel (shippingiq-test.local) — Allied Express confirmed working at postcode 3000.

### calculate-freight edge function — RLS fix (2 May 2026)
- **Root cause of go-live failure:** calculate-freight was using the anon key with RLS enabled — blocked carrier and merchant queries for WooCommerce requests (no user JWT in context)
- **Fix:** switched calculate-freight to use SUPABASE_SERVICE_ROLE_KEY for its Supabase client, bypassing RLS. Redeployed — confirmed working.
- Live production merchant ID: `176a2ac8-0085-457b-a042-a51e7708873c` (the one with carriers). The ID `4394ec94-...` had no carriers and was a red herring during debugging.

## Supabase Edge Function Secrets
STRIPE_SECRET_KEY — Stripe secret key (sk_live_...) — new key created May 2026
STRIPE_WEBHOOK_SECRET — webhook signing secret (whsec_...)
STRIPE_PRICE_PRO — price_1TeoVPDdBlDgOLr389bLt8Kw (Pro $29/mo — updated May 2026)
SUPABASE_SERVICE_ROLE_KEY — used by calculate-freight to bypass RLS (added 2 May 2026)
APP_URL — http://localhost:3000 (update to production URL before go-live)

## Current file structure
src/pages/Dashboard.js + Dashboard.css
src/pages/Carriers.js + Carriers.css
src/pages/Quote.js
src/pages/Settings.js
src/pages/Rules.js
src/pages/Resources.js
src/pages/Team.js + Team.css
src/pages/PdfConverter.js + PdfConverter.css
src/pages/Pricing.js
src/pages/BillingSuccess.js
src/pages/SignIn.js, SignUp.js, ForgotPassword.js, ResetPassword.js
src/contexts/AuthContext.js
src/components/auth/ProtectedRoute.js
src/lib/supabase.js
src/App.js
supabase/functions/rapid-api/index.ts
supabase/functions/calculate-freight/index.ts
supabase/functions/convert-pdf-to-csv/index.ts
supabase/functions/invite-team-member/index.ts
supabase/functions/remove-team-member/index.ts
supabase/functions/create-checkout-session/index.ts
supabase/functions/stripe-webhook/index.ts
supabase/functions/create-portal-session/index.ts
woocommerce-plugin/shippingiq/shippingiq.php
woocommerce-plugin/shippingiq/includes/class-wc-shipping-shippingiq.php
woocommerce-plugin/shippingiq/includes/class-shippingiq-admin.php
woocommerce-plugin/shippingiq/readme.txt
supabase/functions/register-merchant/index.ts
supabase/functions/get-merchant-id/index.ts

## Database (Supabase)
Tables: profiles, merchants, carriers, quotes, upload_logs, quote_logs
RLS: ENABLED on all tables. Policies use get_merchant_id() and get_user_role() helper functions. Performance indexes on merchant_id columns.
Anon role policies (added 28 June 2026): carriers (SELECT/INSERT/UPDATE/DELETE), merchants (SELECT/UPDATE) — required for PHP plugin using anon key from wp_options server-side.

profiles columns: id, merchant_id (FK → merchants.id), full_name, email (NOT NULL), role (default 'user'), created_at, updated_at

merchants.settings: jsonb — { gstEnabled: true/false }
merchants.rules: jsonb — { freeShippingEnabled, freeShippingThreshold, freeShippingMode ('smart'|'true'), freightMarginType, freightMarginValue, carrierPriority[] }
merchants.upload_limit_exempt: boolean — if true, bypasses 10/day upload rate limit

carriers.is_demo: BOOLEAN DEFAULT false — set by create-demo-carrier edge function; used to skip quote limit for demo-only merchants and show orange Demo badge in plugin
carriers.fuel_levy_pct: numeric
carriers.surcharge_rules: jsonb — { surcharge_key: { trigger, weightKg, lengthCm } }
  trigger values: 'manual' | 'auto' | 'auto_override' | 'item_weight' | 'consignment_weight' | 'always' | 'never'
  item_weight and consignment_weight use weightKg field for threshold
carriers.parsed_data: full AI output — includes postcodeMap, modelBRates (Model B), surcharges with autoWeightKg/autoLengthMinCm/autoLengthMaxCm/autoTrigger, originDepots, selectedOrigin, fileHash
carriers.eligibility_rules: jsonb — { maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm } (0 = no limit)

upload_logs: merchant_id, created_at — one row per upload attempt; rate limit checks last 24h
quote_logs: id, merchant_id (FK), created_at — one row per quote generated; rate limit checks current calendar month (100/mo free tier)

## File parsing architecture (browser-first)

### How parsing works
1. All files (rate card, zone file, surcharge doc) parsed entirely in the browser using SheetJS (XLSX via esm.sh)
2. Browser scans ALL tabs of ALL uploaded files for ALL data types regardless of upload slot
3. postcodeMap built entirely in browser — never sent to AI. Saved directly to Supabase in parsed_data.postcodeMap
4. Two focused AI calls to rapid-api:
   - `mode: 'rates'` — structure only: pricingModel, originDepots, columnMap, cubicFactor, fuelLevyPct (~200 tokens for Model B)
   - `mode: 'surcharges'` — surcharge extraction with auto-trigger thresholds
5. Browser builds modelBRates from compact CSV using Claude's columnMap (no token limits)
6. Model A/C: Claude returns weightBreaks, zones, rates/modelCRates directly

### Why this architecture
- Allied Express zone file = 16,000+ rows — too large for AI
- Allied Express rate card = 84 zones × 5 depots = 420+ combinations — AI hits token limit
- Tested: 880 rates, 23 surcharges, 2,688 postcodes, 5 depots — all correct

### Key browser parsing functions (Carriers.js)
- `scanExcelBytes(XLSX, bytes)` — scans all sheets, returns {postcodeRows, rateTexts, surchargeTexts}
- `scanCsvText(text, fileName)` — same for CSV
- `parseZoneSheetToObjects(rows, sheetName)` — detects header row (rows 0–20), maps postcode/zone/suburb/state
- `extractSurchargeText(rows, sheetName)` — keyword detection
- `buildModelBRatesFromCSV(rateText, structure)` — uses columnMap to extract all rate rows
- `deduplicatePostcodeMap(allRows)` — first-write-wins, keyed by postcode
- `looksLikePostcode(val)` — handles JS number (200–9999) and string '0200'–'9999'
- `computeFileHash(files)` — name:size:lastModified fingerprint for hash check

### Allied Express sheet details (for debugging)
- Zone file sheet: "AOE Matrix"; headers mid-sheet (not row 0); zone column = "G Zone"
- Rate card: origin depots as column headers, zoneCode/zone columns on left

## Edge Functions

### rapid-api
Mode 'rates': returns pricingModel, service, originDepots, cubicFactor, fuelLevyPct, summary, warnings, zoneCodeCol, zoneNameCol, columnMap (B), weightBreaks + zones + rates (A), modelCRates (C)
Mode 'surcharges': returns { surcharges: [...] } with autoWeightKg, autoLengthMinCm, autoLengthMaxCm, autoTrigger
Model: claude-sonnet-4-6 (updated 28 June 2026 — was claude-sonnet-4-20250514 which is deprecated), max_tokens: 4000 (rates), 8000 (surcharges)
rateText capped at 8000 chars before sending
callClaude() now checks response.ok and throws with the real Claude error message if the API returns non-2xx — previously silently returned '' causing JSON.parse to throw "Unexpected end of JSON input"

### calculate-freight
POST { postcode, items, merchant_id, orderValue? (default 0), hasExemptItem? (default false) }
- Sends orderValue (WooCommerce cart subtotal, pre-tax) and hasExemptItem (true if any cart item has shippingiq-exempt tag) to calculate-freight — free shipping threshold works correctly at checkout
- Fetches active carriers + merchant rules from Supabase
- Runs calculateRate across all carriers
- Applies free shipping logic server-side (same 3-step flow as Quote.js)
- When free shipping triggers, only FREE options shown at checkout — paid options hidden. Smart mode still voids free shipping and shows paid rates when surcharges apply.
- Returns { results: [...], carrierPriority: [...] }
- Each result includes carrierId for WooCommerce priority sorting
- postcodeEntry uses `suburb || locality` fallback (old carriers used locality)
- DO NOT break this interface — WooCommerce plugin depends on it

### create-checkout-session
POST { priceId, tier } — creates Stripe Checkout session with 14-day trial, no card required. Gets/creates Stripe customer linked to merchant. Returns { url } for redirect.

### stripe-webhook
Receives Stripe events, verifies signature with STRIPE_WEBHOOK_SECRET. Updates merchants.subscription jsonb on checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.

### create-portal-session
POST — creates Stripe Customer Portal session. Returns { url } for redirect. Requires existing stripe_customer_id on merchant.

## Freight calculation engine
Lives in Quote.js (client-side) AND calculate-freight/index.ts (server-side)
IMPORTANT: Keep both in sync — if engine logic changes, update both files

Multi-item: qty + weight + L/W/H per item
Chargeable = MAX(actual, cubic)
Cubic weight formula: L(cm) × W(cm) × H(cm) × cubicFactor / 1,000,000 — uses carrier's own cubicFactor from parsed_data (fallback: 250). Standard domestic = 250, air freight = 333, some regional = 200.
Model B: MAX(basicCharge + chargeable × perKgRate, minimumCharge)
Surcharge triggers: auto, auto_override, item_weight, consignment_weight, always, never
  - item_weight: fires if maxItemWeight > rule.weightKg
  - consignment_weight: fires if totalWeight > rule.weightKg
  - auto_override: uses rule.weightKg (consignment) and rule.lengthCm (overlength)
Overlength 4–8m: 400–800cm range; over 8m: >800cm, POA warning
Full chain: freight + fuel levy + surcharges + margin + GST
Free shipping: 3-step (threshold → exempt → surcharges), smart vs true mode

## THREE PRICING MODELS — DO NOT CHANGE
Model A: Weight break table — flat rate per zone per weight range
Model B: Basic + per kg — MAX(basic + weight × rate, minimum)
Model C: Depot-to-depot — Mainfreight style

## Key product decisions — DO NOT CHANGE
- Merchants upload their own files, no pre-loaded carrier data
- AI handles any format: CSV, Excel, PDF, any carrier
- Single origin warehouse to start (multi-warehouse logged for future)
- Fuel levy editable per carrier, not baked into rates
- GST configurable: ex GST (B2B) or inc GST (B2C) — Quote page only; WooCommerce uses its own tax
- Surcharges NOT shown to customer — merchant sees full breakdown only
- Customer sees one clean freight total
- Auto surcharge triggers use carrier's own extracted thresholds
- Free shipping can be exempted per product/item

## Known decisions
- WooCommerce plugin zip is committed to the repo and served from GitHub raw URL — do NOT re-add to .gitignore. If plugin PHP changes, rebuild with: `cd ~/Downloads/shippingiq/woocommerce-plugin && zip -r shippingiq.zip shippingiq/` then commit the new zip.
- **NEVER rename the plugin folder** — renaming `woocommerce-plugin/shippingiq` to the long slug broke a local WordPress installation (7 May 2026). The folder must stay as `shippingiq`. The WP.org slug `shippingiq-freight-rates-for-woocommerce` is the directory listing slug only — it does not dictate the local folder name.
- Supabase handle_new_user trigger: manually maintained in Supabase SQL editor — not in codebase. Must include email field in both INSERT statements.
- profiles table has email NOT NULL column — handle_new_user trigger must always insert NEW.email
- Zone name column detection: recognises 'ratinglocation', 'rating location', 'rating_location', 'depot', 'service area' as zone name headers in addition to standard 'zone', 'zone name' etc. Added to support Mainfreight MFT_Rating_Locations.xlsx (RatingLocation column).
- Model C carrier card shows destination count ("261 destinations") not zone count — zones.length was always 1 for Model C (single origin depot). Carrier card now checks pricingModel === 'C' and uses modelCRates.length instead.

## Known merchant education points
- Postcode zone file is optional in the upload form — but without postcode data the carrier cannot calculate any quotes. Merchants either upload a zone file OR use the "Postcode Ranges" button after saving to enter ranges manually. App shows a "No zone file" amber badge on carrier cards and a Dashboard banner warning when postcodeMap is empty.
- Some carriers (including StarTrack) don't publish postcode zone files publicly. Merchants must contact their account manager and ask specifically for a postcode-to-zone mapping file (CSV or Excel), or use the manual postcode range entry feature.
- StarTrack Fixed Price Premium is Model A (weight break flat rate), not Model B. AI correctly detects this. Both services can coexist in the same carrier.

## WooCommerce Plugin — design decisions
### Carrier eligibility at checkout
1. Weight/dimension limits (carriers.eligibility_rules): maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm — if any cart item exceeds limit, carrier excluded. 0 = no limit.
2. Product tags (WooCommerce): shippingiq-only-[slug] and shippingiq-exclude-[slug]
3. Logic: passes dim/weight check AND no exclusion tag

### Plugin settings (WooCommerce admin)
- API URL (calculate-freight endpoint), Merchant ID, Display mode (all/cheapest/priority)

### Philosophy
- Simple by default: add carrier, upload files, done
- Rules only for exceptions
- "My carriers handle everything unless I say otherwise"

### Split shipment — parked for v2

## Mobile responsiveness — design decision
- **Landing page**: fully responsive (900px + 560px breakpoints) — fixed and deployed 3 May 2026
- **App pages (Dashboard, Carriers, Quote, Rules, etc)**: zero responsive CSS — desktop-first by design. Merchants use on desktop. Mobile app pages deferred until after Bradshaw goes live.
- If mobile app is needed in future: Quote.js uses a fixed `3fr 2fr` two-column grid and a 7-column items input grid with fixed pixel widths — these are the main breakpoints to tackle first.

## What to build next
- Ask first merchant to leave a WordPress.org review
- Monitor WordPress.org search visibility (allow 2–4 weeks)
- Continue adding blog posts (zero-deploy — GitHub only)
- ImporterIQ and MarginIQ — move to GitHub/Claude Code workflow
- Shopify and Magento plugins
- Shared freight calculation module (logic duplicated between Quote.js and calculate-freight)
- Annual pricing option (logged, not building yet)

## Pre-launch testing checklist

### Upload guardrails
- [ ] Hash check: delete a carrier, re-upload same files, click Analyse — should show "Files unchanged — using existing analysis." with no AI call
- [ ] Rate limit: upload 11 carriers within 24h — 11th blocked with "Daily upload limit reached (10/day)..."
- [ ] Admin override: `UPDATE merchants SET upload_limit_exempt = true WHERE id = '[id]'` — 11th upload should succeed
- [ ] Re-upload confirm: enter same carrier name as existing active carrier, upload files, click Analyse — confirmation modal appears
- [ ] Disable after analysis: carrier name + file inputs greyed out after analysis completes until Save or Cancel

### Freight calculation
- [ ] Quote with postcode in zone file returns correct rate (Model B: verify basic + per-kg formula)
- [ ] Quote with unknown postcode returns clear error, not crash
- [ ] Fuel levy % applies correctly
- [ ] Surcharge auto-triggers fire correctly (weight threshold, length range)
- [ ] item_weight trigger fires when single item exceeds threshold
- [ ] consignment_weight trigger fires when total weight exceeds threshold
- [ ] Smart free shipping: surcharge voids free shipping
- [ ] True free shipping: always $0 regardless of surcharges
- [ ] GST toggle: ex-GST vs inc-GST totals correct
- [ ] FREE carrier detail shows merchant cost, not $0

### WooCommerce plugin
- [ ] Rates appear at checkout for a real cart
- [ ] Carrier eligibility filtering excludes carriers where item exceeds maxWeightKg/maxLengthCm
- [ ] Product tag shippingiq-only-[slug] restricts to that carrier
- [ ] Product tag shippingiq-exclude-[slug] removes that carrier
- [ ] Cheapest-only display mode shows single lowest rate
- [ ] Priority display mode shows top-ranked carrier only

## Test files available
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows (MFT_Rating_Locations.xlsx), Model C depot-to-depot — confirmed working end to end
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne

### Mainfreight confirmed working pipeline
- Rate card: PDF → Rate Card Converter → CSV with standard OriginDepot,Destination,... header
- Zone file: Excel (MFT_Rating_Locations.xlsx) — columns: Suburb, Post Code, State, RatingLocation
- Surcharge schedule: PDF — read as base64 document block by rapid-api surcharges mode
- Model C browser parsing: buildModelCRatesFromCSV detects standard header, extracts all 261 rows
- RatingLocation column correctly mapped to zone field after zone parser fix (see Known Decisions)
- Carrier card shows "261 destinations" (not "1 zones") to standard 'zone', 'zone name' etc. Added to support Mainfreight MFT_Rating_Locations.xlsx (RatingLocation column).
- Model C carrier card shows destination count ("261 destinations") not zone count — zones.length was always 1 for Model C (single origin depot). Carrier card now checks pricingModel === 'C' and uses modelCRates.length instead.

## Known merchant education points
- Postcode zone file is optional in the upload form — but without postcode data the carrier cannot calculate any quotes. Merchants either upload a zone file OR use the "Postcode Ranges" button after saving to enter ranges manually. App shows a "No zone file" amber badge on carrier cards and a Dashboard banner warning when postcodeMap is empty.
- Some carriers (including StarTrack) don't publish postcode zone files publicly. Merchants must contact their account manager and ask specifically for a postcode-to-zone mapping file (CSV or Excel), or use the manual postcode range entry feature.
- StarTrack Fixed Price Premium is Model A (weight break flat rate), not Model B. AI correctly detects this. Both services can coexist in the same carrier.

## WooCommerce Plugin — design decisions
### Carrier eligibility at checkout
1. Weight/dimension limits (carriers.eligibility_rules): maxWeightKg, maxLengthCm, maxWidthCm, maxHeightCm — if any cart item exceeds limit, carrier excluded. 0 = no limit.
2. Product tags (WooCommerce): shippingiq-only-[slug] and shippingiq-exclude-[slug]
3. Logic: passes dim/weight check AND no exclusion tag

### Plugin settings (WooCommerce admin)
- API URL (calculate-freight endpoint), Merchant ID, Display mode (all/cheapest/priority)

### Philosophy
- Simple by default: add carrier, upload files, done
- Rules only for exceptions
- "My carriers handle everything unless I say otherwise"

### Split shipment — parked for v2

## Mobile responsiveness — design decision
- **Landing page**: fully responsive (900px + 560px breakpoints) — fixed and deployed 3 May 2026
- **App pages (Dashboard, Carriers, Quote, Rules, etc)**: zero responsive CSS — desktop-first by design. Merchants use on desktop. Mobile app pages deferred until after Bradshaw goes live.
- If mobile app is needed in future: Quote.js uses a fixed `3fr 2fr` two-column grid and a 7-column items input grid with fixed pixel widths — these are the main breakpoints to tackle first.

## What to build next
### Next session
1. **Custom domain** — register shippingiq.com.au, point to Netlify, update Supabase Auth redirect URLs and APP_URL secret.
2. **WordPress.org plugin review** — second round of feedback addressed 7 May 2026 (text domain + explicit API domain in External Services). Submitted as shippingiq-submit-v4.zip, awaiting reviewer response. WP.org slug: `shippingiq-freight-rates-for-woocommerce`. Once approved, update Resources page download link to point to wordpress.org/plugins/shippingiq-freight-rates-for-woocommerce instead of GitHub raw URL.
3. **Bradshaw onboarding** — get first real merchant live, support through carrier upload and WooCommerce setup.
4. **Annual pricing option** — consider $39/mo AUD billed annually (saves ~20%). Add as second Pro option on Pricing and Landing pages. Requires new Stripe price + new STRIPE_PRICE_PRO_ANNUAL env var.

### Already done (3 May 2026)
- ✓ Netlify deployed (latest build live at https://neon-pie-9a1542.netlify.app)
- ✓ Zoho email live (support@shippingiq.com.au)
- ✓ Landing page mobile responsiveness fixed
- ✓ WordPress.org submission sent (pending review)

### Already done (6 May 2026)
- ✓ WordPress.org review feedback addressed: plugin renamed, External Services section added, class renamed, loudman666 added to contributors, new slug requested

### Already done (7 May 2026)
- ✓ Text domain updated to `shippingiq-freight-rates-for-woocommerce` in all 17 gettext functions (class-wc-shipping-shippingiq.php) — `$this->id` left unchanged as `shippingiq`
- ✓ External Services section in readme.txt updated: explicit API domain `soaxvqkkecqzarwmbeip.supabase.co`, direct /terms and /privacy links
- ✓ Terms page live at shippingiq.com.au/terms
- ✓ Privacy page live at shippingiq.com.au/privacy
- ✓ Local WordPress test site rebuilt fresh via Local by Flywheel (shippingiq-test.local) — Allied Express confirmed working at postcode 3000
- ✓ Plugin submitted as shippingiq-submit-v4.zip — awaiting WordPress.org review response
- ✓ Netlify deployed with /terms and /privacy pages
- ✓ All code committed and pushed to GitHub

## Pre-launch testing checklist

### Upload guardrails
- [ ] Hash check: delete a carrier, re-upload same files, click Analyse — should show "Files unchanged — using existing analysis." with no AI call
- [ ] Rate limit: upload 11 carriers within 24h — 11th blocked with "Daily upload limit reached (10/day)..."
- [ ] Admin override: `UPDATE merchants SET upload_limit_exempt = true WHERE id = '[id]'` — 11th upload should succeed
- [ ] Re-upload confirm: enter same carrier name as existing active carrier, upload files, click Analyse — confirmation modal appears
- [ ] Disable after analysis: carrier name + file inputs greyed out after analysis completes until Save or Cancel

### Freight calculation
- [ ] Quote with postcode in zone file returns correct rate (Model B: verify basic + per-kg formula)
- [ ] Quote with unknown postcode returns clear error, not crash
- [ ] Fuel levy % applies correctly
- [ ] Surcharge auto-triggers fire correctly (weight threshold, length range)
- [ ] item_weight trigger fires when single item exceeds threshold
- [ ] consignment_weight trigger fires when total weight exceeds threshold
- [ ] Smart free shipping: surcharge voids free shipping
- [ ] True free shipping: always $0 regardless of surcharges
- [ ] GST toggle: ex-GST vs inc-GST totals correct
- [ ] FREE carrier detail shows merchant cost, not $0

### WooCommerce plugin
- [ ] Rates appear at checkout for a real cart
- [ ] Carrier eligibility filtering excludes carriers where item exceeds maxWeightKg/maxLengthCm
- [ ] Product tag shippingiq-only-[slug] restricts to that carrier
- [ ] Product tag shippingiq-exclude-[slug] removes that carrier
- [ ] Cheapest-only display mode shows single lowest rate
- [ ] Priority display mode shows top-ranked carrier only

### Production readiness
- [x] Remove all error_log() calls from WooCommerce plugin
- [x] Enable WooCommerce rate caching (5-min transient)
- [ ] Enable Supabase RLS on all tables

## Test files available
- test_rate_card.csv / .xlsx / .pdf
- test_zone_file.csv / .xlsx
- test_surcharges.csv / .pdf
These simulate Allied/Mainfreight/StarTrack style files.

## Real carrier file structures (AI handles any format)
Allied Express: Excel, Model B, origin depots across top columns, zones down side
Mainfreight: Excel zone file 15,976 rows (MFT_Rating_Locations.xlsx), Model C depot-to-depot — confirmed working end to end
StarTrack: PDF rate card, mix of Model A and Model B services
Hunter Express: PDF, Model B, single origin Melbourne

### Mainfreight confirmed working pipeline
- Rate card: PDF → Rate Card Converter → CSV with standard OriginDepot,Destination,... header
- Zone file: Excel (MFT_Rating_Locations.xlsx) — columns: Suburb, Post Code, State, RatingLocation
- Surcharge schedule: PDF — read as base64 document block by rapid-api surcharges mode
- Model C browser parsing: buildModelCRatesFromCSV detects standard header, extracts all 261 rows
- RatingLocation column correctly mapped to zone field after zone parser fix (see Known Decisions)
- Carrier card shows "261 destinations" (not "1 zones")
