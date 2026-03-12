import Link from "next/link";
import type { PlanRow } from "@/types/site";
import { currency } from "@/lib/utils";

export function SubscriptionPlans({ plans }: { plans: PlanRow[] }) {
  return (
    <section className="section-padding bg-slate-50">
      <div className="container-shell">
        <h2 className="section-title">Escolha seu combo</h2>
        <p className="section-subtitle">Ao clicar, voce segue direto para cadastro e pagamento desse plano.</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.id} className="card-shell flex h-full flex-col p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{plan.nome}</h3>
                  {plan.descricao ? <p className="mt-2 text-sm text-slate-600">{plan.descricao}</p> : null}
                </div>
                <p className="text-2xl font-bold text-brand-700">{currency(Number(plan.preco ?? 0))}</p>
              </div>

              {plan.itens?.length ? (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tratamentos</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {plan.itens.map((feature) => (
                      <li key={feature} className="rounded-xl bg-slate-100 px-3 py-2">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {plan.inclui?.length ? (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Todas as sessoes incluem</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {plan.inclui.map((entry) => (
                      <li key={entry} className="rounded-xl bg-slate-100 px-3 py-2">
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {plan.texto_pagamento ? <p className="mt-6 text-sm font-medium text-slate-700">{plan.texto_pagamento}</p> : null}
              {plan.validade_texto ? <p className="mt-1 text-sm text-slate-500">{plan.validade_texto}</p> : null}

              <Link href={`/assinatura/cadastro?plano=${plan.id}`} className="legacy-button mt-8 w-full text-center">
                Quero este plano
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
