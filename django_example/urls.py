from django.urls import path
from . import views

urlpatterns = [
    path("api/checkout/", views.checkout, name="checkout"),
    path("intasend/webhook/", views.intasend_webhook, name="intasend_webhook"),
]
