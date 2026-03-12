import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type DayScheduleInput = {
  dia: string;
  inicio: string;
  final: string;
  inicio_almoco?: string | null;
  final_almoco?: string | null;
};

export async function GET() {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador") || !session.profile.usuario_id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase
    .from("dias")
    .select("id,dia,inicio,final,inicio_almoco,final_almoco")
    .eq("funcionario", session.profile.usuario_id)
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: "Falha ao carregar horários." }, { status: 500 });

  return NextResponse.json({ days: data ?? [] });
}

export async function PUT(request: Request) {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador") || !session.profile.usuario_id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as { days: DayScheduleInput[] };

  if (!Array.isArray(body.days) || body.days.length === 0) {
    return NextResponse.json({ error: "Envie os dias de trabalho." }, { status: 400 });
  }

  await supabase.from("dias").delete().eq("funcionario", session.profile.usuario_id);

  const { data: latestDay } = await supabase.from("dias").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
  let nextDayId = Number(latestDay?.id ?? 0) + 1;

  const payload = body.days.map((day) => ({
    id: nextDayId++,
    funcionario: session.profile.usuario_id,
    dia: day.dia,
    inicio: day.inicio,
    final: day.final,
    inicio_almoco: day.inicio_almoco ?? "00:00:00",
    final_almoco: day.final_almoco ?? "00:00:00",
  }));

  const { error } = await supabase.from("dias").insert(payload);
  if (error) return NextResponse.json({ error: "Falha ao atualizar horários." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

