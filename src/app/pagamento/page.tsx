import { PageHero } from "@/components/PageHero";
import { CheckoutProWallet } from "@/components/CheckoutProWallet";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function PagamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ agendamento?: string }>;
}) {
  const params = await searchParams;
  const bookingId = Number(params.agendamento ?? 0);

  if (!bookingId) {
    redirect("/agendamentos");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/agendamentos");
  }

  const bookingRes = await supabase
    .from("agendamentos")
    .select("id,status,servicos(valor,nome)")
    .eq("id", bookingId)
    .maybeSingle<{ id: number; status: string; servicos: { valor: number; nome: string } | { valor: number; nome: string }[] | null }>();

  const booking = bookingRes.data;
  const service = Array.isArray(booking?.servicos) ? booking?.servicos[0] : booking?.servicos;

  if (!booking || booking.status !== "Confirmado") {
    redirect("/agendamentos");
  }

  return (
    <>
      <PageHero
        title="Pagamento"
        subtitle="Checkout Pro com componente oficial do Mercado Pago. A confirmação oficial acontece via webhook server-side."
      />
      <section className="section-padding bg-slate-50">
        <div className="container-shell max-w-4xl">
          <CheckoutProWallet
            bookingId={booking.id}
            initialTitle={service?.nome ?? "Agendamento confirmado"}
            initialAmount={Number(service?.valor ?? 0)}
          />
        </div>
      </section>
    </>
  );
}
