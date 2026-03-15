import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type FeedbackInput = {
  nome?: string;
  texto?: string;
  nota?: number;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as FeedbackInput;
  const nome = body.nome?.trim() ?? "";
  const texto = body.texto?.trim() ?? "";
  const nota = Number(body.nota);

  if (!nome || !texto || !Number.isFinite(nota) || nota < 0 || nota > 5) {
    return NextResponse.json({ error: "Dados inválidos para feedback." }, { status: 400 });
  }

  const payload = {
    nome,
    texto,
    nota,
    foto: null,
    ativo: "Não" as const,
  };

  let { data, error } = await supabase.from("comentarios").insert(payload).select("*").single();

  if (error?.code === "23502" && error.message.toLowerCase().includes("id")) {
    const { data: latest } = await supabase
      .from("comentarios")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: number }>();

    const nextId = Number(latest?.id ?? 0) + 1;
    const retry = await supabase
      .from("comentarios")
      .insert({ id: nextId, ...payload })
      .select("*")
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: "Falha ao enviar feedback.", details: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      feedback: data,
      message: "Feedback enviado com sucesso. Ele ficará visível após aprovação do administrador.",
    },
    { status: 201 },
  );
}
