import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type ProfilePayload = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  endereco?: string;
  senha?: string;
};

export async function GET() {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador") || !session.profile.usuario_id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data, error } = await supabase
    .from("usuarios")
    .select("id,nome,email,cpf,telefone,endereco,nivel")
    .eq("id", session.profile.usuario_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Falha ao carregar perfil." }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador") || !session.profile.usuario_id) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as ProfilePayload;
  const cpfDigits = (body.cpf ?? "").replace(/\D/g, "");

  if (!body.nome || !body.email || cpfDigits.length !== 11) {
    return NextResponse.json({ error: "Nome, e-mail e CPF válido são obrigatórios." }, { status: 400 });
  }

  const updateLegacy = await supabase
    .from("usuarios")
    .update({
      nome: body.nome,
      email: body.email,
      cpf: cpfDigits,
      telefone: body.telefone ?? "",
      endereco: body.endereco ?? "",
      ...(body.senha ? { senha: body.senha } : {}),
    })
    .eq("id", session.profile.usuario_id);

  if (updateLegacy.error) {
    return NextResponse.json({ error: "Falha ao atualizar dados no cadastro legado." }, { status: 500 });
  }

  if (body.email !== session.email || body.senha) {
    const authUpdate = await supabase.auth.updateUser({
      ...(body.email !== session.email ? { email: body.email } : {}),
      ...(body.senha ? { password: body.senha } : {}),
    });

    if (authUpdate.error) {
      return NextResponse.json({ error: `Dados salvos, mas falha ao atualizar autenticação: ${authUpdate.error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
