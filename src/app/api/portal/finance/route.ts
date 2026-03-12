import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type FinanceRow = {
  id: number;
  cliente_nome: string;
  cliente_cpf: string;
  data_reserva: string;
  servico_nome: string;
  valor: number;
  tipo_pagamento: string | null;
  sucesso: boolean;
  status_pagamento: string;
};

export async function GET() {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem acessar o financeiro." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const res = await supabase
    .from("pagamentos_financeiro")
    .select("id,cliente_nome,cliente_cpf,data_reserva,servico_nome,valor,tipo_pagamento,sucesso,status_pagamento")
    .order("data_reserva", { ascending: false })
    .order("id", { ascending: false });

  if (res.error) {
    return NextResponse.json({ error: "Falha ao carregar financeiro." }, { status: 500 });
  }

  return NextResponse.json({ rows: (res.data ?? []) as FinanceRow[] });
}
