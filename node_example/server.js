import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const INTASEND_TEST = (process.env.INTASEND_TEST || "true").toLowerCase() === "true";
const BASE_URL = INTASEND_TEST ? "https://sandbox.intasend.com" : "https://payment.intasend.com";

app.post("/api/checkout", async (req, res) => {
  const { amount, email, phone, api_ref, redirect_url } = req.body || {};

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

    res.json({ checkout_url, provider_response: data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/intasend/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  const signature = req.header("X-IntaSend-Signature") || "";

  const secret = process.env.INTASEND_WEBHOOK_SECRET || "";
  if (!secret) {
    return res.status(500).json({ ok: false, error: "Missing INTASEND_WEBHOOK_SECRET" });
  }
  if (!signature) {
    return res.status(401).json({ ok: false, error: "Missing X-IntaSend-Signature" });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ""));
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  const signatureOk = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!signatureOk) {
    return res.status(401).json({ ok: false, error: "Invalid signature" });
  }

  let payload = {};
  try {
    payload = JSON.parse(req.body.toString("utf-8"));
  } catch {
    payload = {};
  }

  const status = String(payload.status || payload.state || "").toLowerCase();
  const api_ref = payload.api_ref || payload.reference || "";

  // TODO: Update your DB payment by api_ref.

  res.json({ ok: true, api_ref, status, signature_received: !!signature });
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
