"use client";

import { useState } from "react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          email: "you@example.com",
          phone: "2547XXXXXXXX",
          redirect_url: `${window.location.origin}/return`,
        }),
      });

      const data = await r.json();
      if (!data.checkout_url) throw new Error("Missing checkout_url");
      window.location.href = data.checkout_url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Checkout</h1>
      <button onClick={pay} disabled={loading}>
        {loading ? "Redirecting..." : "Pay with IntaSend"}
      </button>
    </main>
  );
}
