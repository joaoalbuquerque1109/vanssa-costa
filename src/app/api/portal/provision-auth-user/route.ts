import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ProvisionPayload = {
  email: string;
  password: string;
};

function mapRole(nivel: string | null | undefined) {
  if (!nivel) return "funcionario" as const;
  return nivel.toLowerCase() === "administrador" ? ("administrador" as const) : ("funcionario" as const);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  if (!supabase || !adminClient) {
    return NextResponse.json({ error: "Configuração do Supabase incompleta." }, { status: 500 });
  }

  const body = (await request.json()) as ProvisionPayload;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  const legacyUser = await supabase
    .from("usuarios")
    .select("id,email,nome,nivel,senha")
    .eq("email", email)
    .limit(1)
    .maybeSingle<{ id: number; email: string; nome: string; nivel: string | null; senha: string | null }>();

  if (!legacyUser.data?.id) {
    return NextResponse.json({ error: "Usuário não encontrado para provisionamento." }, { status: 404 });
  }

  // Compatibilidade com base legada: senha em texto plano no campo `senha`.
  if ((legacyUser.data.senha ?? "") !== password) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const list = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuth = list.data.users.find((user) => user.email?.toLowerCase() === email);

  let authUserId = existingAuth?.id ?? null;

  if (!authUserId) {
    const created = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: legacyUser.data.nome,
        role: mapRole(legacyUser.data.nivel),
      },
    });

    if (created.error || !created.data.user) {
      return NextResponse.json({ error: created.error?.message ?? "Falha ao criar usuário de autenticação." }, { status: 500 });
    }

    authUserId = created.data.user.id;
  }

  const role = mapRole(legacyUser.data.nivel);

  const profile = await supabase.from("user_profiles").upsert(
    {
      auth_user_id: authUserId,
      role,
      usuario_id: legacyUser.data.id,
      cliente_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" },
  );

  if (profile.error) {
    return NextResponse.json({ error: "Falha ao vincular perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role });
}
