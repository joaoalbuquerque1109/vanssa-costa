import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/panel-auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Apenas admin pode alterar funcionário." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    photo_url?: string | null;
    phone?: string | null;
    email?: string;
    cpf?: string;
    role?: "funcionario" | "administrador";
    is_active?: boolean;
    description?: string | null;
    service_ids?: number[];
  };

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.photo_url !== undefined) patch.photo_url = body.photo_url;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email;
  if (body.cpf !== undefined) patch.cpf = body.cpf.replace(/\D/g, "");
  if (body.role !== undefined) patch.role = body.role;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.description !== undefined) patch.description = body.description;
  patch.updated_at = new Date().toISOString();

  const updateRes = await supabase.from("employees").update(patch).eq("id", Number(id));
  if (updateRes.error) return NextResponse.json({ error: "Falha ao atualizar funcionário." }, { status: 500 });

  if (Array.isArray(body.service_ids)) {
    await supabase.from("employee_services").delete().eq("employee_id", Number(id));
    if (body.service_ids.length) {
      const links = body.service_ids.map((serviceId) => ({ employee_id: Number(id), service_id: serviceId }));
      await supabase.from("employee_services").insert(links);
    }
  }

  return NextResponse.json({ ok: true });
}
