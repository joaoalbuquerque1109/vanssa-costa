import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { phoneToWhatsApp } from "@/lib/utils";

type CreatePlanRequestPayload = {
  planId: number;
  customer: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    dataNascimento: string;
  };
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as CreatePlanRequestPayload;
  const planId = Number(body.planId);
  const nome = String(body.customer?.nome ?? "").trim();
  const email = String(body.customer?.email ?? "").trim().toLowerCase();
  const telefone = String(body.customer?.telefone ?? "").trim();
  const cpf = String(body.customer?.cpf ?? "").replace(/\D/g, "");
  const dataNascimento = String(body.customer?.dataNascimento ?? "").trim();

  if (!planId || !nome || !email || !telefone || cpf.length !== 11 || !dataNascimento) {
    return NextResponse.json({ error: "Dados inválidos para solicitar o plano." }, { status: 400 });
  }

  const planRes = await supabase
    .from("planos")
    .select("id,nome,preco,ativo")
    .eq("id", planId)
    .maybeSingle<{ id: number; nome: string; preco: number; ativo: string | null }>();

  if (planRes.error || !planRes.data?.id || planRes.data.ativo !== "Sim") {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
  }

  const financeInsert = await supabase
    .from("pagamentos_financeiro")
    .insert({
      cliente_nome: nome,
      cliente_cpf: cpf,
      data_reserva: new Date().toISOString().slice(0, 10),
      servico_nome: planRes.data.nome,
      valor: Number(planRes.data.preco ?? 0),
      tipo_pagamento: "WhatsApp",
      status_pagamento: "Pendente",
      sucesso: false,
      whatsapp: telefone,
      payload: {
        plan_id: planRes.data.id,
        email,
        telefone,
        data_nascimento: dataNascimento,
        source: "plan_whatsapp",
      },
    })
    .select("id")
    .single<{ id: number }>();

  if (financeInsert.error || !financeInsert.data?.id) {
    return NextResponse.json({ error: "Não foi possível registrar a solicitação do plano." }, { status: 500 });
  }

  const configRes = await supabase
    .from("config")
    .select("telefone_whatsapp")
    .limit(1)
    .maybeSingle<{ telefone_whatsapp: string }>();

  const whatsappNumber = String(configRes.data?.telefone_whatsapp ?? "").trim() || "(83) 98751-6023";
  const whatsappText = [
    "Olá! Acabei de solicitar um plano.",
    `Nome: ${nome}`,
    `Plano: ${planRes.data.nome}`,
    `Telefone: ${telefone}`,
  ].join("\n");

  return NextResponse.json({
    ok: true,
    requestId: financeInsert.data.id,
    whatsappRedirect: `${phoneToWhatsApp(whatsappNumber)}&text=${encodeURIComponent(whatsappText)}`,
  });
}
