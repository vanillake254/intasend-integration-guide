/*
 Copyright (c) Vanilla Softwares.

 All rights reserved. This file is proprietary to Vanilla Softwares and may not be copied,
 redistributed, or used without written permission.

 Contact: +254792619069
*/

import crypto from "crypto";

/**
 * Returns true when INTASEND_TEST is set to "true" (default: true).
 */
export function isIntaSendTestMode() {
  return (process.env.INTASEND_TEST || "true").toLowerCase() === "true";
}

/**
 * Returns the correct IntaSend base URL depending on sandbox/live.
 */
export function getIntaSendBaseUrl() {
  return isIntaSendTestMode() ? "https://sandbox.intasend.com" : "https://payment.intasend.com";
}

/**
 * Small helper to fail fast when a required env var is missing.
 */
export function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * Authorization header used for IntaSend server-to-server calls.
 * IMPORTANT: Never use INTASEND_SECRET_KEY in the browser.
 */
export function getIntaSendAuthHeaders() {
  const secret = requireEnv("INTASEND_SECRET_KEY");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };
}

/**
 * Parses a JSON string safely.
 */
export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Removes undefined/empty-string keys from a payload.
 */
export function compactPayload(payload) {
  const out = { ...payload };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined || out[k] === "") delete out[k];
  }
  return out;
}

/**
 * Normalizes a phone number into a basic IntaSend-friendly numeric form.
 * NOTE: Different projects prefer different formats. This keeps it simple.
 */
export function normalizePhoneToNumber(phone) {
  if (!phone) return undefined;
  const cleaned = String(phone).replace(/\s|\-/g, "").replace("+", "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Timing-safe compare for webhook signature verification.
 */
export function timingSafeEqualHex(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

/**
 * Verifies IntaSend webhook signature.
 *
 * IntaSend sends a signature in: X-IntaSend-Signature
 * We compute: HMAC_SHA256(rawBody, INTASEND_WEBHOOK_SECRET)
 */
export function verifyIntaSendWebhookSignature({ rawBody, signature }) {
  const secret = requireEnv("INTASEND_WEBHOOK_SECRET");
  if (!signature) return false;

  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualHex(computed, signature);
}
