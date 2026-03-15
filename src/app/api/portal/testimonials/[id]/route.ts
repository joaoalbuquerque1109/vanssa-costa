import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type TestimonialUpdateInput = {
  ativo?: string;
};

function canManageFeedback(role: string) {
  return role === "administrador";
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageFeedback(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const testimonialId = Number(id);
  if (!Number.isFinite(testimonialId)) {
    return NextResponse.json({ error: "ID de feedback inválido." }, { status: 400 });
  }

  const body = (await request.json()) as TestimonialUpdateInput;
  const ativo = body.ativo === "Sim" ? "Sim" : "Não";

  const { data, error } = await supabase
    .from("comentarios")
    .update({ ativo, foto: null })
    .eq("id", testimonialId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar feedback.", details: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ testimonial: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageFeedback(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const testimonialId = Number(id);
  if (!Number.isFinite(testimonialId)) {
    return NextResponse.json({ error: "ID de feedback inválido." }, { status: 400 });
  }

  const { error } = await supabase.from("comentarios").delete().eq("id", testimonialId);
  if (error) {
    return NextResponse.json({ error: "Falha ao excluir feedback.", details: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
