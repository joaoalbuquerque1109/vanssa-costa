import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type CustomerRow = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  data_nasc: string | null;
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ customers: [] });
  }

  const digits = q.replace(/\D/g, "");

  let query = supabase
    .from("clientes")
    .select("id,nome,cpf,telefone,email,data_nasc")
    .order("nome", { ascending: true })
    .limit(10);

  if (digits.length >= 2) {
    query = query.or(`cpf.ilike.%${digits}%,telefone.ilike.%${digits}%,nome.ilike.%${q}%`);
  } else {
    query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const res = await query;
  if (res.error) {
    return NextResponse.json({ error: "Falha ao buscar clientes." }, { status: 500 });
  }

  return NextResponse.json({ customers: (res.data ?? []) as CustomerRow[] });
}
