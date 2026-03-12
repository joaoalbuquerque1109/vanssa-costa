import Link from "next/link";
import { PageHero } from "@/components/PageHero";

type ResultSearchParams = {
  status?: string;
  payment_id?: string;
  external_reference?: string;
  merchant_order_id?: string;
  preference_id?: string;
  booking_id?: string;
  order_id?: string;
};

function normalizeStatus(value?: string) {
  const status = String(value ?? "").toLowerCase();
  if (status === "approved" || status === "success") return "approved";
  if (status === "rejected" || status === "failure") return "rejected";
  return "pending";
}

function statusLabel(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Rejeitado";
  return "Pendente";
}

export default async function ResultadoPagamentoPage({
  searchParams,
}: {
  searchParams: Promise<ResultSearchParams>;
}) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);

  return (
    <>
      <PageHero
        title="Retorno do Pagamento"
        subtitle="Status retornado pelas back_urls. A confirmacao oficial segue por webhook server-side."
      />
      <section className="section-padding bg-slate-50">
        <div className="container-shell">
          <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-soft">
            <h2 className="text-2xl font-bold text-slate-900">Status retornado: {statusLabel(status)}</h2>
            <p className="mt-4 text-slate-600">
              O status oficial do pagamento e do pedido continua sendo atualizado por webhook do Mercado Pago.
            </p>

            <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <p><strong>payment_id:</strong> {params.payment_id ?? "-"}</p>
              <p><strong>external_reference:</strong> {params.external_reference ?? "-"}</p>
              <p><strong>merchant_order_id:</strong> {params.merchant_order_id ?? "-"}</p>
              <p><strong>preference_id:</strong> {params.preference_id ?? "-"}</p>
              <p><strong>booking_id:</strong> {params.booking_id ?? "-"}</p>
              <p><strong>order_id:</strong> {params.order_id ?? "-"}</p>
            </div>

            <Link href="/pagamento" className="legacy-button mt-6">
              Voltar para pagamento
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
