# Quickstart (Run the Examples)

Pick the stack you’re using. You don’t need to run every folder.

This repo is meant to be **copied into your real project**:

- Backend creates the checkout URL
- Frontend redirects user to IntaSend
- Webhook confirms payment and you update your DB

---

## Environment variables

Copy `.env.example` and fill in your IntaSend keys:

- `INTASEND_PUBLISHABLE_KEY`
- `INTASEND_SECRET_KEY`
- `INTASEND_WEBHOOK_SECRET`
- `INTASEND_TEST=true` (sandbox) or `false` (live)

Also set your app base URL:

- `APP_BASE_URL` (example: `http://localhost:8000`)

---

## Django quickstart

1. Install dependency

```bash
pip install intasend-python
```

2. Copy files

- Copy `django_example/intasend_utils.py` into one of your Django apps
- Copy `django_example/views.py` and wire it into your app
- Copy `django_example/urls.py` and include it in your project `urls.py`

3. Run server

```bash
python manage.py runserver
```

Your endpoints will look like:

- `POST /api/checkout/`
- `POST /intasend/webhook/`

If you’re copying into an existing Django app, you mainly need:

- A checkout view that calls IntaSend and returns `checkout_url`
- A webhook view that verifies signature and marks the DB record as paid

---

## Node.js / Express quickstart

Requirements:

- Node 18+ (so `fetch` is available)

Run:

```bash
node node_example/server.js
```

Endpoints:

- `POST http://localhost:3001/api/checkout`
- `POST http://localhost:3001/intasend/webhook`

How to test quickly:

- Call `POST /api/checkout` from your frontend or Postman
- Copy the returned `checkout_url` and open it in your browser
- Complete payment
- IntaSend will call your webhook (only if it can reach your server — see Webhook Setup below)

---

## React quickstart

- Copy `react_example/CheckoutButton.jsx` into your project.
- Make sure it calls your backend endpoint (Django/Node/Next API route).

Basic flow:

- Click button
- `POST /api/checkout`
- Redirect user to `checkout_url`

Important:

- React/Next/Browser must **never** call IntaSend directly.
- React should only call your backend endpoint.

---

## Next.js quickstart (App Router)

1. Add environment variables to `.env.local`:

```bash
INTASEND_SECRET_KEY=...
INTASEND_TEST=true
```

If you’re using webhook signature verification, also add:

```bash
INTASEND_WEBHOOK_SECRET=...
```

2. Copy:

- `nextjs_example/app/api/checkout/route.js` -> `app/api/checkout/route.js`
- `nextjs_example/app/checkout/page.jsx` -> `app/checkout/page.jsx`

3. Run:

```bash
npm run dev
```

---

## Webhook setup (Important)

The webhook is what your backend uses to **confirm payment for real**.

Your `redirect_url` is only UX (success/processing page). Don’t mark payments as paid just because a user got redirected.

### Production

1. Deploy your backend to a public URL.
2. In IntaSend dashboard, set your webhook URL to something like:

- `https://yourdomain.com/intasend/webhook/`

### Local development

IntaSend can’t call `localhost`. Use a tunnel:

```bash
ngrok http 8000
```

If your Node example runs on port 3001, tunnel 3001 instead:

```bash
ngrok http 3001
```

Then set webhook URL to:

- `https://<your-ngrok-subdomain>.ngrok.io/intasend/webhook/`

---

## What your friend must customize

- Create a DB record when starting checkout (`pending`)
- Use a unique `api_ref` you can match later (`order-<id>`)
- In webhook:
  - verify signature
  - find the payment by `api_ref`
  - mark it paid/success
  - grant access (subscription / unlock product / credits)

That’s it. Everything else is just project-specific details.
