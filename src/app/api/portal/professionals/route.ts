import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

export async function GET() {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  let query = supabase
    .from("usuarios")
    .select("id,nome")
    .eq("ativo", "Sim")
    .eq("atendimento", "Sim")
    .order("nome", { ascending: true });

  if (session.profile.role === "funcionario" && session.profile.usuario_id) {
    query = query.eq("id", session.profile.usuario_id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Falha ao carregar profissionais." }, { status: 500 });

  return NextResponse.json({ professionals: data ?? [] });
}

