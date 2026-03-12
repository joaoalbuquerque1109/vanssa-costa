import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

export async function GET() {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase.from("business_hours").select("*").order("weekday");
  if (error) return NextResponse.json({ error: "Falha ao carregar expediente." }, { status: 500 });

  return NextResponse.json({ business_hours: data ?? [] });
}

export async function PUT(request: Request) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as { rows: Array<{ weekday: number; start_time?: string; end_time?: string; break_start?: string; break_end?: string; is_active: boolean }> };
  if (!Array.isArray(body.rows)) return NextResponse.json({ error: "rows inválido." }, { status: 400 });

  await supabase.from("business_hours").delete().gt("weekday", -1);
  const { error } = await supabase.from("business_hours").insert(body.rows);
  if (error) return NextResponse.json({ error: "Falha ao salvar expediente." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
