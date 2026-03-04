import { useState } from "react";

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          email: "you@example.com",
          phone: "2547XXXXXXXX",
          api_ref: `order-${Date.now()}`,
          redirect_url: `${window.location.origin}/return`,
        }),
      });

      const data = await r.json();
      if (!data.checkout_url) {
        throw new Error("No checkout_url returned from server");
      }

      window.location.href = data.checkout_url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={startCheckout} disabled={loading}>
      {loading ? "Redirecting..." : "Pay with IntaSend"}
    </button>
  );
}
