"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { currency } from "@/lib/utils";

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

type CustomerPayload = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      if (existing.dataset.loaded === "true") resolve();
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

export function PlanCheckoutCard({
  planId,
  planName,
  planPrice,
}: {
  planId: number;
  planName: string;
  planPrice: number;
}) {
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerPayload>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
  });

  const walletRef = useRef<{ unmount: () => void } | null>(null);
  const containerId = useMemo(() => "mercado-pago-plan-wallet", []);

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
          initialization: { preferenceId },
        });
      } catch {
        if (!cancelled) setError("Nao foi possivel renderizar o componente oficial do Mercado Pago.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [containerId, preferenceId, publicKey]);

  const handleGeneratePayment = async () => {
    setError(null);

    const cpfDigits = customer.cpf.replace(/\D/g, "");
    if (!customer.nome || !customer.email || !customer.telefone || cpfDigits.length !== 11 || !customer.dataNascimento) {
      setError("Preencha todos os dados de cadastro.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          paymentMethod: "pix_card",
          customer,
        }),
      });

      const data = (await response.json()) as { id?: string; preference_id?: string; error?: string };
      const resolvedPreferenceId = data.preference_id ?? data.id;

      if (!response.ok || !resolvedPreferenceId) {
        setError(data.error ?? "Nao foi possivel gerar a preferencia de pagamento.");
        return;
      }

      setPreferenceId(resolvedPreferenceId);
    } catch {
      setError("Erro inesperado ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[32px] bg-white p-8 shadow-soft">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Plano selecionado</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{planName}</h2>
        <p className="mt-1 text-lg font-semibold text-brand-700">{currency(planPrice)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input className="form-field" placeholder="Nome completo" value={customer.nome} onChange={(e) => setCustomer((prev) => ({ ...prev, nome: e.target.value }))} />
        <input className="form-field" type="email" placeholder="E-mail" value={customer.email} onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))} />
        <input className="form-field" placeholder="Telefone" value={customer.telefone} onChange={(e) => setCustomer((prev) => ({ ...prev, telefone: e.target.value }))} />
        <input className="form-field" placeholder="CPF" value={customer.cpf} onChange={(e) => setCustomer((prev) => ({ ...prev, cpf: e.target.value }))} />
        <input className="form-field md:col-span-2" type="date" value={customer.dataNascimento} onChange={(e) => setCustomer((prev) => ({ ...prev, dataNascimento: e.target.value }))} />
      </div>

      {!publicKey ? (
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-700">
          Configure <code>NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY</code> no arquivo <code>.env.local</code>.
        </div>
      ) : null}

      <button type="button" className="legacy-button" onClick={handleGeneratePayment} disabled={loading || !publicKey}>
        {loading ? "Gerando preferencia..." : "Continuar para pagamento"}
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
