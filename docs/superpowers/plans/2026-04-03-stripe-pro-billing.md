# Stripe Pro Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Stripe billing to launch the Pro tier at $29/month, enforce a 3-consultation limit for Free users, and provide subscription management via the Stripe billing portal.

**Architecture:** Add `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionPlan`, and `subscriptionStatus` fields to the Patient model. Stripe Checkout creates subscriptions; webhooks sync status back to the DB. A `subscription.ts` helper gates consultation creation.

**Tech Stack:** Stripe SDK (`stripe`), Next.js API routes, Prisma + SQLite (dev) / Supabase PostgreSQL (prod), Clerk auth.

---

### File Map

| File                                    | Action | Purpose                                                                                                       |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                  | Modify | Add billing fields to Patient model                                                                           |
| `prisma/migrations/...`                 | Create | Prisma migration for billing fields                                                                           |
| `src/lib/stripe.ts`                     | Create | Stripe client singleton                                                                                       |
| `src/lib/subscription.ts`               | Create | Subscription status check + consultation quota enforcement                                                    |
| `src/app/api/billing/checkout/route.ts` | Create | POST → create Stripe Checkout session, return URL                                                             |
| `src/app/api/billing/portal/route.ts`   | Create | POST → create Stripe billing portal session, return URL                                                       |
| `src/app/api/billing/webhook/route.ts`  | Create | POST → handle Stripe webhook events (subscription created/updated/deleted)                                    |
| `src/app/api/patient/profile/route.ts`  | Modify | Include `subscriptionPlan` and `subscriptionStatus` in response                                               |
| `src/app/api/consult/route.ts`          | Modify | Gate consultation creation behind quota check                                                                 |
| `src/app/pricing/page.tsx`              | Modify | Change Pro CTA from waitlist link to `/billing/checkout`                                                      |
| `src/app/patient/page.tsx`              | Modify | Show Pro badge + billing portal button in header                                                              |
| `.env.example`                          | Modify | Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` |
| `src/app/api/auth/webhook/route.ts`     | Modify | Create Stripe customer on user creation                                                                       |

---

### Task 1: Add billing fields to Prisma schema

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add billing fields to Patient model**

In `prisma/schema.prisma`, add the following fields to the `Patient` model after the `clerkUserId` line:

```prisma
  // Billing (Stripe)
  stripeCustomerId     String?
  stripeSubscriptionId String?
  subscriptionPlan     String  @default("free")   // "free" | "pro" | "partner"
  subscriptionStatus   String  @default("active")  // "active" | "past_due" | "canceled" | "paused"
  subscriptionPeriodEnd DateTime?
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd ~/Desktop/Projects/medicrew
npx prisma migrate dev --name add_stripe_billing
```

Expected: Migration file created and applied. `prisma generate` runs automatically.

- [ ] **Step 3: Verify migration**

```bash
npx prisma studio
```

Open browser at localhost:5555. Confirm Patient table has `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionPlan`, `subscriptionStatus`, `subscriptionPeriodEnd` columns.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Stripe billing fields to Patient model

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 2: Install Stripe SDK and configure env vars

**Files:**

- Modify: `.env.example`

- [ ] **Step 1: Install stripe**

```bash
cd ~/Desktop/Projects/medicrew
bun add stripe
```

Expected: `stripe` package added to `package.json` and `bun.lock`.

- [ ] **Step 2: Update .env.example**

Add to `.env.example`:

```
# Stripe Billing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add package.json bun.lock bun.lockb .env.example
git commit -m "feat: install stripe SDK and add env var docs

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 3: Create Stripe client singleton

**Files:**

- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Write the Stripe singleton**

Create `src/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/lib/stripe.ts
git commit -m "feat: add Stripe client singleton

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 4: Create subscription helper

**Files:**

- Create: `src/lib/subscription.ts`

- [ ] **Step 1: Write subscription.ts**

Create `src/lib/subscription.ts`:

```typescript
import { prisma } from "@/lib/prisma";

const FREE_CONSULTATION_LIMIT = 3;

/**
 * Returns the number of consultations this patient has had in the current
 * calendar month.
 */
async function getMonthlyConsultationCount(patientId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return prisma.consultation.count({
    where: {
      patientId,
      createdAt: { gte: start },
    },
  });
}

/**
 * Checks if the patient can start a new consultation.
 * Returns { allowed: true } for Pro/partner users or Free users under the limit.
 * Returns { allowed: false, reason, upgradeUrl } when the quota is exceeded.
 */
