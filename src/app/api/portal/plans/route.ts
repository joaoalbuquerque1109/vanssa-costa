import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type PlanPaymentRow = {
  id: number;
  cliente_nome: string;
  cliente_cpf: string;
  servico_nome: string;
  created_at: string;
  sucesso: boolean;
  status_pagamento: string;
};

const ALLOWED_PLAN_STATUS = new Set(["Pendente", "Pago", "Cancelado"]);

export async function GET() {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem acessar os planos." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const res = await supabase
    .from("pagamentos_financeiro")
    .select("id,order_id,cliente_nome,cliente_cpf,servico_nome,created_at,sucesso,status_pagamento,payload")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (res.error) {
    return NextResponse.json({ error: "Falha ao carregar pagamentos de planos." }, { status: 500 });
  }

  const rows = (res.data ?? []) as Array<
    PlanPaymentRow & { order_id?: string | null; payload?: Record<string, unknown> | null }
  >;

  const orderIds = rows.map((row) => row.order_id).filter((value): value is string => Boolean(value));
  let orderPlanIds = new Map<string, unknown>();

  if (orderIds.length) {
    const ordersRes = await supabase
      .from("orders")
      .select("id,metadata")
      .in("id", orderIds)
      .returns<Array<{ id: string; metadata: Record<string, unknown> | null }>>();

    if (!ordersRes.error) {
      orderPlanIds = new Map(
        (ordersRes.data ?? []).map((order) => [order.id, order.metadata?.plan_id ?? null]),
      );
    }
  }

  const filteredRows = rows.filter((row) => {
    const payloadPlanId = row.payload?.plan_id;
    if (payloadPlanId !== null && payloadPlanId !== undefined && String(payloadPlanId).trim() !== "") return true;

    const orderPlanId = row.order_id ? orderPlanIds.get(row.order_id) : null;
    return orderPlanId !== null && orderPlanId !== undefined && String(orderPlanId).trim() !== "";
  });

  return NextResponse.json({
    rows: filteredRows.map(({ id, cliente_nome, cliente_cpf, servico_nome, created_at, sucesso, status_pagamento }) => ({
      id,
      cliente_nome,
      cliente_cpf,
      servico_nome,
      created_at,
      sucesso,
      status_pagamento: status_pagamento || (sucesso ? "Pago" : "Pendente"),
    })),
  });
}

export async function PUT(request: Request) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem alterar o status dos planos." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const body = (await request.json()) as { id?: number; status?: string };
  const id = Number(body.id);
  const status = String(body.status ?? "").trim();

  if (!id || !ALLOWED_PLAN_STATUS.has(status)) {
    return NextResponse.json({ error: "Dados inválidos para atualizar o plano." }, { status: 400 });
  }

  const updated = await supabase
    .from("pagamentos_financeiro")
    .update({
      status_pagamento: status,
      sucesso: status === "Pago",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,status_pagamento,sucesso")
    .maybeSingle<{ id: number; status_pagamento: string; sucesso: boolean }>();

  if (updated.error || !updated.data?.id) {
    return NextResponse.json({ error: "Falha ao atualizar o status do plano." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: updated.data });
}
