import { PageHero } from "@/components/PageHero";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { PlanRow } from "@/types/site";

export default async function AssinaturaPage() {
  const supabase = await createSupabaseServerClient();
  let plans: PlanRow[] = [];

  if (supabase) {
    const plansRes = await supabase
      .from("planos")
      .select("id,slug,nome,descricao,itens,inclui,texto_pagamento,validade_texto,preco,ativo,ordem")
      .eq("ativo", "Sim")
      .order("ordem", { ascending: true })
      .order("id", { ascending: true });

    plans = (plansRes.data ?? []) as PlanRow[];
  }

  return (
    <>
      <PageHero title="Assinaturas" subtitle="Escolha um plano e avance direto para cadastro e pagamento." />
      <SubscriptionPlans plans={plans} />
    </>
  );
}
