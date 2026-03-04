# IntaSend Hosted Checkout + Webhook (Integration Guide)

## COPYRIGHT / OWNERSHIP NOTICE (READ FIRST)

All files in this repository (including but not limited to: documentation, code samples, examples, templates, and project structure) were prepared by and belong to **Vanilla Softwares**.

Unauthorized copying, redistribution, resale, relicensing, or publishing of any part of this repository (in source or compiled form) is prohibited without written permission from Vanilla Softwares.

You may use these materials only with explicit permission from Vanilla Softwares.

If permission is granted, you must:

- Keep this copyright notice intact.
- Not remove Vanilla Softwares attribution.
- Not claim the work as your own.
- Not use it to create competing “integration guide” products.

Contact:

- Phone/WhatsApp: `+254792619069`

By continuing to read/use this repository, you acknowledge this notice.

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

## 5) Installation / prerequisites

This repo provides working examples. Pick one backend approach and one frontend approach.

### Backend prerequisites

- **Python/Django example**
  - Install: `intasend-python`
- **Node.js/Express example**
  - Node 18+ recommended
- **Next.js example**
  - Next.js App Router (Next 13+)

### Frontend prerequisites

- **React** (calls your backend endpoint and redirects)
- **Next.js** (either uses API routes or a separate backend)

---

## 6) Environment variables

Copy `.env.example` and set the variables in your runtime environment:

- `INTASEND_PUBLISHABLE_KEY`
- `INTASEND_SECRET_KEY`
- `INTASEND_WEBHOOK_SECRET`
- `INTASEND_TEST` (`true` sandbox, `false` live)
- `APP_BASE_URL` (used by some examples)

---

## 7) Which example files to use

This README intentionally contains **no code snippets**. All code is inside the example folders.

### Django (backend)

Files:

- `django_example/intasend_utils.py`
- `django_example/views.py`
- `django_example/urls.py`

What it demonstrates:

- Creating a hosted checkout link
- Handling webhook callbacks

### Node.js / Express (backend)

File:

- `node_example/server.js`

What it demonstrates:

- Creating a hosted checkout link
- Validating webhook signatures

### React (frontend)

File:

- `react_example/CheckoutButton.jsx`

What it demonstrates:

- Calling your backend checkout endpoint
- Redirecting the user to the hosted checkout URL

### Next.js (API routes + pages)

Files:

- `nextjs_example/app/api/checkout/route.js` (hosted checkout)
- `nextjs_example/app/api/stk-push/route.js` (optional M-PESA STK push)
- `nextjs_example/app/api/verify/[api_ref]/route.js` (verify by api_ref)
- `nextjs_example/app/api/webhook/route.js` (webhook receiver)
- `nextjs_example/app/checkout/page.jsx` (simple checkout page)

---

## 8) Webhook setup (production + local)

### Production

- Deploy your backend to a public URL
- In IntaSend dashboard, set your webhook URL to your deployed endpoint
- Ensure `INTASEND_WEBHOOK_SECRET` is configured and matches what your server expects

### Local development

- IntaSend cannot call `localhost`
- Use a tunnel (ngrok, cloudflared, etc.) and set the webhook URL to the tunnel URL

---

## 9) Troubleshooting

If redirect works but your app does not unlock access:

- Confirm webhook is reaching your server (check logs)
- Confirm webhook verification is passing (signature/secret)
- Confirm you can match IntaSend `api_ref` to your DB record

If sandbox/live calls fail:

- Confirm `INTASEND_TEST` is set correctly
- Confirm you are using the correct keys for sandbox vs live

