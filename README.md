# IntaSend Hosted Checkout + Webhook (Integration Guide)

This repo is a practical, copy/paste-friendly guide for integrating **IntaSend hosted checkout** into your website/app.

It covers:

- Django (backend)
- Node.js / Express (backend)
- React (frontend)
- Next.js (frontend + API routes)

The approach here matches the common real-world setup:

- Your backend creates a **hosted checkout link**
- Your frontend redirects the user to that link
- IntaSend sends a **webhook** to your backend to confirm payment
- Your backend marks the payment as `success` and grants access (subscription, credits, etc.)

If you’ve never integrated a payment provider before, don’t overthink it. The main idea is:

- The browser never sees your secret key.
- Your backend is the one that talks to IntaSend.
- Your webhook is the “truth” that a payment happened.

---

## 1) What you need from IntaSend

From your IntaSend dashboard you will get:

- `Publishable Key`
- `Secret Key`
- `Webhook Secret` (used to verify webhook signatures)

Create these environment variables (see `.env.example`):

- `INTASEND_PUBLISHABLE_KEY`
- `INTASEND_SECRET_KEY`
- `INTASEND_WEBHOOK_SECRET`
- `INTASEND_TEST` (`true` for sandbox, `false` for live)

---

## 2) The flow (simple explanation)

- **Step 1: User clicks “Pay”**
- **Step 2: Your backend calls IntaSend** to create a hosted checkout link
- **Step 3: Your backend responds with the checkout URL**
- **Step 4: Your frontend redirects the user** to that URL
- **Step 5: IntaSend redirects back** to your `redirect_url` (this is *not* proof of payment)
- **Step 6: IntaSend calls your webhook** (this is the authoritative confirmation)
- **Step 7: Your server verifies signature + updates DB**

---

## 3) Important note about security

- Never expose your **Secret Key** in the browser.
- Always rely on the **webhook** for confirming payment.
- Always verify webhook signature (HMAC) using `INTASEND_WEBHOOK_SECRET`.

One more thing: the `redirect_url` is mainly for user experience (a “Thanks, we’re processing your payment” page). Don’t activate a subscription just because the user landed on that page.

---

## 4) What you should store in your database (recommended)

This guide is framework-agnostic, but the idea is always the same:

- When you **start checkout**, create a DB record: `status = pending`, store `api_ref`.
- In the **webhook**, look up that record by `api_ref` and mark it `paid/success`.

Practical `api_ref` formats that work well:

- `order-<db_id>`
- `TX-<timestamp>-<random>`

---

# Django (Backend) Example (Hosted checkout + webhook)

This is the same pattern used in many Django projects:

- `POST /api/checkout/` creates a checkout link and returns the URL
- `POST /intasend/webhook/` receives IntaSend events and updates your database

## A) Install dependency

```bash
pip install intasend-python
```

Also set environment variables (copy `.env.example` and fill your keys):

- `INTASEND_PUBLISHABLE_KEY`
- `INTASEND_SECRET_KEY`
- `INTASEND_WEBHOOK_SECRET`
- `INTASEND_TEST`

## B) Minimal backend code

See:

- `django_example/intasend_utils.py`
- `django_example/views.py`
- `django_example/urls.py`

### Typical usage pattern

- Your checkout endpoint creates a payment record in DB with your `api_ref`
- Calls IntaSend
- Returns `checkout_url` then your UI redirects user there

### Matching payments in your DB

Use a value you can reliably match later:

- `api_ref = "order-<your_db_id>"`

Then in your webhook, you simply do:

- Find payment by `api_ref`
- If status is paid/success, mark it successful and grant access

---

# Node.js / Express (Backend) Example (Hosted checkout + webhook)

If your friend is using Node/Express, you can copy/paste the patterns below.

You have **two good options**:

- **Option A (REST API):** call IntaSend `/payment/checkout/` using `fetch` (simple, fewer dependencies).
- **Option B (SDK):** use the official `intasend-node` SDK to create hosted checkouts (also simple).

