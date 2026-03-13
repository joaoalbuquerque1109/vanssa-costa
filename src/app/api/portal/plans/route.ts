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
};

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
    .select("id,order_id,cliente_nome,cliente_cpf,servico_nome,created_at,sucesso,payload")
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
    rows: filteredRows.map(({ id, cliente_nome, cliente_cpf, servico_nome, created_at, sucesso }) => ({
      id,
      cliente_nome,
      cliente_cpf,
      servico_nome,
      created_at,
      sucesso,
    })),
  });
}
