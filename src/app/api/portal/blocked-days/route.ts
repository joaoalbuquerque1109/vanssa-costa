import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type BlockedDayInput = {
  data: string;
  funcionario?: number | null;
};

function canAccess(role: string) {
  return role === "funcionario" || role === "administrador";
}

export async function GET(request: Request) {
  const session = await getPortalSession();
  if (!session || !canAccess(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase.from("dias_bloqueio").select("id,data,funcionario,usuario").order("data", { ascending: true });
  if (from) query = query.gte("data", from);
  if (to) query = query.lte("data", to);

  if (session.profile.role === "funcionario" && session.profile.usuario_id) {
    query = query.in("funcionario", [0, session.profile.usuario_id]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Falha ao carregar bloqueios." }, { status: 500 });

  return NextResponse.json({ blockedDays: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador" || !session.profile.usuario_id) {
    return NextResponse.json({ error: "Apenas administradores podem criar bloqueios." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as BlockedDayInput;
  if (!body?.data) {
    return NextResponse.json({ error: "Data é obrigatória." }, { status: 400 });
  }

  const funcionario = body.funcionario === null || body.funcionario === undefined ? 0 : Number(body.funcionario);
  if (!Number.isFinite(funcionario) || funcionario < 0) {
    return NextResponse.json({ error: "Funcionário inválido." }, { status: 400 });
  }

  const existing = await supabase
    .from("dias_bloqueio")
    .select("id")
    .eq("data", body.data)
    .eq("funcionario", funcionario)
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (existing.data?.id) {
    return NextResponse.json({ ok: true, id: existing.data.id });
  }

  const { data, error } = await supabase
    .from("dias_bloqueio")
    .insert({
      data: body.data,
      funcionario,
      usuario: session.profile.usuario_id,
    })
    .select("id")
    .single<{ id: number }>();

  if (error) return NextResponse.json({ error: "Falha ao criar bloqueio." }, { status: 500 });

  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem remover bloqueios." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const { error } = await supabase.from("dias_bloqueio").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao remover bloqueio." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

