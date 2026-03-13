import { PageHero } from "@/components/PageHero";
import { ServicesGrid } from "@/components/ServicesGrid";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { CategoryRow, ServiceRow } from "@/types/site";

export default async function ServicosPage() {
  const supabase = await createSupabaseServerClient();
  let services: ServiceRow[] = [];
  let categories: CategoryRow[] = [];

  if (supabase) {
    const [servicesRes, categoriesRes] = await Promise.all([
      supabase.from("servicos").select("id,nome,categoria,valor,foto,tempo").eq("ativo", "Sim").order("id", { ascending: true }),
      supabase.from("cat_servicos").select("id,nome").order("nome", { ascending: true }),
    ]);

    services = (servicesRes.data ?? []) as ServiceRow[];
    const allCategories = (categoriesRes.data ?? []) as CategoryRow[];
    const serviceCategoryIds = new Set(services.map((service) => Number(service.categoria)));
    categories = allCategories.filter((category) => serviceCategoryIds.has(Number(category.id)));
  }

  return (
    <>
      <PageHero title="Nossos Servicos" subtitle="átalogo dos melhores serviços da região." />
      <ServicesGrid services={services} categories={categories} />
    </>
  );
}
