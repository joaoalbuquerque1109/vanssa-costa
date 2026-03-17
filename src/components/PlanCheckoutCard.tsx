"use client";

import { useState } from "react";
import { currency } from "@/lib/utils";

type CustomerPayload = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
};

type CreatePlanResponse = {
  whatsappRedirect?: string;
  error?: string;
};

export function PlanCheckoutCard({
  planId,
  planName,
  planPrice,
}: {
  planId: number;
  planName: string;
  planPrice: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerPayload>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
  });

  const handleSubmit = async () => {
    setError(null);

    const cpfDigits = customer.cpf.replace(/\D/g, "");
    if (!customer.nome || !customer.email || !customer.telefone || cpfDigits.length !== 11 || !customer.dataNascimento) {
      setError("Preencha todos os dados de cadastro.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          customer,
        }),
      });

      const data = (await response.json()) as CreatePlanResponse;
      if (!response.ok || !data.whatsappRedirect) {
        setError(data.error ?? "Não foi possível registrar a solicitação do plano.");
        return;
      }

      window.location.href = data.whatsappRedirect;
    } catch {
      setError("Erro inesperado ao solicitar o plano.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[32px] bg-white p-8 shadow-soft">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Plano selecionado</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{planName}</h2>
        <p className="mt-1 text-lg font-semibold text-brand-700">{currency(planPrice)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input className="form-field" placeholder="Nome completo" value={customer.nome} onChange={(e) => setCustomer((prev) => ({ ...prev, nome: e.target.value }))} />
        <input className="form-field" type="email" placeholder="E-mail" value={customer.email} onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))} />
        <input className="form-field" placeholder="Telefone" value={customer.telefone} onChange={(e) => setCustomer((prev) => ({ ...prev, telefone: e.target.value }))} />
        <input className="form-field" placeholder="CPF" value={customer.cpf} onChange={(e) => setCustomer((prev) => ({ ...prev, cpf: e.target.value }))} />
        <input className="form-field md:col-span-2" type="date" value={customer.dataNascimento} onChange={(e) => setCustomer((prev) => ({ ...prev, dataNascimento: e.target.value }))} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
        Após enviar seus dados, você será direcionado ao WhatsApp com a mensagem pronta para concluir a solicitação do plano.
      </div>

      <button type="button" className="legacy-button" onClick={handleSubmit} disabled={loading}>
        {loading ? "Redirecionando..." : "Continuar para WhatsApp"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
