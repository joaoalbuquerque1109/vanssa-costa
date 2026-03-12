"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (
          brickType: "wallet",
          containerId: string,
          settings: {
            initialization: { preferenceId: string };
          },
        ) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

type PreferenceResponse = {
  id?: string;
  preference_id?: string;
  order_id: string;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      if ((existing as HTMLScriptElement).dataset.loaded === "true") resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Falha ao carregar SDK Mercado Pago."));
    document.body.appendChild(script);
  });
}

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
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletRef = useRef<{ unmount: () => void } | null>(null);

  const containerId = useMemo(() => "mercado-pago-wallet", []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/payments/mercadopago/public-key", { cache: "no-store" });
        const data = (await response.json()) as { public_key?: string };
        setPublicKey(String(data.public_key ?? "").trim());
      } catch {
        setPublicKey(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "");
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      walletRef.current?.unmount();
      walletRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!preferenceId || !publicKey) return;

    let cancelled = false;

    (async () => {
      try {
        await loadScript("https://sdk.mercadopago.com/js/v2");
        if (!window.MercadoPago || cancelled) return;

        walletRef.current?.unmount();
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();
        walletRef.current = await bricks.create("wallet", containerId, {
          initialization: {
            preferenceId,
          },
        });
      } catch {
        if (!cancelled) {
          setError("Não foi possível renderizar o componente oficial do Mercado Pago.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [containerId, preferenceId, publicKey]);

  const createPreference = async () => {
    setError(null);
    setLoading(true);

    try {
      const value = Number(amount.replace(",", "."));
      if (Number.isNaN(value) || value <= 0) {
        setError("Informe um valor válido para pagamento.");
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

      const data = (await response.json()) as PreferenceResponse & { error?: string };

      const resolvedPreferenceId = data.preference_id ?? data.id;
      if (!response.ok || !resolvedPreferenceId) {
        setError(data.error ?? "Não foi possível gerar a preferência de pagamento.");
        setLoading(false);
        return;
      }

      setPreferenceId(resolvedPreferenceId);
    } catch {
      setError("Erro inesperado ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-700">
        Configure <code>NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY</code> no arquivo <code>.env.local</code>.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[32px] bg-white p-8 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <input className="form-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição" />
        <input className="form-field" value={amount} placeholder="Valor" readOnly />
      </div>

      <p className="text-sm font-semibold text-slate-700">Meios habilitados por padrao: Pix e Cartao.</p>

      <button type="button" onClick={createPreference} className="legacy-button" disabled={loading}>
        {loading ? "Gerando preferência..." : "Gerar pagamento"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {preferenceId ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Preference ID: {preferenceId}</p>
          <div id={containerId} />
        </div>
      ) : null}
    </div>
  );
}
