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

This example uses plain `fetch` to call IntaSend endpoints (no browser secret leakage).

See:

- `node_example/server.js`

### Notes

- This server exposes:
  - `POST /api/checkout`
  - `POST /intasend/webhook`
- Webhook signature verification is implemented with `crypto` using `INTASEND_WEBHOOK_SECRET`.

---

# React (Frontend) Example

Frontend does not talk to IntaSend directly. It talks to your backend endpoint:

- `/api/checkout` (Django or Node)

See:

- `react_example/CheckoutButton.jsx`

### React flow in 2 lines

- Call your backend: `POST /api/checkout`
- Redirect: `window.location.href = checkout_url`

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
