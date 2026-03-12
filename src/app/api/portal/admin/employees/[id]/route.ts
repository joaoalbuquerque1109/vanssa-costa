import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type UpdateEmployeeInput = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  serviceIds?: number[];
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem atualizar funcionários." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isFinite(employeeId)) {
    return NextResponse.json({ error: "ID de funcionário inválido." }, { status: 400 });
  }

  const body = (await request.json()) as UpdateEmployeeInput;
  const cpfDigits = body.cpf?.replace(/\D/g, "") ?? "";
  if (!body.nome || !body.email || cpfDigits.length !== 11) {
    return NextResponse.json({ error: "Nome, e-mail e CPF válido são obrigatórios." }, { status: 400 });
  }

  const userUpdate = await supabase
    .from("usuarios")
    .update({
      nome: body.nome,
      email: body.email,
      cpf: cpfDigits,
      telefone: body.telefone ?? "",
    })
    .eq("id", employeeId);

  if (userUpdate.error) {
    return NextResponse.json({ error: "Falha ao atualizar dados do funcionário." }, { status: 500 });
  }

  if (Array.isArray(body.serviceIds)) {
    await supabase.from("servicos_func").delete().eq("funcionario", employeeId);

    if (body.serviceIds.length > 0) {
      const { data: latestLink } = await supabase.from("servicos_func").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
      let nextLinkId = Number(latestLink?.id ?? 0) + 1;

      const payload = body.serviceIds.map((serviceId) => ({
        id: nextLinkId++,
        funcionario: employeeId,
        servico: Number(serviceId),
      }));

      const linksInsert = await supabase.from("servicos_func").insert(payload);
      if (linksInsert.error) {
        return NextResponse.json({ error: "Funcionário atualizado, mas houve falha ao atualizar serviços." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem excluir funcionários." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { id } = await params;
  const employeeId = Number(id);
  if (!Number.isFinite(employeeId)) {
    return NextResponse.json({ error: "ID de funcionário inválido." }, { status: 400 });
  }

  if (session.profile.usuario_id && Number(session.profile.usuario_id) === employeeId) {
    return NextResponse.json({ error: "Você não pode excluir o seu próprio usuário." }, { status: 400 });
  }

  const employee = await supabase
    .from("usuarios")
    .select("id,nivel,ativo")
    .eq("id", employeeId)
    .limit(1)
    .maybeSingle<{ id: number; nivel: string | null; ativo: string | null }>();

  if (employee.error) {
    return NextResponse.json({ error: "Falha ao consultar funcionário." }, { status: 500 });
  }

  if (!employee.data?.id) {
    return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
  }

  if (String(employee.data.nivel ?? "").toLowerCase() === "administrador") {
    return NextResponse.json({ error: "A exclusão de administrador não é permitida por esta tela." }, { status: 400 });
  }

  await supabase.from("servicos_func").delete().eq("funcionario", employeeId);
  await supabase.from("dias").delete().eq("funcionario", employeeId);
  await supabase.from("dias_bloqueio").delete().eq("funcionario", employeeId);

  const userUpdate = await supabase
    .from("usuarios")
    .update({
      ativo: "Não",
      atendimento: "Não",
      visualizar: "Não",
    })
    .eq("id", employeeId);

  if (userUpdate.error) {
    return NextResponse.json({ error: "Falha ao excluir funcionário." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, softDeleted: true });
}
