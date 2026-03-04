"""Copyright (c) Vanilla Softwares.

All rights reserved. This file is proprietary to Vanilla Softwares and may not be copied,
redistributed, or used without written permission.

Contact: +254792619069
"""

import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .intasend_utils import create_checkout_link, verify_webhook_signature


def checkout(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    body = json.loads(request.body.decode("utf-8")) if request.body else {}

    amount = int(body.get("amount", 0))
    email = (body.get("email") or "").strip()
    phone = (body.get("phone") or "").strip()

    api_ref = body.get("api_ref") or "order-demo-123"
    redirect_url = body.get("redirect_url") or "http://localhost:8000/return"

    resp = create_checkout_link(
        amount=amount,
        currency="KES",
        email=email,
        phone=phone,
        comment="Checkout payment",
        api_ref=api_ref,
        redirect_url=redirect_url,
    )

    checkout_url = None
    if isinstance(resp, dict):
        checkout_url = (
            resp.get("url")
            or resp.get("link")
            or resp.get("checkout_url")
            or resp.get("checkoutLink")
        )
        if not checkout_url and "data" in resp and isinstance(resp["data"], dict):
            checkout_url = resp["data"].get("url") or resp["data"].get("link")

    return JsonResponse({"checkout_url": checkout_url, "provider_response": resp})


@csrf_exempt
def intasend_webhook(request):
    if request.method == "GET":
        return JsonResponse({"ok": True})

    raw = request.body or b""
    signature = request.headers.get("X-IntaSend-Signature", "")

    if not verify_webhook_signature(raw, signature):
        return JsonResponse({"ok": False, "error": "invalid signature"}, status=401)

    payload = request.POST.dict() if request.POST else {}
    try:
        if not payload:
            payload = json.loads(raw.decode("utf-8"))
    except Exception:
        payload = {}

    status_str = str(payload.get("status") or payload.get("state") or "").lower()
    api_ref = payload.get("api_ref") or payload.get("reference") or ""

    # TODO: Find your Payment by api_ref and update its status.
    # If status_str in {"success","paid","complete","completed"}: mark success and grant access.

    return JsonResponse({"ok": True, "api_ref": api_ref, "status": status_str})
