import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem alterar serviços do funcionário." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as { serviceIds: number[] };
  const { id } = await params;
  const employeeId = Number(id);

  if (!Array.isArray(body.serviceIds)) {
    return NextResponse.json({ error: "serviceIds inválido." }, { status: 400 });
  }

  await supabase.from("servicos_func").delete().eq("funcionario", employeeId);

  if (body.serviceIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: latestLink } = await supabase.from("servicos_func").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
  let nextLinkId = Number(latestLink?.id ?? 0) + 1;

  const payload = body.serviceIds.map((serviceId) => ({
    id: nextLinkId++,
    funcionario: employeeId,
    servico: Number(serviceId),
  }));

  const { error } = await supabase.from("servicos_func").insert(payload);
  if (error) return NextResponse.json({ error: "Falha ao atualizar serviços do funcionário." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
