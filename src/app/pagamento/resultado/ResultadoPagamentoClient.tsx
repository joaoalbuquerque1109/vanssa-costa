"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";

type ReconcileResponse = {
  ok?: boolean;
  reconciled?: boolean;
  confirmed?: boolean;
  payment_status?: string;
  booking_status?: string;
  error?: string;
};

type PaymentStatusResponse = {
  ok?: boolean;
  confirmed?: boolean;
  order_status?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
};

type UiState = "confirming" | "approved" | "processing" | "rejected" | "retrying";

type Props = {
  paymentId: string | null;
  externalReference: string | null;
  orderId: string | null;
  preferenceId: string | null;
  planId: string | null;
  bookingId: string | null;
};

function getStateLabel(state: UiState) {
  if (state === "confirming") return "Confirmando pagamento...";
  if (state === "approved") return "Pagamento aprovado, agendamento confirmado.";
  if (state === "processing") return "Pagamento ainda em processamento.";
  if (state === "rejected") return "Pagamento nao aprovado.";
  return "Nao foi possivel confirmar agora, mas continuaremos tentando.";
}

export function ResultadoPagamentoClient({ paymentId, externalReference, orderId, preferenceId, planId, bookingId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<UiState>("confirming");
  const [webhookConfirmed, setWebhookConfirmed] = useState(false);
  const [resolvedPaymentId, setResolvedPaymentId] = useState<string | null>(paymentId);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const startRedirect = () => {
      if (redirectTimer) return;
      redirectTimer = setTimeout(() => {
        router.push("/?payment=success");
      }, 1800);
    };

    const handleConfirmed = (nextPaymentId?: string | null) => {
      setResolvedPaymentId(nextPaymentId ?? paymentId);
      setWebhookConfirmed(true);
      setState("approved");
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      startRedirect();
    };

    const checkStatus = async () => {
      const params = new URLSearchParams();
      if (orderId) params.set("orderId", orderId);
      if (!orderId && externalReference) params.set("externalReference", externalReference);
      if (!params.toString()) return;

      try {
        const response = await fetch(`/api/payments/status?${params.toString()}`, { cache: "no-store" });
        const data = (await response.json()) as PaymentStatusResponse;
        if (cancelled) return;
        if (response.ok && data.confirmed) handleConfirmed(data.payment_id);
      } catch {
        return;
      }
    };

    const reconcile = async () => {
      setState("confirming");

      try {
        const response = await fetch("/api/payments/reconcile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            paymentId,
            externalReference,
            orderId,
            preferenceId,
          }),
        });

        const data = (await response.json()) as ReconcileResponse;
        if (cancelled) return;

        const status = String(data.payment_status ?? "").toLowerCase();
        if (response.ok && (data.confirmed || status === "paid")) {
          handleConfirmed(paymentId);
          return;
        }

        if (status === "failed" || status === "rejected" || status === "cancelled" || status === "refunded" || status === "chargeback") {
          setState("rejected");
          return;
        }

        if (response.ok && (status === "pending" || status === "processing" || status === "authorized" || !status)) {
          setState("processing");
          void checkStatus();
          pollTimer = setInterval(() => {
            void checkStatus();
          }, 4000);
          return;
        }

        setState("retrying");
      } catch {
        if (!cancelled) {
          setState("retrying");
          void checkStatus();
          pollTimer = setInterval(() => {
            void checkStatus();
          }, 4000);
        }
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [externalReference, orderId, paymentId, preferenceId, router]);

  return (
    <>
      <PageHero title="Retorno do Pagamento" subtitle="Estamos validando o status oficial direto com o Mercado Pago." />
      <section className="section-padding bg-slate-50">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-soft">
            {webhookConfirmed ? (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Pagamento bem sucedido. Confirmacao recebida no backend. Redirecionando para a pagina inicial...
              </div>
            ) : null}

            <h2 className="text-2xl font-bold text-slate-900">{getStateLabel(state)}</h2>

            <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <p><strong>payment_id:</strong> {resolvedPaymentId ?? "-"}</p>
              <p><strong>external_reference:</strong> {externalReference ?? "-"}</p>
              <p><strong>preference_id:</strong> {preferenceId ?? "-"}</p>
              <p><strong>booking_id:</strong> {bookingId ?? "-"}</p>
              <p><strong>plan_id:</strong> {planId ?? "-"}</p>
              <p><strong>order_id:</strong> {orderId ?? "-"}</p>
            </div>

            <Link href={planId ? "/assinatura" : "/pagamento"} className="legacy-button mt-6">
              {planId ? "Voltar para planos" : "Voltar para pagamento"}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
