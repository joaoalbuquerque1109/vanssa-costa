import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type CustomerRow = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  data_nasc: string | null;
};

export async function GET() {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("clientes")
    .select("id,nome,cpf,telefone,email,data_nasc")
    .order("nome", { ascending: true })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar clientes." }, { status: 500 });
  }

  return NextResponse.json({ customers: (data ?? []) as CustomerRow[] });
}
