import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type ProductInput = {
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

export async function GET() {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase.from("produtos").select("*").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar produtos." }, { status: 500 });

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session || !canManageCatalog(session.profile.role)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as ProductInput;
  if (!body?.nome || Number.isNaN(Number(body?.valor_venda)) || Number.isNaN(Number(body?.estoque))) {
    return NextResponse.json({ error: "Dados inválidos para produto." }, { status: 400 });
  }

  const payload = {
    nome: body.nome,
    descricao: body.descricao?.trim() || null,
    categoria: body.categoria ? Number(body.categoria) : null,
    valor_venda: Number(body.valor_venda),
    estoque: Number(body.estoque),
    foto: body.foto?.trim() || "sem-foto.jpg",
  };

  const { data, error } = await supabase.from("produtos").insert(payload).select("*").single();

  if (error) {
    console.error("POST /api/portal/products failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    });
    return NextResponse.json(
      {
        error: "Falha ao criar produto.",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ product: data }, { status: 201 });
}

