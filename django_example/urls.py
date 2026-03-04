"""Copyright (c) Vanilla Softwares.

All rights reserved. This file is proprietary to Vanilla Softwares and may not be copied,
redistributed, or used without written permission.

Contact: +254792619069
"""

from django.urls import path
from . import views

urlpatterns = [
    path("api/checkout/", views.checkout, name="checkout"),
    path("intasend/webhook/", views.intasend_webhook, name="intasend_webhook"),
]
