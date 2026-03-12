import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type ProductUpdateInput = {
  nome: string;
  descricao?: string;
  categoria?: number;
  valor_venda: number;
  estoque: number;
  foto?: string;
};

function canManageCatalog(role: string) {
  return role === "funcionario" || role === "administrador";
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "ID de produto inválido." }, { status: 400 });
  }

  const body = (await request.json()) as ProductUpdateInput;
  if (!body?.nome || Number.isNaN(Number(body.valor_venda)) || Number.isNaN(Number(body.estoque))) {
    return NextResponse.json({ error: "Dados inválidos para produto." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("produtos")
    .update({
      nome: body.nome,
      descricao: body.descricao?.trim() || null,
      categoria: body.categoria ? Number(body.categoria) : null,
      valor_venda: Number(body.valor_venda),
      estoque: Number(body.estoque),
      ...(body.foto?.trim() ? { foto: body.foto.trim() } : {}),
    })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao atualizar produto." }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "ID de produto inválido." }, { status: 400 });
  }

  const { error } = await supabase.from("produtos").delete().eq("id", productId);
  if (error) {
    return NextResponse.json({ error: "Falha ao excluir produto.", details: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
