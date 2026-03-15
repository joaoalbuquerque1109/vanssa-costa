import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

function canManageFeedback(role: string) {
  return role === "administrador";
}

export async function GET() {
  const session = await getPortalSession();
  if (!session || !canManageFeedback(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase.from("comentarios").select("*").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar feedbacks.", details: error.message, code: error.code }, { status: 500 });

  return NextResponse.json({ testimonials: data ?? [] });
}
