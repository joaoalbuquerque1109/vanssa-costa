import { PageHero } from "@/components/PageHero";
import { CheckoutProWallet } from "@/components/CheckoutProWallet";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function PagamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ agendamento?: string; pendente?: string }>;
}) {
  const params = await searchParams;
  const pendingId = String(params.pendente ?? "").trim();
  const bookingId = Number(params.agendamento ?? 0);

  if (!pendingId && !bookingId) {
    redirect("/agendamentos");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/agendamentos");
  }

  if (pendingId) {
    const pendingRes = await supabase
      .from("agendamentos_pendentes")
      .select("id,status,valor,servicos(nome)")
      .eq("id", pendingId)
      .in("status", ["pending", "pending_payment"])
      .gt("expires_at", new Date().toISOString())
      .maybeSingle<{
        id: string;
        status: string;
        valor: number;
        servicos: { nome: string } | { nome: string }[] | null;
      }>();

    const pending = pendingRes.data;
    const service = Array.isArray(pending?.servicos) ? pending?.servicos[0] : pending?.servicos;

    if (!pending) {
      redirect("/agendamentos");
    }

    return (
      <>
        <PageHero
          title="Pagamento"
          subtitle="Seu horario sera confirmado no banco apenas apos a aprovacao oficial do pagamento."
        />
        <section className="section-padding bg-slate-50">
          <div className="container-shell max-w-4xl">
            <CheckoutProWallet
              pendingBookingId={pending.id}
              initialTitle={service?.nome ?? "Agendamento"}
              initialAmount={Number(pending.valor ?? 0)}
            />
          </div>
        </section>
      </>
    );
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
        subtitle="Checkout Pro com componente oficial do Mercado Pago. A confirmacao oficial acontece via webhook server-side."
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