export async function canStartConsultation(
  patientId: string,
): Promise<
  { allowed: true } | { allowed: false; reason: string; upgradeUrl: string }
> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!patient) return { allowed: true }; // shouldn't happen — fail open

  const plan = patient.subscriptionPlan ?? "free";
  const status = patient.subscriptionStatus ?? "active";

  // Pro/partner with active subscription: unlimited
  if (
    (plan === "pro" || plan === "partner") &&
    (status === "active" || status === "trialing")
  ) {
    return { allowed: true };
  }

  // Free tier: enforce monthly limit
  const count = await getMonthlyConsultationCount(patientId);
  if (count >= FREE_CONSULTATION_LIMIT) {
    return {
      allowed: false,
      reason: `Free accounts are limited to ${FREE_CONSULTATION_LIMIT} consultations per month. You have used all ${FREE_CONSULTATION_LIMIT}.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true };
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/lib/subscription.ts
git commit -m "feat: add consultation quota helper for free/pro tiers

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 5: Create Stripe Checkout API route

**Files:**

- Create: `src/app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create the checkout route**

Create `src/app/api/billing/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedPatient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse existing Stripe customer or create one
  let customerId = patient.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: patient.email,
      name: patient.name,
      metadata: { patientId: patient.id },
    });
    customerId = customer.id;
    await prisma.patient.update({
      where: { id: patient.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/patient?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    subscription_data: {
      metadata: { patientId: patient.id },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/api/billing/checkout/route.ts
git commit -m "feat: add Stripe checkout session API route

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 6: Create Stripe billing portal route

**Files:**

- Create: `src/app/api/billing/portal/route.ts`

- [ ] **Step 1: Create the portal route**

Create `src/app/api/billing/portal/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedPatient } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { patient, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (!patient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!patient.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe first." },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: patient.stripeCustomerId,
    return_url: `${appUrl}/patient`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/api/billing/portal/route.ts
git commit -m "feat: add Stripe billing portal API route

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 7: Create Stripe webhook handler

**Files:**

- Create: `src/app/api/billing/webhook/route.ts`

- [ ] **Step 1: Create the webhook handler**

Create `src/app/api/billing/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Stripe requires the raw body for signature verification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const patientId = sub.metadata?.patientId;
        if (!patientId) break;

        const plan =
          sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;

        await prisma.patient.update({
          where: { id: patientId },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionPlan: plan,
            subscriptionStatus: sub.status,
            subscriptionPeriodEnd: periodEnd,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const patientId = sub.metadata?.patientId;
        if (!patientId) break;

        await prisma.patient.update({
          where: { id: patientId },
          data: {
            stripeSubscriptionId: null,
            subscriptionPlan: "free",
            subscriptionStatus: "canceled",
            subscriptionPeriodEnd: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;

        await prisma.patient.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }

      default:
        // Unhandled event types — ignore
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/api/billing/webhook/route.ts
git commit -m "feat: add Stripe webhook handler for subscription lifecycle events

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 8: Gate consultation creation behind quota check

**Files:**

- Modify: `src/app/api/consult/route.ts`

- [ ] **Step 1: Import canStartConsultation**

In `src/app/api/consult/route.ts`, add to imports at the top:

```typescript
import { canStartConsultation } from "@/lib/subscription";
```

- [ ] **Step 2: Add quota check after consent gate**

After the `checkConsent` block (line ~91), and before the patient profile lookup, insert:

```typescript
// Subscription quota gate — Free tier is limited to 3 consultations/month
const quotaCheck = await canStartConsultation(patientId);
if (!quotaCheck.allowed) {
  return NextResponse.json(
    {
      error: quotaCheck.reason,
      upgradeUrl: quotaCheck.upgradeUrl,
      limitReached: true,
    },
    { status: 402 },
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/api/consult/route.ts
git commit -m "feat: enforce Free tier consultation quota before AI processing

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 9: Include subscription info in patient profile API

**Files:**

- Modify: `src/app/api/patient/profile/route.ts`

- [ ] **Step 1: Read the current profile route**

Read `src/app/api/patient/profile/route.ts` and find the Prisma `findUnique` select object.

- [ ] **Step 2: Add subscription fields to select**

Add to the `select` object:

```typescript
subscriptionPlan: true,
subscriptionStatus: true,
subscriptionPeriodEnd: true,
stripeCustomerId: true,
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/api/patient/profile/route.ts
git commit -m "feat: include subscription fields in patient profile API response

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 10: Update pricing page Pro CTA

**Files:**

- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: Change Pro CTA to trigger checkout**

In `src/app/pricing/page.tsx`, change the Pro tier CTA from:

```typescript
cta: { label: "Join Pro waitlist", href: "/consult" },
```

to:

```typescript
cta: { label: "Upgrade to Pro — $29/mo", href: "/api/billing/checkout" },
```

And update the FAQ answer for "When is Pro available?" from:

```typescript
a: "We're in beta. Pro tiers are coming in Q3 2026. Join the waitlist by signing up for free.",
```

to:

```typescript
a: "Pro is available now at $29/month. Subscribe from your patient portal or this page.",
```

- [ ] **Step 2: Make the Pro CTA a POST-triggering button**

Since `/api/billing/checkout` is a POST endpoint, the pricing page CTA needs to use a client-side fetch. Convert the static pricing page to include a `UpgradeButton` component.

Create `src/components/billing/UpgradeButton.tsx`:

```typescript
"use client";

import { useState } from "react";

export function UpgradeButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className={className}
    >
      {loading ? "Redirecting…" : "Upgrade to Pro — $29/mo"}
    </button>
  );
}
```

- [ ] **Step 3: Use UpgradeButton in pricing page**

In `src/app/pricing/page.tsx`, replace the Pro tier `<Link>` CTA with `<UpgradeButton>`. Keep the same className as the primary variant link.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/pricing/page.tsx src/components/billing/UpgradeButton.tsx
git commit -m "feat: replace Pro waitlist CTA with live Stripe checkout button

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 11: Show Pro badge and billing management in patient portal

**Files:**

- Modify: `src/app/patient/page.tsx`

- [ ] **Step 1: Add subscription fields to Patient interface**

In `src/app/patient/page.tsx`, add to the `Patient` interface:

```typescript
subscriptionPlan?: string;
subscriptionStatus?: string;
stripeCustomerId?: string | null;
```

- [ ] **Step 2: Include subscription fields from profile response**

In `loadDashboard`, when setting patient state, include:

```typescript
subscriptionPlan: profile.subscriptionPlan ?? "free",
subscriptionStatus: profile.subscriptionStatus ?? "active",
stripeCustomerId: profile.stripeCustomerId ?? null,
```

- [ ] **Step 3: Add Pro badge to header and billing portal button**

In the portal header, after the `user name` span, add a Pro badge when subscribed:

```tsx
{
  patient?.subscriptionPlan === "pro" && (
    <Badge className="bg-sky-600 text-white text-xs">Pro</Badge>
  );
}
```

Add a billing management button in the header actions area (before the New Consultation button):

```tsx
{
  patient?.stripeCustomerId && (
    <button
      onClick={async () => {
        const res = await fetch("/api/billing/portal", { method: "POST" });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }}
      className="text-sm text-slate-500 hover:text-slate-700 underline"
    >
      Manage billing
    </button>
  );
}
{
  !patient?.stripeCustomerId && patient?.subscriptionPlan === "free" && (
    <a
      href="/pricing"
      className="text-sm text-sky-600 hover:underline font-medium"
    >
      Upgrade to Pro
    </a>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/Projects/medicrew
git add src/app/patient/page.tsx
git commit -m "feat: show Pro badge and billing portal link in patient dashboard

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

### Task 12: Run typecheck

- [ ] **Step 1: Run typecheck**

```bash
cd ~/Desktop/Projects/medicrew
npm run typecheck
```

Expected: No errors.

- [ ] **Step 2: Fix any type errors found**

Address any TypeScript errors reported, then re-run typecheck.

- [ ] **Step 3: Final commit if fixes needed**

```bash
cd ~/Desktop/Projects/medicrew
git add -p
git commit -m "fix: resolve TypeScript errors in billing integration

Co-Authored-By: Paperclip <noreply@paperclip.ing>"
```

---

## Deployment Notes

1. Set these env vars in Vercel:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard webhook config)
   - `STRIPE_PRO_PRICE_ID` (from Stripe product/price ID)
   - `NEXT_PUBLIC_APP_URL` (production URL, e.g. `https://medicrew.app`)

2. Configure Stripe webhook endpoint in Stripe dashboard:
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

3. Run database migration on production Supabase before deploy.
