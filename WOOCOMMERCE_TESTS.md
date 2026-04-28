# ShippingIQ WooCommerce Plugin — Test Plan

## Before you start

- ShippingIQ app running at http://localhost:3000 (or production URL)
- At least one carrier uploaded and active with a valid zone file and rate card
- WooCommerce plugin installed and activated, plugin settings configured:
  - ShippingIQ API URL: your `calculate-freight` edge function URL
  - Merchant ID: your merchant UUID
- WooCommerce shipping zone set up with ShippingIQ as the shipping method
- WP debug logging enabled (`define('WP_DEBUG_LOG', true)` in wp-config.php) — tail `wp-content/debug.log` if tests fail unexpectedly

---

## 1. Basic Rate Calculation

### Test 1.1 — Single item, known weight, known postcode

**Setup required:**
- In ShippingIQ: note the carrier name, origin depot, and fuel levy %
- In WooCommerce: create a simple product, set weight to **10 kg**, leave dimensions blank
- Note a postcode that exists in the carrier's zone file (e.g. 3000 for Melbourne)

**Steps:**
1. In ShippingIQ → Get a Quote: enter postcode `3000`, add one item with weight `10 kg`, no dimensions. Note the freight total shown.
2. In WooCommerce: add the product to cart, proceed to checkout, enter a Melbourne billing/shipping address (postcode `3000`).
3. Observe the shipping options shown.

**Expected result:** The rate shown at WooCommerce checkout matches the freight total from ShippingIQ Get a Quote (before GST if your store is ex-GST, inclusive if inc-GST).

- [ ] Pass / [ ] Fail

---

### Test 1.2 — Single item, higher weight bracket

**Setup required:** Same product as 1.1, but change weight to **50 kg**.

**Steps:**
1. In ShippingIQ → Get a Quote: postcode `3000`, weight `50 kg`. Note freight total.
2. WooCommerce checkout with same address.

**Expected result:** Rate matches Get a Quote. Verifies the weight bracket or per-kg calculation scales correctly.

- [ ] Pass / [ ] Fail

---

### Test 1.3 — Regional postcode

