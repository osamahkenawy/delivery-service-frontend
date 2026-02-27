# Pricing Module — User Guide

## Overview

The Pricing module lets you control how delivery fees are calculated for every order. It has three parts:

1. **Pricing Rules** — Base fee structures per zone / client type
2. **Price Calculator** — Test what a customer would pay before creating an order
3. **Surge Pricing** — Time-based multipliers (rush hours, weekends, etc.)

---

## 1. Pricing Rules

### What is a Pricing Rule?

A pricing rule defines the delivery fee formula for a specific combination of **zone** and **client type**. When an order is placed, the system finds the best-matching active rule and calculates the fee.

### Fields Explained

| Field | Required | Description |
|---|---|---|
| **Rule Name** | ✅ | A descriptive label, e.g. "Standard Delivery – Dubai" |
| **Zone** | — | Which delivery zone this rule applies to. Leave empty = all zones |
| **Client Type** | — | `All Clients`, `Individual`, `Business`, or `VIP`. Default: All |
| **Base Price (AED)** | ✅ | The starting fee before any extras. Default: 15 AED |
| **Price per KM (AED)** | — | Extra charge per kilometer of distance (0 = no distance fee) |
| **Price per KG (AED)** | — | Extra charge per kilogram of package weight |
| **COD Fee (%)** | — | Percentage charged on Cash-on-Delivery amount (e.g. 3 = 3%) |
| **Express Surcharge (AED)** | — | Flat fee added when order type is "Express" |
| **Min Price (AED)** | — | Floor price — fee will never go below this. Default: 10 |
| **Max Price (AED)** | — | Ceiling price — fee will never exceed this. Default: 500 |
| **Rule Active** | — | Toggle on/off without deleting the rule |

### How to Create a Rule

1. Click **"+ Add Rule"** button in the top right
2. Fill in the rule name (required) and base price (required)
3. Optionally select a zone and client type
4. Set per-km / per-kg rates if you want distance or weight-based pricing
5. Set COD % and express surcharge if needed
6. Set min/max price limits
7. Click **"Create"**

### How to Edit / Delete

- Click the **pencil icon** (✏️) on any rule row to edit it
- Click the **trash icon** (🗑) to delete it (with confirmation)

### How the System Picks a Rule

When calculating a delivery fee, the system:
1. Looks for active rules matching the order's **zone** AND **client type**
2. If found, uses that specific rule
3. If not, falls back to rules with `zone = NULL` (any zone) or `client_type = all`
4. If no rules exist at all, defaults to a flat **15 AED**

---

## 2. Price Calculator

The calculator (right side of the page) lets you simulate delivery pricing **before creating an order**.

### How to Use

1. **Select a Zone** (required) — pick the delivery zone
2. **Order Type** — Standard, Express, Same Day, Scheduled, or Return
3. **Client Type** — All, Individual, Business, VIP
4. **Weight (kg)** (required) — package weight
5. **Distance (km)** — driving distance (optional, for per-km pricing)
6. **Cash on Delivery** — check the box and enter the COD amount if applicable
7. Click **"Calculate Price"**

### What You'll See

- **Estimated Price** — the final delivery fee in AED
- **Breakdown** — how the fee was composed:
  - Base Price
  - Distance Fee (if applicable)
  - Weight Fee (if applicable)
  - COD Fee (if applicable)
  - Express Surcharge (if applicable)
  - Surge Multiplier (if a surge rule is active right now)
- **Free Delivery** — if the system has a free delivery threshold configured and the order subtotal exceeds it

### Fee Calculation Formula

```
fee = base_price
    + (distance_km × price_per_km)
    + (weight_kg × price_per_kg)
    + (express_surcharge if order is express)
    + (cod_amount × cod_fee_pct / 100)

fee = fee × surge_multiplier  (if surge is active)

fee = clamp(fee, min_price, max_price)
```

---

## 3. Surge Pricing

Surge pricing lets you increase delivery fees during peak hours, specific days, or for specific zones.

### Fields Explained

| Field | Required | Description |
|---|---|---|
| **Name** | ✅ | Label, e.g. "Friday Peak Hours" |
| **Day of Week** | — | Sunday–Saturday, or "Every Day" for all days |
| **Zone** | — | Specific zone, or "All Zones" |
| **Start Hour** | — | Hour the surge starts (0–23). Default: 0 |
| **End Hour** | — | Hour the surge ends (0–23). Default: 23 |
| **Multiplier** | ✅ | Fee multiplier (1.0–5.0). E.g. 1.5 = 50% increase |
| **Active** | — | Enable/disable the surge rule |