Either way, the rule is the same:

- **Only your backend calls IntaSend** (never from the browser).
- **Webhook is the truth** that a payment is complete.

### A) Minimal Express server (REST checkout + webhook signature verification)

This matches `node_example/server.js`.

Endpoints:

- `POST /api/checkout` (create hosted checkout)
- `POST /intasend/webhook` (receive payment events)

```js
import express from "express";
import crypto from "crypto";

const app = express();

// NOTE: for normal endpoints you can use JSON
app.use(express.json());

const INTASEND_TEST = (process.env.INTASEND_TEST || "true").toLowerCase() === "true";
const BASE_URL = INTASEND_TEST ? "https://sandbox.intasend.com" : "https://payment.intasend.com";

app.post("/api/checkout", async (req, res) => {
  const { amount, email, phone, api_ref, redirect_url } = req.body || {};

  // 1) create a DB record here: status=pending, api_ref=...
  //    (skipped in this sample)

  const payload = {
    amount: Number(amount),
    currency: "KES",
    email,
    phone_number: phone ? Number(String(phone).replace("+", "")) : undefined,
    api_ref: api_ref || `order-${Date.now()}`,
    redirect_url,
    comment: "Checkout payment",
  };

  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined || payload[k] === "") delete payload[k];
  }

  try {
    const r = await fetch(`${BASE_URL}/api/v1/payment/checkout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    const checkout_url = data?.url || data?.link || data?.data?.url || data?.data?.link;

    return res.json({ checkout_url });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// IMPORTANT: use raw body for signature verification
app.post("/intasend/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  const signature = req.header("X-IntaSend-Signature") || "";
  const secret = process.env.INTASEND_WEBHOOK_SECRET || "";

  if (!secret) return res.status(500).json({ ok: false, error: "Missing INTASEND_WEBHOOK_SECRET" });
  if (!signature) return res.status(401).json({ ok: false, error: "Missing X-IntaSend-Signature" });

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ""));
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  const signatureOk = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!signatureOk) return res.status(401).json({ ok: false, error: "Invalid signature" });

  let payload = {};
  try {
    payload = JSON.parse(req.body.toString("utf-8"));
  } catch {
    payload = {};
  }

  const status = String(payload.status || payload.state || "").toUpperCase();
  const api_ref = payload.api_ref || payload.reference || "";

  // 1) find payment/order by api_ref in DB
  // 2) if status COMPLETE / SUCCESSFUL -> mark as paid + grant access
  // 3) if FAILED -> mark failed

  return res.json({ ok: true, api_ref, status });
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
```

### B) Alternative (SDK) — hosted checkout + optional M-PESA STK push

If you prefer the official SDK style, here is a direct copy/paste service pattern:

```js
import axios from "axios";
const IntaSend = require("intasend-node");

const INTASEND_BASE_URL = "https://payment.intasend.com/api/v1";

