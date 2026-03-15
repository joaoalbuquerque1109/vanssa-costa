import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type ServiceUpdateInput = {
  nome: string;
  categoria?: number;
  categoria_nome?: string;
  valor: number;
  tempo: number;
  ativo?: string;
  foto?: string;
};

function canManageCatalog(role: string) {
  return role === "funcionario" || role === "administrador";
}

async function resolveCategoryId(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  categoryIdInput?: number,
  categoryNameInput?: string,
) {
  const categoryName = categoryNameInput?.trim();
  if (categoryName) {
    const existing = await supabase
      .from("cat_servicos")
      .select("id")
      .eq("nome", categoryName)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (existing.error) return { categoryId: null as number | null, error: null as string | null };
    if (existing.data?.id) return { categoryId: existing.data.id, error: null as string | null };

    let created = await supabase.from("cat_servicos").insert({ nome: categoryName }).select("id").single<{ id: number }>();
    if (created.error?.code === "23502" && created.error.message.toLowerCase().includes("id")) {
      const latest = await supabase
        .from("cat_servicos")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: number }>();

      const nextId = Number(latest.data?.id ?? 0) + 1;
      created = await supabase.from("cat_servicos").insert({ id: nextId, nome: categoryName }).select("id").single<{ id: number }>();
    }

    if (created.error) return { categoryId: null as number | null, error: null as string | null };
    return { categoryId: created.data?.id ?? null, error: null as string | null };
  }

  const rawCategory = Number(categoryIdInput);
  const categoryId = Number.isFinite(rawCategory) && rawCategory > 0 ? rawCategory : null;
  return { categoryId, error: null as string | null };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const serviceId = Number(id);
  if (!Number.isFinite(serviceId)) {
    return NextResponse.json({ error: "ID de serviço inválido." }, { status: 400 });
  }

  const body = (await request.json()) as ServiceUpdateInput;
  if (!body?.nome || Number.isNaN(Number(body.valor)) || Number.isNaN(Number(body.tempo))) {
    return NextResponse.json({ error: "Dados inválidos para serviço." }, { status: 400 });
  }

  const { categoryId, error: categoryErrorMessage } = await resolveCategoryId(supabase, body.categoria, body.categoria_nome);
  if (categoryErrorMessage) {
    console.warn("Category resolution warning on update service:", categoryErrorMessage);
  }

  let { data, error } = await supabase
    .from("servicos")
    .update({
      nome: body.nome,
      categoria: categoryId,
      valor: Number(body.valor),
      tempo: Number(body.tempo),
      ativo: body.ativo === "Não" ? "Não" : "Sim",
      ...(body.foto?.trim() ? { foto: body.foto.trim() } : {}),
    })
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error?.code === "23503" && (error.message.includes("servicos_categoria_fkey") || error.details?.includes("servicos_categoria_fkey"))) {
    const retryWithoutCategory = await supabase
      .from("servicos")
      .update({
        nome: body.nome,
        categoria: null,
        valor: Number(body.valor),
        tempo: Number(body.tempo),
        ativo: body.ativo === "Não" ? "Não" : "Sim",
        ...(body.foto?.trim() ? { foto: body.foto.trim() } : {}),
      })
      .eq("id", serviceId)
      .select("*")
      .single();
    data = retryWithoutCategory.data;
    error = retryWithoutCategory.error;
  }

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar serviço.", details: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ service: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const serviceId = Number(id);
  if (!Number.isFinite(serviceId)) {
    return NextResponse.json({ error: "ID de serviço inválido." }, { status: 400 });
  }

  const { data: currentService, error: currentServiceError } = await supabase
    .from("servicos")
    .select("id,ativo")
    .eq("id", serviceId)
    .maybeSingle<{ id: number; ativo?: string | null }>();

  if (currentServiceError) {
    return NextResponse.json({ error: "Falha ao localizar serviço.", details: currentServiceError.message, code: currentServiceError.code }, { status: 500 });
  }

  if (!currentService?.id) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  const deleted = await supabase.from("servicos").delete().eq("id", serviceId);
  if (!deleted.error) {
    return NextResponse.json({ ok: true });
  }

  if (deleted.error.code === "23503") {
    if (currentService.ativo === "Não") {
      const unlink = await supabase.from("servicos_func").delete().eq("servico", serviceId);
      if (unlink.error) {
        return NextResponse.json({ error: "Falha ao remover vínculos do serviço.", details: unlink.error.message, code: unlink.error.code }, { status: 500 });
      }

      const retryDelete = await supabase.from("servicos").delete().eq("id", serviceId);
      if (!retryDelete.error) {
        return NextResponse.json({ ok: true });
      }

      if (retryDelete.error.code === "23503") {
        return NextResponse.json(
          {
            error: "O serviço inativo ainda possui vínculos históricos e não pode ser apagado definitivamente.",
            details: retryDelete.error.message,
            code: retryDelete.error.code,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "Falha ao excluir serviço.",
          details: retryDelete.error.message,
          code: retryDelete.error.code,
        },
        { status: 500 },
      );
    }

    const softDelete = await supabase
      .from("servicos")
      .update({ ativo: "Não" })
      .eq("id", serviceId)
      .select("id")
      .maybeSingle<{ id: number }>();

    if (!softDelete.error) {
      return NextResponse.json({ ok: true, softDeleted: true });
    }
  }

  return NextResponse.json({ error: "Falha ao excluir serviço.", details: deleted.error.message, code: deleted.error.code }, { status: 500 });
}
