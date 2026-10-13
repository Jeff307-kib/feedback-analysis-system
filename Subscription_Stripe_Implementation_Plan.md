# Subscription & Stripe Payment – Complete Implementation Plan

## Overview

Implement the subscription system for the **Electronic Retail Manager** with **embedded Stripe Payment Element** (no redirect).

### Supported Use Cases
- View Subscription Plans
- Subscribe to Plan (monthly)
- Process Payment (embedded form)
- Authorize Transaction via Stripe
- Display Payment Error
- Cancel Subscription
- View Payment History

### Important Context
- You already have a **Subscription Plan table** in your database.
- Super Admin can Create / Edit / Delete plans.
- Plans are **monthly**.
- Payment form must be **embedded** (inside a modal).
- On success → show notification + success modal (no full page redirect).

---

## 1. High-Level Architecture

```
Super Admin
   ↓ (creates/edits plans)
Your Database (Subscription Plans)
   ↓
Retail Manager views plans
   ↓
Clicks Subscribe
   ↓
Backend creates Stripe Customer (if needed) + Subscription
   ↓
Frontend shows Payment Element inside Modal
   ↓
User pays
   ↓
Stripe confirms → Webhook → Backend activates subscription
   ↓
Success Modal + Toast
```

---

## 2. Database Requirements

### Existing Table: `subscription_plans` (already exists)
Make sure it has at least these fields (add if missing):

| Field               | Type      | Notes |
|---------------------|-----------|-------|
| id                  | UUID / Int| Primary key |
| name                | String    | e.g. "Pro", "Business" |
| description         | Text      | Optional |
| price               | Decimal   | Monthly price (e.g. 29.00) |
| currency            | String    | Default "usd" |
| stripe_price_id     | String    | **Important** – Stripe Price ID |
| stripe_product_id   | String    | Optional but recommended |
| is_active           | Boolean   | So Super Admin can soft-disable |
| created_at          | Timestamp | |
| updated_at          | Timestamp | |

> When Super Admin creates/edits a plan, the backend should also create or update the corresponding **Product + Price** in Stripe and save the `stripe_price_id`.

### New / Updated fields on `users` table

| Field                    | Type    | Notes |
|--------------------------|---------|-------|
| stripe_customer_id       | String  | Stripe Customer ID |
| stripe_subscription_id   | String  | Current active subscription |
| subscription_plan_id     | FK      | Link to your plans table |
| subscription_status      | String  | `active`, `canceled`, `past_due`, `incomplete`, etc. |
| current_period_end       | Timestamp | When the current month ends |

### Optional: `payment_history` / `invoices` table
Store basic invoice records for “View Payment History”.

---

## 3. Stripe Setup

### 3.1 Create Products & Prices (linked to your plans)

**Option A – Recommended (automatic)**  
When Super Admin creates or edits a plan in your admin panel:

1. Create (or update) a Stripe Product
2. Create a new monthly Price
3. Save `stripe_price_id` (and `stripe_product_id`) into your `subscription_plans` table

**Option B – Manual (for testing)**  
Go to Stripe Dashboard → Products → Create product → Add monthly price → Copy the Price ID into your database.

### 3.2 Webhook Events to Listen For

| Event                            | Action |
|----------------------------------|--------|
| `customer.subscription.created`  | Optional |
| `customer.subscription.updated`  | Update status & period end |
| `customer.subscription.deleted`  | Mark as canceled |
| `invoice.paid`                   | Record payment / extend period |
| `invoice.payment_failed`         | Mark as past_due + notify user |

---

## 4. API Endpoints

### 4.1 View Plans
```
GET /api/subscriptions/plans
```
Returns all active plans from your database (including price, name, features, etc.).

### 4.2 Get Current Subscription
```
GET /api/subscriptions/current
```
Returns the user’s current plan + status + next billing date.

### 4.3 Create Subscription (Start Payment)
```
POST /api/subscriptions/create
```
**Body**
```json
{
  "planId": "plan_123"
}
```

**Backend logic**
1. Get the plan from DB → read `stripe_price_id`
2. Get or create Stripe Customer for the user
3. Create a Stripe Subscription with `payment_behavior: "default_incomplete"`
4. Return:
```json
{
  "subscriptionId": "sub_...",
  "clientSecret": "pi_..._secret_..."
}
```

