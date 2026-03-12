import { PageHero } from "@/components/PageHero";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import type { SubscriptionGroupRow, SubscriptionItemRow } from "@/types/site";

const SUBSCRIPTION_GROUPS: SubscriptionGroupRow[] = [
  { id: 1, nome: "Assinatura - cabelo - barba - bigode - sobrancelha", ativo: "Sim" },
  { id: 3, nome: "Assinaturas de tratamentos capilares", ativo: "Sim" },
];

const SUBSCRIPTION_ITEMS: SubscriptionItemRow[] = [
  { id: 3, grupo: 1, nome: "COMBO BRONZE", valor: 69.99, ativo: "Sim", c1: "Corte cabelo", c2: "Lavar cabelo", c3: "Acabamento ilimitado" },
  { id: 4, grupo: 1, nome: "COMBO PRATA", valor: 120, ativo: "Sim", c1: "Corte ilimitado", c2: "Designer barba", c3: "Designer sobrancelha" },
  { id: 5, grupo: 1, nome: "COMBO OURO", valor: 130, ativo: "Sim", c1: "Barba ilimitada", c2: "Corte cabelo", c3: "Acabamento ilimitado" },
  { id: 7, grupo: 3, nome: "COMBO PRATA CAPILAR", valor: 99.99, ativo: "Sim", c1: "Hidratação", c2: "Escova ilimitada" },
];

export default function AssinaturaPage() {
  return (
    <>
      <PageHero title="Assinaturas" subtitle="Edite os planos desta página diretamente neste arquivo." />
      <SubscriptionPlans groups={SUBSCRIPTION_GROUPS} items={SUBSCRIPTION_ITEMS} />
    </>
  );
}
