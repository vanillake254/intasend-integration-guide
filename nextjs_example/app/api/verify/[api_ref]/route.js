/*
 Copyright (c) Vanilla Softwares.

 All rights reserved. This file is proprietary to Vanilla Softwares and may not be copied,
 redistributed, or used without written permission.

 Contact: +254792619069
*/

import { getIntaSendAuthHeaders, getIntaSendBaseUrl } from "../../_lib/intasend.js";

// Verification is a server-to-server call. Force Node.js runtime.
export const runtime = "nodejs";

/**
 * GET /api/verify/:api_ref
 *
 * This endpoint verifies a payment by api_ref (your own transaction reference).
 *
 * Notes:
 * - Redirecting a user back to your site is NOT proof of payment.
 * - Webhook is the source of truth.
 * - This verify endpoint is helpful when webhooks are delayed.
 */
export async function GET(_req, { params }) {
  const apiRef = params?.api_ref;

  const baseUrl = getIntaSendBaseUrl();

  const r = await fetch(`${baseUrl}/api/v1/payment/status/?api_ref=${encodeURIComponent(apiRef)}`, {
    method: "GET",
    headers: getIntaSendAuthHeaders(),
  });

  const data = await r.json();
  const results = data?.results || [];

  // IntaSend returns many results; we match the exact api_ref we used when creating checkout.
  const payment = results.find((p) => p.api_ref === apiRef);

  if (!payment) {
    return Response.json({ success: false, error: "Payment not found", provider_response: data }, { status: 404 });
  }

  return Response.json(
    {
      success: payment.state === "COMPLETE",
      status: payment.state,
      amount: payment.value,
      currency: payment.currency,
      reference: payment.api_ref,
      provider_response: payment,
    },
    { status: 200 }
  );
}
