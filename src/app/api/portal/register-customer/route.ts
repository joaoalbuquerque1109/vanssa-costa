import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RegisterPayload = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const authUser = userData.user;

  if (!authUser) {
    return NextResponse.json({ error: "Sessão inválida para registrar cliente." }, { status: 401 });
  }

  const body = (await request.json()) as RegisterPayload;

  if (!body.nome || !body.email || !body.cpf || !body.telefone) {
    return NextResponse.json({ error: "Nome, e-mail, CPF e telefone são obrigatórios." }, { status: 400 });
  }

  const cpfDigits = body.cpf.replace(/\D/g, "");

  const customerInsert = await supabase
    .from("clientes")
    .insert({
      auth_user_id: authUser.id,
      nome: body.nome,
      email: body.email,
      cpf: cpfDigits,
      telefone: body.telefone,
    })
    .select("id")
    .single<{ id: number }>();

  if (customerInsert.error || !customerInsert.data?.id) {
    return NextResponse.json({ error: "Falha ao criar cliente (verifique se CPF já existe)." }, { status: 500 });
  }

  const profileUpsert = await supabase.from("user_profiles").upsert(
    {
      auth_user_id: authUser.id,
      role: "cliente",
      cliente_id: customerInsert.data.id,
      usuario_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" },
  );

  if (profileUpsert.error) {
    return NextResponse.json({ error: "Falha ao vincular perfil." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, customer_id: customerInsert.data.id });
}

