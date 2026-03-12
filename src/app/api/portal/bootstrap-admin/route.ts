import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type BootstrapAdminInput = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  password: string;
};

export async function POST(request: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get("x-admin-bootstrap-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  if (!supabase || !adminClient) {
    return NextResponse.json({ error: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  const body = (await request.json()) as BootstrapAdminInput;
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpfDigits = String(body.cpf ?? "").replace(/\D/g, "");
  const telefone = String(body.telefone ?? "").trim();
  const password = String(body.password ?? "");

  if (!nome || !email || cpfDigits.length !== 11 || password.length < 6) {
    return NextResponse.json({ error: "Nome, e-mail, CPF válido e senha (mín. 6) são obrigatórios." }, { status: 400 });
  }

  let authUserId: string | null = null;
  let legacyAdminId: number | null = null;

  const existingUsers = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuth = existingUsers.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  if (existingAuth) {
    authUserId = existingAuth.id;

    const updateAuth = await adminClient.auth.admin.updateUserById(authUserId, {
      email,
      password,
      user_metadata: { role: "administrador", nome },
    });

    if (updateAuth.error) {
      return NextResponse.json({ error: updateAuth.error.message ?? "Falha ao atualizar auth user." }, { status: 500 });
    }
  } else {
    const created = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "administrador", nome },
    });

    if (created.error || !created.data.user) {
      return NextResponse.json({ error: created.error?.message ?? "Falha ao criar auth user." }, { status: 500 });
    }

    authUserId = created.data.user.id;
  }

  const existingLegacyAdmin = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (existingLegacyAdmin.error) {
    return NextResponse.json({ error: "Falha ao consultar administrador no legado." }, { status: 500 });
  }

  if (existingLegacyAdmin.data?.id) {
    legacyAdminId = existingLegacyAdmin.data.id;

    const updateLegacyAdmin = await supabase
      .from("usuarios")
      .update({
        nome,
        cpf: cpfDigits,
        telefone: telefone || "",
        senha: password,
        nivel: "Administrador",
        ativo: "Sim",
      })
      .eq("id", legacyAdminId);

    if (updateLegacyAdmin.error) {
      return NextResponse.json({ error: "Falha ao atualizar administrador no legado." }, { status: 500 });
    }
  } else {
    const { data: latestUser } = await supabase.from("usuarios").select("id").order("id", { ascending: false }).limit(1).maybeSingle<{ id: number }>();
    const nextUserId = Number(latestUser?.id ?? 0) + 1;

    const insertLegacyAdmin = await supabase
      .from("usuarios")
      .insert({
        id: nextUserId,
        nome,
        email,
        cpf: cpfDigits,
        senha: password,
        nivel: "Administrador",
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

    if (insertLegacyAdmin.error || !insertLegacyAdmin.data?.id) {
      return NextResponse.json({ error: "Falha ao inserir administrador no legado." }, { status: 500 });
    }

    legacyAdminId = insertLegacyAdmin.data.id;
  }

  const upsertProfile = await supabase.from("user_profiles").upsert(
    {
      auth_user_id: authUserId,
      role: "administrador",
      usuario_id: legacyAdminId,
      cliente_id: null,
    },
    { onConflict: "auth_user_id" },
  );

  if (upsertProfile.error) {
    return NextResponse.json({ error: "Falha ao vincular perfil de administrador." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, usuario_id: legacyAdminId, auth_user_id: authUserId });
}
