import { ResultadoPagamentoClient } from "./ResultadoPagamentoClient";

type ResultSearchParams = {
  payment_id?: string;
  external_reference?: string;
  preference_id?: string;
  booking_id?: string;
  plan_id?: string;
  order_id?: string;
};

export default async function ResultadoPagamentoPage({
  searchParams,
}: {
  searchParams: Promise<ResultSearchParams>;
}) {
  const params = await searchParams;

  return (
<<<<<<< HEAD
    <>
      <PageHero
        title="Retorno do Pagamento"
        subtitle="Status retornado pelo checkout. A confirmacao oficial segue por webhook server-side."
      />
      <section className="section-padding bg-slate-50">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-bold text-slate-900">Status retornado: {statusLabel(status)}</h2>
            <p className="mt-4 text-slate-600">
              O status oficial do pagamento e do pedido continua sendo atualizado por webhook do Asaas.
            </p>

            <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <p><strong>payment_id:</strong> {params.payment_id ?? "-"}</p>
              <p><strong>external_reference:</strong> {params.external_reference ?? "-"}</p>
              <p><strong>merchant_order_id:</strong> {params.merchant_order_id ?? "-"}</p>
              <p><strong>preference_id:</strong> {params.preference_id ?? "-"}</p>
              <p><strong>booking_id:</strong> {params.booking_id ?? "-"}</p>
              <p><strong>plan_id:</strong> {params.plan_id ?? "-"}</p>
              <p><strong>order_id:</strong> {params.order_id ?? "-"}</p>
            </div>

            <Link href={params.plan_id ? "/assinatura" : "/pagamento"} className="legacy-button mt-6">
              {params.plan_id ? "Voltar para planos" : "Voltar para pagamento"}
            </Link>
          </div>
        </div>
      </section>
    </>
=======
    <ResultadoPagamentoClient
      paymentId={params.payment_id ?? null}
      externalReference={params.external_reference ?? null}
      preferenceId={params.preference_id ?? null}
      bookingId={params.booking_id ?? null}
      planId={params.plan_id ?? null}
      orderId={params.order_id ?? null}
    />
>>>>>>> b0f0fc1f875ccc73cc93736b7d52cd83146afd0e
  );
}
