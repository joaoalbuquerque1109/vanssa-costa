import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

export async function GET() {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase
    .from("services")
    .select("id,name,description,price,duration_minutes,photo_url,category_id,is_active,service_categories(name)")
    .order("name");

  if (error) return NextResponse.json({ error: "Falha ao listar serviços." }, { status: 500 });
  return NextResponse.json({ services: data ?? [] });
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
    duration_minutes: number;
    photo_url?: string;
    category_id?: number | null;
    is_active?: boolean;
  };

  if (!body.name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });

  const { data, error } = await supabase
    .from("services")
    .insert({
      name: body.name,
      description: body.description ?? null,
      price: Number(body.price ?? 0),
      duration_minutes: Number(body.duration_minutes ?? 30),
      photo_url: body.photo_url ?? null,
      category_id: body.category_id ?? null,
      is_active: body.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao criar serviço." }, { status: 500 });
  return NextResponse.json({ ok: true, service_id: data?.id }, { status: 201 });
}
