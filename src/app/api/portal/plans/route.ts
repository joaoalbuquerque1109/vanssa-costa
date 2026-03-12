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
    .select("id,cliente_nome,cliente_cpf,servico_nome,created_at,sucesso")
    .filter("payload->>plan_id", "not.is", "null")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (res.error) {
    return NextResponse.json({ error: "Falha ao carregar pagamentos de planos." }, { status: 500 });
  }

  return NextResponse.json({ rows: (res.data ?? []) as PlanPaymentRow[] });
}
