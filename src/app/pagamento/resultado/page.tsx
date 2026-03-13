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
    <ResultadoPagamentoClient
      paymentId={params.payment_id ?? null}
      externalReference={params.external_reference ?? null}
      preferenceId={params.preference_id ?? null}
      bookingId={params.booking_id ?? null}
      planId={params.plan_id ?? null}
      orderId={params.order_id ?? null}
    />
  );
}
