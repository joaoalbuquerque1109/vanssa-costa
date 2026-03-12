import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

export async function POST() {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
    }

    const { error } = await supabase.from("user_login_events").insert({
      auth_user_id: session.authUserId,
      role: session.profile.role,
    });

    if (error) {
      return NextResponse.json({ error: "Falha ao registrar login." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role: session.profile.role });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

