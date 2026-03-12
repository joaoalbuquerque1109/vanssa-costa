import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

async function resolveEmployeeId(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, legacyUserId?: number | null) {
  if (!legacyUserId) return null;
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("legacy_user_id", legacyUserId)
    .limit(1)
    .maybeSingle<{ id: number }>();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const requestedEmployeeId = Number(request.nextUrl.searchParams.get("employee_id") ?? 0);
  const ownEmployeeId = await resolveEmployeeId(supabase, session.profile.usuario_id);
  const employeeId = session.profile.role === "administrador" && requestedEmployeeId ? requestedEmployeeId : ownEmployeeId;

  if (!employeeId) return NextResponse.json({ employee_work_hours: [] });

  const { data, error } = await supabase
    .from("employee_work_hours")
    .select("*")
    .eq("employee_id", employeeId)
    .order("weekday");

  if (error) return NextResponse.json({ error: "Falha ao carregar horário individual." }, { status: 500 });
  return NextResponse.json({ employee_work_hours: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as {
    employee_id?: number;
    rows: Array<{ weekday: number; start_time?: string; end_time?: string; break_start?: string; break_end?: string; is_working_day: boolean }>;
  };

  const ownEmployeeId = await resolveEmployeeId(supabase, session.profile.usuario_id);
  const employeeId = session.profile.role === "administrador" && body.employee_id ? body.employee_id : ownEmployeeId;

  if (!employeeId) return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
  if (!Array.isArray(body.rows)) return NextResponse.json({ error: "rows inválido." }, { status: 400 });

  await supabase.from("employee_work_hours").delete().eq("employee_id", employeeId);
  const payload = body.rows.map((row) => ({ ...row, employee_id: employeeId }));
  const { error } = await supabase.from("employee_work_hours").insert(payload);

  if (error) return NextResponse.json({ error: "Falha ao salvar horário individual." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
