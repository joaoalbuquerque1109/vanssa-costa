import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

export async function GET() {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase
    .from("products")
    .select("id,name,description,price,photo_url,stock,sku,is_active")
    .order("name");

  if (error) return NextResponse.json({ error: "Falha ao listar produtos." }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as {
    name: string;
    description?: string;
    price: number;
    photo_url?: string;
    stock: number;
    sku?: string;
    is_active?: boolean;
  };

  if (!body.name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      description: body.description ?? null,
      price: Number(body.price ?? 0),
      photo_url: body.photo_url ?? null,
      stock: Number(body.stock ?? 0),
      sku: body.sku?.trim() || null,
      is_active: body.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao criar produto." }, { status: 500 });
  return NextResponse.json({ ok: true, product_id: data?.id }, { status: 201 });
}
