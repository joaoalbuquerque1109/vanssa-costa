"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

type ReconcileResponse = {
  ok?: boolean;
  reconciled?: boolean;
  confirmed?: boolean;
  payment_status?: string;
  booking_status?: string;
  error?: string;
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
  const [state, setState] = useState<UiState>("confirming");

  useEffect(() => {
    let cancelled = false;

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
          setState("approved");
          return;
        }

        if (status === "failed" || status === "rejected" || status === "cancelled" || status === "refunded" || status === "chargeback") {
          setState("rejected");
          return;
        }

        if (response.ok && (status === "pending" || status === "processing" || status === "authorized" || !status)) {
          setState("processing");
          return;
        }

        setState("retrying");
      } catch {
        if (!cancelled) {
          setState("retrying");
        }
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [externalReference, orderId, paymentId, preferenceId]);

  return (
    <>
      <PageHero title="Retorno do Pagamento" subtitle="Estamos validando o status oficial direto com o Mercado Pago." />
      <section className="section-padding bg-slate-50">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-bold text-slate-900">{getStateLabel(state)}</h2>

            <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <p><strong>payment_id:</strong> {paymentId ?? "-"}</p>
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