### 4.4 Cancel Subscription
```
POST /api/subscriptions/cancel
```
- Cancel at period end (recommended) or immediately
- Update local status

### 4.5 View Payment History
```
GET /api/subscriptions/payments
```
Return list of past invoices / payments (from your DB or by fetching from Stripe).

### 4.6 Stripe Webhook
```
POST /api/webhooks/stripe
```
- Verify Stripe signature
- Handle the events listed above
- Update user subscription status in your database

---

## 5. Frontend Implementation

### 5.1 View Plans Page
- Fetch plans from `GET /api/subscriptions/plans`
- Show cards: Name, Price/month, Features, “Subscribe” / “Current Plan” button
- Highlight the user’s current plan

### 5.2 Subscribe Flow (Embedded Modal)

1. User clicks **Subscribe** on a plan
2. Frontend calls `POST /api/subscriptions/create` with `planId`
3. Backend returns `clientSecret`
4. Open a **Modal** containing the Stripe **Payment Element**
5. User enters card details and clicks Pay
6. Stripe.js confirms the payment using the `clientSecret`
7. On success:
   - Close payment modal
   - Show **Success Modal** + Toast notification
   - Refresh current subscription data
8. On error:
   - Show error message inside the payment modal

### 5.3 Success Modal Content (example)
```
Payment Successful!
You are now subscribed to the Pro Plan.
Next billing date: 1 Nov 2026
[Go to Dashboard]
```

### 5.4 Cancel Subscription
- Button: “Cancel Subscription”
- Confirmation popup: “Are you sure? You will still have access until {current_period_end}.”
- Call cancel endpoint
- Show success toast

### 5.5 Payment History
- Simple table: Date | Amount | Status | Invoice link (optional)

---

## 6. Detailed Frontend Payment Modal Flow

```tsx
// Pseudo-code
const handleSubscribe = async (planId) => {
  const { clientSecret } = await api.createSubscription(planId);

  setClientSecret(clientSecret);
  setShowPaymentModal(true);
};

// Inside Payment Modal
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentElement />
  <button onClick={handleConfirmPayment}>Pay Now</button>
</Elements>
```

```tsx
const handleConfirmPayment = async () => {
  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: window.location.href, // not used for redirect in this flow
    },
    redirect: "if_required", // important – stay on page
  });

  if (error) {
    // show error in modal
  } else {
    // show success modal + toast
    // refetch current subscription
  }
};
```

---

## 7. Implementation Phases

### Phase 1 – Stripe + Plan Sync
- Add `stripe_price_id` (and optionally `stripe_product_id`) to your plans table
- When Super Admin creates/edits a plan → create/update Product + Price in Stripe
- Test with Stripe test mode

### Phase 2 – Core Subscription API
- `GET /plans`
- `GET /current`
- `POST /create` (returns clientSecret)
- Webhook endpoint + signature verification
- Update user subscription fields on webhook events

### Phase 3 – Frontend Plans + Payment Modal
- Plans listing page
- Payment modal with Stripe Payment Element
- Success modal + toast
- Error handling inside modal

### Phase 4 – Cancel + Payment History
- Cancel subscription (at period end)
- Payment history table
- Current plan status badge in the UI

### Phase 5 – Polish & Security
- Loading states
- Disable double-click on Pay
- Proper error messages
- Test failed payments, 3D Secure, etc. in Stripe test mode

---

## 8. Acceptance Criteria

- [ ] Super Admin can create/edit plans and they sync to Stripe (price_id saved)
- [ ] Retail Manager can view all active monthly plans
- [ ] Clicking Subscribe opens an embedded payment modal (no redirect)
- [ ] Successful payment shows success modal + notification
- [ ] Webhook correctly activates the subscription in the database
- [ ] User can see their current plan and next billing date
- [ ] User can cancel subscription (with confirmation)
- [ ] Payment history is visible
- [ ] Failed payments show clear error inside the modal
- [ ] All Stripe calls use test keys in development

---

## 9. Out of Scope (for now)

- Yearly plans
- Free trials
- Prorated upgrades/downgrades
- Stripe Customer Portal (can be added later)
- Multiple currencies
- Coupons / discount codes

---

**End of Plan**
