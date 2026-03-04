import { getIntaSendAuthHeaders, getIntaSendBaseUrl, requireEnv } from "../_lib/intasend";

// STK push is a server-to-server call. Force Node.js runtime for consistent behavior.
export const runtime = "nodejs";

/**
 * POST /api/stk-push
 *
 * This endpoint triggers a direct M-PESA STK push using IntaSend's collection endpoint.
 *
 * Why this exists:
 * - Hosted checkout is easiest for most websites.
 * - STK push is useful when you want to prompt the user's phone immediately.
 *
 * Body example:
 * {
 *   "amount": 2000,
 *   "email": "john@example.com",
 *   "phone": "+254712345678",
 *   "name": "John Doe",
 *   "api_ref": "order-123",
 *   "redirect_url": "https://yourdomain.com/payment-success"
 * }
 */
export async function POST(req) {
  const body = await req.json();

  // Public key is required in the request body for /payment/collection/
  const publicKey = requireEnv("INTASEND_PUBLISHABLE_KEY");

  const payload = {
    public_key: publicKey,
    amount: Number(body.amount),
    currency: "KES",
    email: body.email,
    phone_number: String(body.phone || ""),
    first_name: String(body.name || "").split(" ")[0] || body.name,
    last_name: String(body.name || "").split(" ")[1] || "",
    api_ref: body.api_ref || `order-${Date.now()}`,
    redirect_url: body.redirect_url,
    method: "M-PESA",
  };

  const baseUrl = getIntaSendBaseUrl();

  const r = await fetch(`${baseUrl}/api/v1/payment/collection/`, {
    method: "POST",
    headers: getIntaSendAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await r.json();

  // IntaSend typically returns an id / invoice_id for this collection call.
  return Response.json(
    {
      checkout_id: data?.id,
      invoice_id: data?.invoice_id,
      provider_response: data,
    },
    { status: r.status }
  );
}
