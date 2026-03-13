"use client";

import { useState } from "react";

type CheckoutResponse = {
  order_id: string;
  init_point?: string;
  sandbox_init_point?: string;
  checkout_url?: string;
  error?: string;
};

export function CheckoutProWallet({
  bookingId,
  pendingBookingId,
  initialTitle,
  initialAmount,
}: {
  bookingId?: number;
  pendingBookingId?: string;
  initialTitle: string;
  initialAmount: number;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [amount] = useState(String(initialAmount.toFixed(2)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      const value = Number(amount.replace(",", "."));
      if (Number.isNaN(value) || value <= 0) {
        setError("Informe um valor valido para pagamento.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          quantity: 1,
          unit_price: value,
          bookingId,
          pendingBookingId,
          paymentMethod: "pix_card",
          metadata: {
            booking_id: bookingId,
            pending_booking_id: pendingBookingId,
          },
        }),
      });

      const data = (await response.json()) as CheckoutResponse;
      const checkoutUrl = data.init_point ?? data.sandbox_init_point ?? data.checkout_url;

      if (!response.ok || !checkoutUrl) {
        setError(data.error ?? "Nao foi possivel gerar o checkout.");
        setLoading(false);
        return;
      }

      window.location.href = checkoutUrl;
    } catch {
      setError("Erro inesperado ao gerar pagamento.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[32px] bg-white p-8 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <input className="form-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descricao" />
        <input className="form-field" value={amount} placeholder="Valor" readOnly />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
        O pagamento sera aberto no Checkout Pro do Mercado Pago. A confirmacao oficial continua acontecendo por webhook server-side.
      </div>

      <button type="button" onClick={createCheckout} className="legacy-button" disabled={loading}>
        {loading ? "Abrindo checkout..." : "Ir para o checkout"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
