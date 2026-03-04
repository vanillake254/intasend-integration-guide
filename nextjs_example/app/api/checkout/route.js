import {
  compactPayload,
  getIntaSendAuthHeaders,
  getIntaSendBaseUrl,
  normalizePhoneToNumber,
} from "../_lib/intasend";

// Ensure this route runs on Node.js runtime (so server APIs like Buffer are available consistently).
export const runtime = "nodejs";

/**
 * POST /api/checkout
 *
 * Creates an IntaSend hosted checkout session and returns a checkout URL.
 *
 * Conceptually:
 * - Your frontend calls this endpoint.
 * - This endpoint (server-side) calls IntaSend using your SECRET KEY.
 * - It returns a checkout URL.
 * - Your frontend redirects the user to IntaSend.
 */
export async function POST(req) {
  // Read incoming JSON body from your frontend.
  const body = await req.json();

  // Build the provider payload.
  // Each field is explained so it's easy to copy into a real project.
  const payload = compactPayload({
    // Amount must be a number.
    amount: Number(body.amount),

    // Currency for Kenyan payments is commonly KES.
    currency: "KES",

    // Customer email (used for receipts / payment identification).
    email: body.email,

    // IntaSend expects a numeric phone field for this endpoint.
    // We strip + and convert to a number.
    phone_number: normalizePhoneToNumber(body.phone),

    // api_ref is YOUR reference (store it in your DB to match webhooks later).
    api_ref: body.api_ref || `order-${Date.now()}`,

    // Where IntaSend will redirect the user after checkout.
    // IMPORTANT: redirect is NOT proof of payment. Webhook is proof.
    redirect_url: body.redirect_url,

    // Optional display note.
    comment: body.comment || "Checkout payment",
  });

  // Choose sandbox vs live base URL using INTASEND_TEST.
  const baseUrl = getIntaSendBaseUrl();

  // Call IntaSend server-to-server.
  const r = await fetch(`${baseUrl}/api/v1/payment/checkout/`, {
    method: "POST",
    headers: getIntaSendAuthHeaders(),
    body: JSON.stringify(payload),
  });

  // Parse IntaSend response JSON.
  const data = await r.json();

  // Extract checkout URL (field name can vary).
  const checkout_url = data?.url || data?.link || data?.data?.url || data?.data?.link;

  // Return checkout_url for your frontend redirect, plus provider_response for debugging.
  return Response.json({ checkout_url, provider_response: data }, { status: r.status });
}
