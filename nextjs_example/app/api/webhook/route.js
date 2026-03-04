import { safeJsonParse, verifyIntaSendWebhookSignature } from "../_lib/intasend";

// Webhook signature verification uses crypto/Buffer, so we force Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/webhook
 *
 * IntaSend will send payment events to this endpoint.
 *
 * IMPORTANT:
 * - Always verify webhook signature using INTASEND_WEBHOOK_SECRET.
 * - Webhook is authoritative (this is where you mark an order paid).
 *
 * This example only verifies signature and returns parsed data.
 * In a real app, you MUST update your database here.
 */
export async function POST(req) {
  // Read raw body first (signature verification requires raw text).
  const rawBodyText = await req.text();

  // IntaSend signature header (case-insensitive but we use the standard name).
  const signature = req.headers.get("x-intasend-signature") || "";

  // Verify signature.
  const signatureOk = verifyIntaSendWebhookSignature({
    rawBody: Buffer.from(rawBodyText, "utf8"),
    signature,
  });

  if (!signatureOk) {
    return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  // Parse JSON after signature passes.
  const payload = safeJsonParse(rawBodyText) || {};

  // Common fields you will use to match records in your DB.
  const api_ref = payload.api_ref || payload.reference || null;
  const state = payload.state || payload.status || null;
  const invoice_id = payload.invoice_id || payload.id || null;

  // TODO (real app):
  // - Find payment/order by api_ref
  // - If state === "COMPLETE": mark as PAID and grant access
  // - If state === "FAILED": mark as FAILED

  return Response.json({ ok: true, api_ref, state, invoice_id });
}
