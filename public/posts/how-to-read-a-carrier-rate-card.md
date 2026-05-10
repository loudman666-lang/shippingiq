# How to Read a Carrier Rate Card (And What All Those Numbers Mean)

When you set up a freight account with an Australian carrier, they send you a rate card. It's usually an Excel file or PDF, full of tables, numbers, and abbreviations that aren't immediately obvious if you haven't dealt with freight before.

Understanding your rate card matters — both for setting up accurate shipping in your store, and for catching errors when a quote doesn't look right.

Here's a plain-English guide to what everything means.

---

## The basic structure

Most Australian carrier rate cards are built around two things: **zones** and **weight breaks**.

- **Zones** define how far the delivery is from the carrier's depot. Zone 1 might be metro Melbourne. Zone 8 might be remote Western Australia. The further the zone, the higher the rate.
- **Weight breaks** define the price at different weight thresholds. A 1kg parcel costs less than a 10kg parcel, which costs less than a 25kg parcel.

The rate card is essentially a grid: zones across the top, weight breaks down the side (or vice versa), with the price for each combination in the cells.

---

## Pricing models

Not all rate cards use the same pricing structure. There are three main models used by Australian carriers:

**Model A — Weight break table**
A fixed price for each weight/zone combination. You look up the zone, find the weight row, and that's your rate. Simple.

**Model B — Base charge + per kg rate**
A base charge applies to every consignment, plus an additional charge per kilogram. For example: $8.50 base + $1.20 per kg to Zone 3. This model is common with carriers like Allied Express.

**Model C — Depot-to-depot lookup**
Rates are based on the origin depot and destination depot, rather than zones. You look up your origin city and destination city to find the rate. Common with carriers that have fixed depot networks.

---

## Cubic weight

One of the most important (and most misunderstood) parts of freight pricing is cubic weight.

Carriers don't just charge based on actual weight. They also calculate the *cubic weight* of your parcel — essentially, how much space it takes up in the truck — and charge based on whichever is higher.

The formula is:

**Cubic weight = (length × width × height in cm) ÷ cubic factor**

For Australian domestic road freight, the cubic factor is usually **250**. So a parcel that's 60cm × 40cm × 30cm has a cubic weight of:

60 × 40 × 30 ÷ 250 = **288kg** (cubic)

If the parcel actually weighs 15kg, the carrier charges based on 288kg cubic weight — because that's what it costs them in truck space.

This is why bulky, lightweight items (furniture, homewares, sporting goods) cost so much to ship. Always check your rate card for the cubic factor — some carriers use a different number for air freight or specific lanes.

---

## Zones and postcode mapping

Your rate card tells you the price per zone, but it doesn't tell you which zone each postcode belongs to. That's a separate file — usually called a zone file or postcode file.

The zone file maps every Australian postcode to a zone number for your specific carrier and origin depot. A postcode might be Zone 3 from Melbourne but Zone 5 from Brisbane — the zone depends on distance from the depot serving your area.

If your carrier hasn't given you a zone file, ask for one. It's usually a CSV or Excel file with two columns: postcode and zone.

---

## Surcharges

The base rate in your rate card is rarely the final price. Carriers apply surcharges on top for various reasons:

- **Fuel levy** — a percentage added to every consignment, adjusted regularly based on fuel prices. Often 20–30% on top of the base rate.
- **Residential delivery** — extra charge for delivering to a home address rather than a business.
- **Tailgate** — charge for using a truck with a hydraulic tailgate to lower heavy items.
- **Hand unload** — charge when the driver is required to manually unload items rather than using a forklift.
- **Overlength / oversize** — extra charges when a consignment exceeds certain dimensions.
- **Dangerous goods** — surcharge for items classified as dangerous goods under Australian regulations.

These surcharges are usually listed in a separate table in your rate card document, or in a separate surcharge schedule your carrier provides.

---

## Minimum charges

Most carriers apply a minimum charge per consignment — even if the calculated rate works out lower. For example, if your rate card gives you a $4.80 rate for a small, light parcel but the minimum charge is $9.50, you pay $9.50.

Check your rate card for a minimum charge line — it's usually listed near the top of the pricing tables.

---

## How to use this in practice

When you're setting up freight in your WooCommerce store, you need all of this working together:

1. The customer's postcode maps to a zone (via your zone file)
2. The order weight (or cubic weight, whichever is higher) maps to a weight break
3. The rate for that zone and weight break is pulled from your rate card
4. Surcharges are added on top
5. The total is shown at checkout

Doing this manually — transcribing every rate into a plugin — is error-prone and time-consuming. Tools like ShippingIQ read your carrier's own file and do the mapping automatically.

---

*ShippingIQ reads your carrier rate card — any format, any carrier — and calculates accurate freight at WooCommerce checkout. [Start for free at shippingiq.com.au](https://shippingiq.com.au).*