**Setup required:** Identify a regional postcode in the carrier's zone file that maps to a different zone than metro (e.g. `3350` for Ballarat VIC or `2640` for Albury NSW).

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3350`, weight `10 kg`. Note rate.
2. WooCommerce checkout with postcode `3350`.

**Expected result:** Rate matches Get a Quote. Verifies zone lookup works for non-metro postcodes.

- [ ] Pass / [ ] Fail

---

## 2. Multi-Item Tests

### Test 2.1 — Two items, additive weight

**Setup required:**
- Product A: weight `5 kg`, no dimensions
- Product B: weight `8 kg`, no dimensions

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, add two items — Item 1: qty 1, weight 5 kg; Item 2: qty 1, weight 8 kg. Note rate.
2. WooCommerce: add Product A × 1 and Product B × 1 to cart. Checkout to postcode `3000`.

**Expected result:** Rate matches Get a Quote (total chargeable weight = 13 kg).

- [ ] Pass / [ ] Fail

---

### Test 2.2 — Multiple quantities of same item

**Setup required:** Product A: weight `5 kg`, no dimensions.

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, one item — qty `3`, weight `5 kg`. Note rate (total actual weight = 15 kg).
2. WooCommerce: add Product A × 3 to cart. Checkout to postcode `3000`.

**Expected result:** Rate matches Get a Quote. Verifies qty multiplier is applied correctly.

- [ ] Pass / [ ] Fail

---

## 3. Cubic Weight Tests

### Test 3.1 — Cubic weight exceeds actual weight

**Setup required:**
- Create product: weight `2 kg`, dimensions L `60 cm` × W `60 cm` × H `60 cm`
- Cubic weight formula: (60 × 60 × 60) / 4000 = **54 kg**. Chargeable weight should be 54 kg.

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, add item — qty 1, weight `2 kg`, L `60`, W `60`, H `60`. Confirm chargeable weight shown is 54 kg. Note rate.
2. WooCommerce: add product × 1 to cart. Checkout to postcode `3000`.

**Expected result:** Rate matches Get a Quote at 54 kg chargeable weight, not 2 kg.

- [ ] Pass / [ ] Fail

---

### Test 3.2 — Actual weight exceeds cubic weight

**Setup required:**
- Create product: weight `20 kg`, dimensions L `20 cm` × W `20 cm` × H `20 cm`
- Cubic weight: (20 × 20 × 20) / 4000 = **2 kg**. Chargeable weight should be 20 kg.

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, weight `20 kg`, L `20`, W `20`, H `20`. Confirm chargeable weight is 20 kg.
2. WooCommerce: add product to cart. Checkout to postcode `3000`.

**Expected result:** Rate matches Get a Quote at 20 kg chargeable weight.

- [ ] Pass / [ ] Fail

---

### Test 3.3 — Mixed cart: one cubic-heavy, one weight-heavy

**Setup required:**
- Product A: weight `2 kg`, dimensions L `60` × W `60` × H `60` (cubic = 54 kg)
- Product B: weight `30 kg`, no dimensions

**Steps:**
1. ShippingIQ → Get a Quote: two items — Item 1: qty 1, weight 2, dims 60/60/60; Item 2: qty 1, weight 30. Note rate.
2. WooCommerce: add A × 1 and B × 1. Checkout to postcode `3000`.

**Expected result:** Rate matches Get a Quote. Total actual = 32 kg, total cubic = 54 kg, chargeable = 54 kg.

- [ ] Pass / [ ] Fail

---

## 4. Surcharge Tests

### Test 4.1 — Weight-triggered surcharge (e.g. Tailgate Delivery)

**Setup required:**
1. In ShippingIQ → Carriers → Surcharge Rules for your carrier: set **Tailgate Delivery** to `On — automatic (carrier triggers)`. Save.
2. Note the carrier's tailgate weight threshold (shown in the Threshold column when set to auto).
3. In WooCommerce: create a product with weight **above** the tailgate threshold (e.g. if threshold is 500 kg, set weight to `600 kg`).

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, weight above tailgate threshold. Confirm tailgate surcharge appears in breakdown.
2. WooCommerce: add heavy product to cart. Checkout to postcode `3000`. Note total freight charged.

**Expected result:** WooCommerce freight total includes the tailgate surcharge amount. Total matches Get a Quote.

- [ ] Pass / [ ] Fail

---

### Test 4.2 — Length-triggered surcharge (Overlength 4–8m)

**Setup required:**
1. In ShippingIQ → Surcharge Rules: set **Overlength 4–8m** to `On — automatic (carrier triggers)`. Save.
2. In WooCommerce: create a product with dimensions L `500 cm` (5 m), W `50 cm`, H `50 cm`, weight `20 kg`.

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, weight `20 kg`, L `500`, W `50`, H `50`. Confirm overlength surcharge appears.
2. WooCommerce: add product to cart. Checkout to postcode `3000`.

**Expected result:** Freight total includes the overlength surcharge. Total matches Get a Quote.

- [ ] Pass / [ ] Fail

---

### Test 4.3 — Surcharge does NOT trigger below threshold

**Setup required:** Same as Test 4.1 — Tailgate on auto. Create a product with weight **below** the threshold (e.g. `10 kg`).

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, weight `10 kg`. Confirm no tailgate surcharge in breakdown.
2. WooCommerce: add light product to cart. Checkout to postcode `3000`.

**Expected result:** No surcharge added. Rate matches Get a Quote without tailgate.

- [ ] Pass / [ ] Fail

---

### Test 4.4 — Surcharge set to "Always — every quote"

**Setup required:**
1. In ShippingIQ → Surcharge Rules: set a surcharge (e.g. **Hand Load**) to `Always — every quote`. Save.
2. Create a product: weight `1 kg`, no dimensions (would not normally trigger any surcharge).

**Steps:**
1. ShippingIQ → Get a Quote: postcode `3000`, weight `1 kg`. Confirm the always-on surcharge appears.
2. WooCommerce: add product to cart. Checkout to postcode `3000`.

**Expected result:** Surcharge included regardless of weight or dimensions. Matches Get a Quote.

- [ ] Pass / [ ] Fail

---

## 5. Free Shipping Tests

### Test 5.1 — Order value below free shipping threshold

**Setup required:**
1. In ShippingIQ → Rules: enable free shipping, set threshold to e.g. `$200`.
2. WooCommerce: product priced at `$100`.

**Steps:**
1. Add one product ($100) to cart. Checkout to any valid postcode.

**Expected result:** Freight rates shown normally — no free shipping option.

- [ ] Pass / [ ] Fail

---

### Test 5.2 — Order value at or above free shipping threshold

**Setup required:** Same as 5.1. Product priced at `$250` (above $200 threshold).

**Steps:**
1. Add one product ($250) to cart. Checkout to any valid postcode.

**Expected result:** Free shipping shown. No freight charge applied.

- [ ] Pass / [ ] Fail

---

### Test 5.3 — Mixed cart crosses threshold

**Setup required:** Product A: $80. Product B: $130.

**Steps:**
1. Add Product A × 1 and Product B × 1 to cart (total = $210, above $200 threshold). Checkout.

**Expected result:** Free shipping shown.

- [ ] Pass / [ ] Fail

---

## 6. Exempt From Free Shipping

### Test 6.1 — Single exempt product above threshold

**Setup required:**
1. In ShippingIQ → Rules: free shipping enabled, threshold `$200`.
2. In WooCommerce: create a product priced at `$300`. Add WooCommerce tag: `shippingiq-exempt` (or however your store marks exempt items — check plugin README for the exact tag format).

   > **Note:** The exempt-from-free-shipping flag in ShippingIQ is per order item. The WooCommerce plugin reads each cart item's properties. Confirm with your plugin implementation how the exempt flag is passed (product meta or tag).

**Steps:**
1. Add exempt product ($300) alone to cart. Checkout to valid postcode.

**Expected result:** Freight is still charged even though order value exceeds threshold. The exempt flag overrides free shipping.

- [ ] Pass / [ ] Fail

---

### Test 6.2 — Mixed cart: exempt + non-exempt, above threshold

**Setup required:**
- Product A (non-exempt): $150
- Product B (exempt): $100
- Total: $250 (above threshold)

**Steps:**
1. Add both products to cart. Checkout.

**Expected result:** Freight charged (not free) because an exempt item is in the cart.

- [ ] Pass / [ ] Fail

---

## 7. Carrier Eligibility Tests

### Test 7.1 — Item weight exceeds carrier max weight limit

**Setup required:**
1. In ShippingIQ → Carriers: click **Carrier Limits** on one carrier (e.g. Allied Express). Set Max Weight to `25 kg`. Save.
2. Ensure at least one other carrier has no weight limit set.
3. WooCommerce: create a product with weight `30 kg`.

**Steps:**
1. Add the 30 kg product to cart. Checkout to a valid postcode.

**Expected result:** The carrier with the 25 kg limit does NOT appear in the shipping options. The carrier with no limit does appear.

- [ ] Pass / [ ] Fail

---

### Test 7.2 — Item weight below all carrier limits

**Setup required:** Same carrier limit setup as 7.1. Product weight `10 kg` (below 25 kg limit).

**Steps:**
1. Add product to cart. Checkout.

**Expected result:** All carriers appear (including the one with the 25 kg limit, because 10 kg is within limit).

- [ ] Pass / [ ] Fail

---

### Test 7.3 — Item length exceeds carrier max length

**Setup required:**
1. In ShippingIQ → Carriers: set Max Length to `200 cm` on one carrier.
2. WooCommerce: product with dimensions L `250 cm`, W `30 cm`, H `30 cm`.

**Steps:**
1. Add product to cart. Checkout.

**Expected result:** Carrier with 200 cm length limit excluded. Other carriers still shown.

- [ ] Pass / [ ] Fail

---

### Test 7.4 — Product tag forces specific carrier only

**Setup required:**
1. In WooCommerce: create a product and add tag `shippingiq-only-[carrier-slug]` (e.g. `shippingiq-only-allied-express`). Carrier slug is the carrier name lowercased with spaces replaced by hyphens.
2. Ensure at least two carriers are active.

**Steps:**
1. Add the tagged product to cart. Checkout.

**Expected result:** Only the tagged carrier appears. All others are excluded.

- [ ] Pass / [ ] Fail

---

### Test 7.5 — Product tag excludes specific carrier

**Setup required:**
1. WooCommerce: create a product and add tag `shippingiq-exclude-[carrier-slug]`.
2. Ensure at least two carriers are active.

**Steps:**
1. Add the tagged product to cart. Checkout.

**Expected result:** The excluded carrier does NOT appear. All other carriers do.

- [ ] Pass / [ ] Fail

---

## 8. Display Mode Tests

### Test 8.1 — All eligible carriers mode

**Setup required:**
1. In WooCommerce → Settings → Shipping → ShippingIQ: set Display Mode to **All eligible carriers**.
2. Ensure two or more carriers are active with valid zone and rate data.

**Steps:**
1. Add a product to cart. Checkout to a valid postcode.

**Expected result:** Multiple carrier options shown, each with its own rate.

- [ ] Pass / [ ] Fail

---

### Test 8.2 — Cheapest only mode

**Setup required:**
1. In WooCommerce → ShippingIQ settings: set Display Mode to **Cheapest only**.
2. Same multi-carrier setup as 8.1.

**Steps:**
1. Add same product to cart. Checkout to same postcode.

**Expected result:** Only one shipping option shown — the cheapest carrier rate.

- [ ] Pass / [ ] Fail

---

### Test 8.3 — Cheapest is consistent with all-carriers mode

**Setup required:** Complete both Test 8.1 and 8.2 for the same cart and postcode.

**Steps:**
1. Note all rates from Test 8.1. Identify the cheapest.
2. Confirm the single rate shown in Test 8.2 is the same carrier and same price.

**Expected result:** Cheapest-only mode shows the same rate as the lowest in all-carriers mode.

- [ ] Pass / [ ] Fail

---

## 9. Error Cases

### Test 9.1 — Invalid postcode (not in zone file)

**Setup required:** Identify a postcode that does NOT exist in any active carrier's zone file. Use a clearly invalid postcode like `9999` or `0001`.

**Steps:**
1. Add a product to cart. Proceed to checkout. Enter postcode `9999` in the shipping address.

**Expected result:** No ShippingIQ shipping options shown. WooCommerce should show either no shipping available or a fallback method if one exists. No PHP fatal error or white screen.

- [ ] Pass / [ ] Fail

---

### Test 9.2 — Carrier with no postcode data

**Setup required:**
1. In ShippingIQ: add a carrier with a rate card only — intentionally skip the zone file upload. Confirm the carrier shows the postcode warning on the carrier card.
2. Ensure at least one other carrier has valid postcode data.

**Steps:**
1. Add a product to cart. Checkout to a valid postcode (valid for the other carrier, not this one).

**Expected result:** The carrier without postcode data returns an error or no rate (not a crash). The other carrier's rate still appears correctly.

- [ ] Pass / [ ] Fail

---

### Test 9.3 — Postcode exists in zone file but no rate for that zone

**Setup required:** This is an edge case — the zone file maps the postcode to a zone, but the rate card has no rate row for that zone. This can happen if the zone file and rate card are from different versions of the carrier's data.

If you can reproduce this: manually edit a rate card CSV to remove one zone, re-upload the carrier, and use a postcode that maps to the removed zone.

**Steps:**
1. Add a product to cart. Checkout to the affected postcode.

**Expected result:** That carrier returns no rate or an error message. Other carriers still show correctly.

- [ ] Pass / [ ] Fail

---

### Test 9.4 — Edge function unreachable

**Setup required:** Temporarily point the plugin's API URL to an invalid endpoint (e.g. add a typo to the URL in WooCommerce → ShippingIQ settings).

**Steps:**
1. Add a product to cart. Checkout.
2. Restore the correct URL after testing.

**Expected result:** No ShippingIQ rates shown. No fatal error. WooCommerce checkout still loads and allows completing the order with any other available shipping methods.

- [ ] Pass / [ ] Fail

---

## Test run log

| Test | Date | Tester | Result | Notes |
|------|------|--------|--------|-------|
| 1.1  |      |        |        |       |
| 1.2  |      |        |        |       |
| 1.3  |      |        |        |       |
| 2.1  |      |        |        |       |
| 2.2  |      |        |        |       |
| 3.1  |      |        |        |       |
| 3.2  |      |        |        |       |
| 3.3  |      |        |        |       |
| 4.1  |      |        |        |       |
| 4.2  |      |        |        |       |
| 4.3  |      |        |        |       |
| 4.4  |      |        |        |       |
| 5.1  |      |        |        |       |
| 5.2  |      |        |        |       |
| 5.3  |      |        |        |       |
| 6.1  |      |        |        |       |
| 6.2  |      |        |        |       |
| 7.1  |      |        |        |       |
| 7.2  |      |        |        |       |
| 7.3  |      |        |        |       |
| 7.4  |      |        |        |       |
| 7.5  |      |        |        |       |
| 8.1  |      |        |        |       |
| 8.2  |      |        |        |       |
| 8.3  |      |        |        |       |
| 9.1  |      |        |        |       |
| 9.2  |      |        |        |       |
| 9.3  |      |        |        |       |
| 9.4  |      |        |        |       |
