
import type { SubscriptionGroupRow, SubscriptionItemRow } from "@/types/site";
import { currency } from "@/lib/utils";

export function SubscriptionPlans({
  groups,
  items,
}: {
  groups: SubscriptionGroupRow[];
  items: SubscriptionItemRow[];
}) {
  return (
    <section className="section-padding bg-slate-50">
      <div className="container-shell">
        <h2 className="section-title">Escolha um plano e faça parte da assinatura</h2>
        <p className="section-subtitle">
          Mantivemos a proposta visual e o conteúdo da versão atual, com cards mais modernos e estrutura otimizada.
        </p>

        <div className="mt-12 space-y-12">
          {groups.map((group) => {
            const groupItems = items.filter((item) => Number(item.grupo) === Number(group.id));
            return (
              <div key={group.id}>
                <h3 className="text-2xl font-bold text-slate-900">{group.nome}</h3>
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  {groupItems.map((item) => {
                    const features = Object.entries(item)
                      .filter(([key, value]) => /^c\d+$/.test(key) && value)
                      .map(([, value]) => String(value));

                    return (
                      <article key={item.id} className="card-shell flex h-full flex-col p-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-bold text-slate-900">{item.nome}</h4>
                            <p className="mt-2 text-3xl font-bold text-brand-700">{currency(Number(item.valor))}</p>
                          </div>
                        </div>
                        <ul className="mt-8 space-y-3 text-sm text-slate-600">
                          {features.map((feature) => (
                            <li key={feature} className="rounded-2xl bg-slate-50 px-4 py-3">{feature}</li>
                          ))}
                        </ul>
                        <button className="legacy-button mt-8 w-full">Quero este plano</button>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
