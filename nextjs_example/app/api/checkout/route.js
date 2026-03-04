export async function POST(req) {
  const body = await req.json();

  const INTASEND_TEST = (process.env.INTASEND_TEST || "true").toLowerCase() === "true";
  const BASE_URL = INTASEND_TEST ? "https://sandbox.intasend.com" : "https://payment.intasend.com";

  const payload = {
    amount: Number(body.amount),
    currency: "KES",
    email: body.email,
    phone_number: body.phone ? Number(String(body.phone).replace("+", "")) : undefined,
    api_ref: body.api_ref || `order-${Date.now()}`,
    redirect_url: body.redirect_url,
    comment: body.comment || "Checkout payment",
  };

  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined || payload[k] === "") delete payload[k];
  }

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

  return Response.json({ checkout_url, provider_response: data }, { status: r.status });
}
