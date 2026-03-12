import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type DayScheduleInput = {
  dia: string;
  inicio: string;
  final: string;
  inicio_almoco?: string | null;
  final_almoco?: string | null;
};

type CreateEmployeeInput = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  days: DayScheduleInput[];
  serviceIds: number[];
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function resolveConflictMessage(error: SupabaseLikeError | null | undefined): string | null {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();

  const maybeConflict = code === "23505" || code === "P0001" || message.includes("duplicate") || message.includes("ja cadastrado");
  if (!maybeConflict) return null;

  if (message.includes("cpf") && message.includes("email")) {
    return "CPF ou e-mail já cadastrado.";
  }
  if (message.includes("cpf")) {
    return "CPF já cadastrado.";
  }
  if (message.includes("email")) {
    return "E-mail já cadastrado.";
  }
  return "Dados já cadastrados.";
}

export async function GET() {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem listar funcionários." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const [employeesRes, linksRes] = await Promise.all([
    supabase.from("usuarios").select("id,nome,email,cpf,telefone,nivel,ativo").order("nome"),
    supabase.from("servicos_func").select("funcionario,servico"),
  ]);

  if (employeesRes.error || linksRes.error) {
    return NextResponse.json({ error: "Falha ao listar funcionários." }, { status: 500 });
  }

  return NextResponse.json({ employees: employeesRes.data ?? [], links: linksRes.data ?? [] });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session || session.profile.role !== "administrador") {
    return NextResponse.json({ error: "Apenas administradores podem criar funcionários." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  if (!supabase || !adminClient) {
    return NextResponse.json({ error: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  const body = (await request.json()) as CreateEmployeeInput;
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpfDigits = String(body.cpf ?? "").replace(/\D/g, "");
  const telefone = String(body.telefone ?? "").trim();

  if (!nome || !email || cpfDigits.length !== 11) {
    return NextResponse.json({ error: "Nome, e-mail e CPF válido são obrigatórios." }, { status: 400 });
  }

  if (!Array.isArray(body.days) || body.days.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um dia/horário de trabalho." }, { status: 400 });
  }

  const [existingUserByEmail, existingUserByCpf, existingCustomerByEmail, existingCustomerByCpf] = await Promise.all([
    supabase.from("usuarios").select("id").ilike("email", email).limit(1).maybeSingle<{ id: number }>(),
    supabase.from("usuarios").select("id,cpf").limit(500),
    supabase.from("clientes").select("id").ilike("email", email).limit(1).maybeSingle<{ id: number }>(),
    supabase.from("clientes").select("id,cpf").limit(500),
  ]);

  if (existingUserByEmail.data?.id || existingCustomerByEmail.data?.id) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const cpfInUsers = (existingUserByCpf.data ?? []).some((row) => String(row.cpf ?? "").replace(/\D/g, "") === cpfDigits);
  const cpfInCustomers = (existingCustomerByCpf.data ?? []).some((row) => String(row.cpf ?? "").replace(/\D/g, "") === cpfDigits);
  if (cpfInUsers || cpfInCustomers) {
    return NextResponse.json({ error: "CPF já cadastrado." }, { status: 409 });
  }

  let authUserId: string | null = null;
  let legacyUserId: number | null = null;

  const rollbackEmployeeCreation = async () => {
    if (legacyUserId) {
      await supabase.from("servicos_func").delete().eq("funcionario", legacyUserId);
      await supabase.from("dias").delete().eq("funcionario", legacyUserId);
      await supabase.from("user_profiles").delete().eq("usuario_id", legacyUserId);
      await supabase.from("usuarios").delete().eq("id", legacyUserId);
    }
    if (authUserId) {
      await adminClient.auth.admin.deleteUser(authUserId);
    }
  };

  const authCreate = await adminClient.auth.admin.createUser({
    email,
    password: "senha123",
    email_confirm: true,
    user_metadata: {
      role: "funcionario",
      nome,
    },
  });

  if (authCreate.error || !authCreate.data.user) {
    const conflictMessage = resolveConflictMessage(authCreate.error);
    if (conflictMessage) {
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }
    return NextResponse.json({ error: authCreate.error?.message ?? "Falha ao criar usuário de autenticação." }, { status: 500 });
  }

  authUserId = authCreate.data.user.id;

  const { data: latestUser } = await supabase.from("usuarios").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
  const userId = Number(latestUser?.id ?? 0) + 1;

  const userInsert = await supabase
    .from("usuarios")
    .insert({
      id: userId,
      nome,
      email,
      cpf: cpfDigits,
      senha: "senha123",
      nivel: "Barbeiro",
      data: new Date().toISOString().slice(0, 10),
      ativo: "Sim",
      telefone: telefone || "",
      foto: "sem-foto.jpg",
      atendimento: "Sim",
      intervalo: 15,
      visualizar: "Sim",
    })
    .select("id")
    .single<{ id: number }>();

  if (userInsert.error || !userInsert.data?.id) {
    await rollbackEmployeeCreation();
    const conflictMessage = resolveConflictMessage(userInsert.error);
    if (conflictMessage) {
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao salvar funcionário no banco legado." }, { status: 500 });
  }
  legacyUserId = userInsert.data.id;

  const profileInsert = await supabase.from("user_profiles").insert({
    auth_user_id: authUserId!,
    role: "funcionario",
    usuario_id: userInsert.data.id,
    cliente_id: null,
  });

  if (profileInsert.error) {
    await rollbackEmployeeCreation();
    return NextResponse.json({ error: "Falha ao vincular perfil do funcionário." }, { status: 500 });
  }

  const { data: latestDay } = await supabase.from("dias").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
  let nextDayId = Number(latestDay?.id ?? 0) + 1;

  const daysPayload = body.days.map((day) => ({
    id: nextDayId++,
    dia: day.dia,
    funcionario: userInsert.data.id,
    inicio: day.inicio,
    final: day.final,
    inicio_almoco: day.inicio_almoco ?? "00:00:00",
    final_almoco: day.final_almoco ?? "00:00:00",
  }));

  const dayInsert = await supabase.from("dias").insert(daysPayload);
  if (dayInsert.error) {
    await rollbackEmployeeCreation();
    return NextResponse.json({ error: "Falha ao salvar dias/horários do funcionário." }, { status: 500 });
  }

  if (Array.isArray(body.serviceIds) && body.serviceIds.length > 0) {
    const { data: latestLink } = await supabase.from("servicos_func").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
    let nextLinkId = Number(latestLink?.id ?? 0) + 1;

    const linksPayload = body.serviceIds.map((serviceId) => ({
      id: nextLinkId++,
      funcionario: userInsert.data.id,
      servico: Number(serviceId),
    }));

    const linkInsert = await supabase.from("servicos_func").insert(linksPayload);
    if (linkInsert.error) {
      await rollbackEmployeeCreation();
      return NextResponse.json({ error: "Falha ao vincular serviços do funcionário." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, usuario_id: userInsert.data.id, auth_user_id: authUserId, default_password: "senha123" }, { status: 201 });
}

