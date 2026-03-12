import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin, requireEmployeeOrAdmin } from "@/lib/panel-auth";

export async function GET(request: NextRequest) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const search = request.nextUrl.searchParams.get("search")?.trim();

  let query = supabase
    .from("employees")
    .select("id,name,photo_url,phone,email,role,is_active,description,employee_services(service_id)")
    .order("name");

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Falha ao listar funcionários." }, { status: 500 });

  return NextResponse.json({ employees: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Apenas admin pode criar funcionário." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as {
    name: string;
    photo_url?: string;
    phone?: string;
    email: string;
    cpf: string;
    role: "funcionario" | "administrador";
    is_active?: boolean;
    description?: string;
    service_ids?: number[];
  };

  if (!body.name || !body.email || !body.cpf || !body.role) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
  }

  const employeeInsert = await supabase
    .from("employees")
    .insert({
      name: body.name,
      photo_url: body.photo_url ?? null,
      phone: body.phone ?? null,
      email: body.email,
      cpf: body.cpf.replace(/\D/g, ""),
      role: body.role,
      is_active: body.is_active ?? true,
      description: body.description ?? null,
    })
    .select("id")
    .single<{ id: number }>();

  if (employeeInsert.error || !employeeInsert.data?.id) {
    return NextResponse.json({ error: "Falha ao criar funcionário." }, { status: 500 });
  }

  if (Array.isArray(body.service_ids) && body.service_ids.length > 0) {
    const links = body.service_ids.map((serviceId) => ({ employee_id: employeeInsert.data.id, service_id: serviceId }));
    await supabase.from("employee_services").insert(links);
  }

  return NextResponse.json({ ok: true, employee_id: employeeInsert.data.id }, { status: 201 });
}
