import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

function canManageCatalog(role: string) {
  return role === "funcionario" || role === "administrador";
}

export async function GET() {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase.from("cat_servicos").select("id,nome").order("nome");
  if (error) return NextResponse.json({ error: "Falha ao carregar categorias." }, { status: 500 });

  return NextResponse.json({ categories: data ?? [] });
}

