"""Copyright (c) Vanilla Softwares.

All rights reserved. This file is proprietary to Vanilla Softwares and may not be copied,
redistributed, or used without written permission.

Contact: +254792619069
"""

import os
import hmac
import hashlib
from intasend import APIService


def get_service():
    publishable_key = os.environ.get("INTASEND_PUBLISHABLE_KEY", "")
    token = os.environ.get("INTASEND_SECRET_KEY", "")
    test = os.environ.get("INTASEND_TEST", "false").lower() == "true"
    return APIService(token=token, publishable_key=publishable_key, test=test)


def create_checkout_link(*, amount, currency, email, phone, comment, api_ref="", redirect_url=""):
    service = get_service()

    payload = {
        "phone_number": int(str(phone).replace("+", "")) if phone else None,
        "email": email,
        "amount": amount,
        "currency": currency,
        "comment": comment,
    }
    if api_ref:
        payload["api_ref"] = api_ref
    if redirect_url:
        payload["redirect_url"] = redirect_url

    payload = {k: v for k, v in payload.items() if v not in (None, "")}
    return service.collect.checkout(**payload)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    secret = os.environ.get("INTASEND_WEBHOOK_SECRET", "")
    if not secret:
        return False
    if not signature:
        return False

    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    try:
        from hmac import compare_digest

        return compare_digest(computed, signature)
    except Exception:
        return computed == signature
