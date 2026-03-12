import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = supabase.from("schedule_blocks").select("*").order("block_date", { ascending: false });
  if (from) query = query.gte("block_date", from);
  if (to) query = query.lte("block_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Falha ao listar bloqueios." }, { status: 500 });

  return NextResponse.json({ schedule_blocks: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as {
    employee_id?: number | null;
    block_date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
    block_type: "folga" | "ferias" | "falta" | "bloqueio_manual" | "feriado";
  };

  if (!body.block_date || !body.block_type) {
    return NextResponse.json({ error: "Data e tipo de bloqueio são obrigatórios." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert({
      employee_id: body.employee_id ?? null,
      block_date: body.block_date,
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      reason: body.reason ?? null,
      block_type: body.block_type,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao criar bloqueio." }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}