### How to Create a Surge Rule

1. Scroll down to the **"⚡ Surge Pricing"** section
2. Click **"+ Add Surge"**
3. Give it a name (e.g. "Weekend Rush")
4. Choose a day or leave as "Every Day"
5. Set the time window (start and end hour)
6. Set the multiplier (e.g. 1.5 for 50% surcharge)
7. Optionally pick a zone
8. Click **"Create"**

### How Surge is Applied

When calculating a fee, the system checks:
- Is the **current time** within any active surge rule's window?
- Does the surge rule match the order's **zone**?
- If multiple surge rules match, the **highest multiplier** wins

The multiplier is applied **after** all base fees are summed but **before** min/max clamping.

### Example Surge Scenarios

| Scenario | Day | Hours | Multiplier | Effect |
|---|---|---|---|---|
| Friday lunch rush | Friday | 11:00–14:00 | 1.5× | 50% surcharge |
| Weekend all day | Friday + Saturday | 00:00–23:00 | 1.3× | 30% surcharge |
| Late night | Every day | 22:00–23:00 | 1.2× | 20% surcharge |
| Holiday special | — | 00:00–23:00 | 2.0× | Double pricing |

---

## 4. Practical Examples

### Example 1: Simple Flat-Rate Pricing

> "I want to charge 20 AED for all deliveries, no extras"

Create one rule:
- **Name**: Flat Rate
- **Base Price**: 20
- **All other fields**: 0 or empty
- **Min / Max**: 20 / 20

### Example 2: Zone + Weight-Based Pricing

> "Dubai = 15 AED base + 2 AED/kg. Abu Dhabi = 25 AED base + 3 AED/kg"

Create two rules:
1. **Name**: Dubai Delivery, **Zone**: Dubai, **Base**: 15, **Per KG**: 2
2. **Name**: Abu Dhabi Delivery, **Zone**: Abu Dhabi, **Base**: 25, **Per KG**: 3

### Example 3: Distance-Based Pricing for VIP

> "VIP clients pay 10 AED base + 1.5 AED/km. Others pay 15 + 2/km"

Create two rules:
1. **Name**: VIP Rate, **Client Type**: VIP, **Base**: 10, **Per KM**: 1.5
2. **Name**: Standard Rate, **Client Type**: All, **Base**: 15, **Per KM**: 2.0

The system picks VIP rule for VIP clients, standard for everyone else.

### Example 4: COD Handling

> "Charge 3% on all cash-on-delivery amounts"

Set **COD Fee (%)** = 3 on your pricing rule.
If a customer orders COD with 500 AED, the COD fee = 500 × 3% = 15 AED added to the delivery fee.

### Example 5: Express Orders

> "Express delivery costs 10 AED extra"

Set **Express Surcharge** = 10 on your pricing rule.
When order type is "Express", 10 AED is automatically added.

---

## 5. Free Delivery

Free delivery is configured through the **Settings** page, not the Pricing page. If a `free_delivery_min_order` setting exists:

- When the order subtotal ≥ threshold → delivery fee = **0 AED**
- The calculator will show "Free Delivery 🎉" instead of a price

---

## 6. Distance Calculator API

The backend also provides a helper endpoint to calculate distance between two GPS points:

```
POST /api/pricing/distance
{
  "pickup_lat": 25.2048,
  "pickup_lng": 55.2708,
  "delivery_lat": 25.0657,
  "delivery_lng": 55.1713
}
```

Returns:
```json
{
  "straight_line_km": 18.42,
  "estimated_road_km": 23.95
}
```

The road distance applies a 1.3× factor to the straight-line distance to approximate actual driving distance.

---

## 7. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pricing` | List all pricing rules |
| `POST` | `/api/pricing` | Create a pricing rule |
| `GET` | `/api/pricing/:id` | Get single rule |
| `PUT` | `/api/pricing/:id` | Update a rule |
| `DELETE` | `/api/pricing/:id` | Delete a rule |
| `POST` | `/api/pricing/calculate` | Calculate delivery fee |
| `GET` | `/api/pricing/surge` | List surge rules |
| `POST` | `/api/pricing/surge` | Create surge rule |
| `PUT` | `/api/pricing/surge/:id` | Update surge rule |
| `DELETE` | `/api/pricing/surge/:id` | Delete surge rule |
| `POST` | `/api/pricing/distance` | Calculate distance (Haversine) |
