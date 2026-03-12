import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type ServiceInput = {
  nome: string;
  categoria?: number;
  categoria_nome?: string;
  valor: number;
  tempo: number;
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

export async function GET() {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase.from("servicos").select("*").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar serviços." }, { status: 500 });

  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as ServiceInput;

  if (!body?.nome || Number.isNaN(Number(body?.valor)) || Number.isNaN(Number(body?.tempo))) {
    return NextResponse.json({ error: "Dados inválidos para serviço." }, { status: 400 });
  }

  const { categoryId, error: categoryErrorMessage } = await resolveCategoryId(supabase, body.categoria, body.categoria_nome);
  if (categoryErrorMessage) {
    console.warn("Category resolution warning on create service:", categoryErrorMessage);
  }

  const payload = {
    nome: body.nome,
    categoria: categoryId,
    valor: Number(body.valor),
    tempo: Number(body.tempo),
    foto: body.foto?.trim() || "sem-foto.jpg",
    ativo: "Sim" as const,
  };

  let { data, error } = await supabase.from("servicos").insert(payload).select("*").single();

  if (error?.code === "23502" && error.message.toLowerCase().includes("id")) {
    const { data: latest } = await supabase
      .from("servicos")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: number }>();

    const nextId = Number(latest?.id ?? 0) + 1;
    const retry = await supabase
      .from("servicos")
      .insert({ id: nextId, ...payload })
      .select("*")
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error?.code === "23503" && (error.message.includes("servicos_categoria_fkey") || error.details?.includes("servicos_categoria_fkey"))) {
    const retryWithoutCategory = await supabase
      .from("servicos")
      .insert({ ...payload, categoria: null })
      .select("*")
      .single();
    data = retryWithoutCategory.data;
    error = retryWithoutCategory.error;
  }

  if (error) {
    console.error("POST /api/portal/services failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    });
    return NextResponse.json(
      {
        error: "Falha ao criar serviço.",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ service: data }, { status: 201 });
}

