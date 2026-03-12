import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PlanCheckoutCard } from "@/components/PlanCheckoutCard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { PlanRow } from "@/types/site";

export default async function AssinaturaCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const params = await searchParams;
  const planId = Number(params.plano ?? 0);

  if (!planId) {
    redirect("/assinatura");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/assinatura");
  }

  const planRes = await supabase
    .from("planos")
    .select("id,nome,preco,ativo")
    .eq("id", planId)
    .maybeSingle<Pick<PlanRow, "id" | "nome" | "preco" | "ativo">>();

  if (!planRes.data || planRes.data.ativo !== "Sim") {
    redirect("/assinatura");
  }

  return (
    <>
      <PageHero
        title="Cadastro e Pagamento"
        subtitle="Preencha seus dados e conclua o pagamento do plano selecionado."
      />
      <section className="section-padding bg-slate-50">
        <div className="container-shell max-w-4xl">
          <PlanCheckoutCard planId={planRes.data.id} planName={planRes.data.nome} planPrice={Number(planRes.data.preco)} />
        </div>
      </section>
    </>
  );
}
