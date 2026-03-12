import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type SettingsPayload = {
  public_key_mp?: string;
  access_token_mp?: string;
};

export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session || session.profile.role !== "administrador") {
      return NextResponse.json({ error: "Apenas administradores podem acessar as configuracoes." }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
    }

    const res = await supabase
      .from("config")
      .select("id,public_key_mp,access_token_mp")
      .eq("id", 1)
      .maybeSingle<{ id: number; public_key_mp: string | null; access_token_mp: string | null }>();

    if (res.error) {
      return NextResponse.json({ error: `Falha ao carregar configuracoes de pagamento: ${res.error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      settings: {
        public_key_mp: res.data?.public_key_mp ?? "",
        access_token_mp: res.data?.access_token_mp ?? "",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro inesperado ao carregar configuracoes de pagamento." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getPortalSession();
    if (!session || session.profile.role !== "administrador") {
      return NextResponse.json({ error: "Apenas administradores podem alterar as configuracoes." }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
    }

    const body = (await request.json()) as SettingsPayload;
    const publicKey = String(body.public_key_mp ?? "").trim();
    const accessToken = String(body.access_token_mp ?? "").trim();
    const currentConfig = await supabase
      .from("config")
      .select("id,nome")
      .eq("id", 1)
      .maybeSingle<{ id: number; nome: string | null }>();

    const configName = String(currentConfig.data?.nome ?? "").trim() || "Vanessa Costa";

    const upsert = await supabase.from("config").upsert(
      {
        id: 1,
        nome: configName,
        public_key_mp: publicKey,
        access_token_mp: accessToken,
        api_pagamento: "mercadopago",
      },
      { onConflict: "id" },
    );

    if (upsert.error) {
      return NextResponse.json({ error: `Falha ao salvar chaves do Mercado Pago: ${upsert.error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro inesperado ao salvar chaves do Mercado Pago." }, { status: 500 });
  }
}