function getIntaSendHeaders() {
  const secret = (process.env.INTASEND_SECRET_KEY || "").trim();
  const pub = (process.env.INTASEND_PUBLISHABLE_KEY || "").trim();
  if (!secret || !pub) throw new Error("IntaSend keys not configured");
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

export async function createHostedCheckout({ amount, email, phone_number, name, api_ref, redirect_url }) {
  const pub = (process.env.INTASEND_PUBLISHABLE_KEY || "").trim();
  const secret = (process.env.INTASEND_SECRET_KEY || "").trim();
  const isTest = (process.env.INTASEND_TEST || "true").toLowerCase() === "true";

  const sdk = new IntaSend(pub, secret, isTest);
  const collection = sdk.collection();
  const resp = await collection.charge({
    amount,
    currency: "KES",
    api_ref,
    redirect_url,
    email,
    phone_number,
    first_name: (name || "").split(" ")[0] || name,
    last_name: (name || "").split(" ")[1] || "",
  });

  const url = resp?.url || resp?.payment_link || (resp?.id ? `https://payment.intasend.com/pay/${resp.id}/` : undefined);
  return { id: resp?.id, url };
}

// Optional: direct STK push (no hosted page)
export async function stkPush({ amount, email, phone_number, name, api_ref, redirect_url }) {
  const resp = await axios.post(
    `${INTASEND_BASE_URL}/payment/collection/`,
    {
      public_key: process.env.INTASEND_PUBLISHABLE_KEY,
      amount,
      currency: "KES",
      email,
      phone_number,
      api_ref,
      redirect_url,
      method: "M-PESA",
      first_name: (name || "").split(" ")[0] || name,
      last_name: (name || "").split(" ")[1] || "",
    },
    { headers: getIntaSendHeaders() }
  );

  return { id: resp.data?.id, invoice_id: resp.data?.invoice_id };
}
```

### C) Optional verify endpoint (useful for your “success” page)

Redirect is not proof. Webhook is the truth.

But sometimes webhooks can be delayed, so it’s useful to also have a `GET /api/payments/verify/:api_ref` endpoint that checks IntaSend by `api_ref`.

If you already store payments in DB, do:

- If DB says `pending`, call IntaSend status API.
- If IntaSend says `COMPLETE`, update DB to paid.

---

# React (Frontend) Example

Frontend does not talk to IntaSend directly. It talks to your backend endpoint:

- `/api/checkout` (Django or Node)

See:

- `react_example/CheckoutButton.jsx`

### React flow in 2 lines

- Call your backend: `POST /api/checkout`
- Redirect: `window.location.href = checkout_url`

### Minimal copy/paste React example

```jsx
export default function CheckoutButton() {
  const startCheckout = async () => {
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 2000,
        email: "john@example.com",
        phone: "+254712345678",
        redirect_url: "https://yourdomain.com/payment-success",
      }),
    });

    const data = await r.json();
    window.location.href = data.checkout_url;
  };

  return <button onClick={startCheckout}>Pay Now</button>;
}
```

---

# Next.js Example (Frontend + API route)

Two common options:

1. Next.js frontend + **separate backend** (Django/Node)
2. Next.js frontend + Next.js API route acting as backend for IntaSend calls

See:

- `nextjs_example/app/api/checkout/route.js` (Next.js App Router API route)
- `nextjs_example/app/checkout/page.jsx`

### When to use Next.js API routes

If your entire site is Next.js and you don’t want a separate backend service, you can keep the IntaSend secret key on the server side in a Next.js API route.

If you already have Django/Node backend, keep the payment creation there and let Next.js/React stay “thin”.

---

## Webhook URL examples

In production you’ll configure a webhook URL like:

- `https://yourdomain.com/intasend/webhook/`

For local development, you’ll need a tunnel (ngrok, cloudflared, etc.) so IntaSend can reach your machine.

Example with ngrok:

```bash
ngrok http 8000
```

Then set webhook URL in IntaSend dashboard to:

- `https://<your-ngrok-subdomain>.ngrok.io/intasend/webhook/`

---

## What to change for your friend’s project

- Replace `api_ref` format with their own (example: `order-<db_id>`)
- Save every initiated payment in DB as `pending`
- Update to `success` only when webhook says paid
- After success, grant access (mark subscription active, unlock features)

Practical “grant access” ideas:

- If it’s a subscription app: set `subscription.status = active` and set expiry.
- If it’s a digital product: mark `order.is_paid = true`.
- If it’s credits: increment user credits.

---

## Troubleshooting checklist

- If redirect works but subscription not activating:
  - webhook isn’t reaching your server
  - or signature verification fails
  - or your webhook can’t match `api_ref` to a payment record

Quick checks:

- Confirm your webhook URL in IntaSend dashboard is correct.
- Print/log incoming webhook body + signature to see what’s coming in.
- Make sure your server is reachable publicly (no localhost).

---

## License

Use freely in your project.
