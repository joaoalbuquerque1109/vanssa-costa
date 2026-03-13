import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal";

export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session || session.profile.role !== "administrador") {
      return NextResponse.json({ error: "Apenas administradores podem acessar as configuracoes." }, { status: 403 });
    }

    return NextResponse.json({
      settings: {},
      managed_externally: true,
      message: "As credenciais de pagamento sao gerenciadas por variaveis de ambiente no deploy.",
    });
  } catch {
    return NextResponse.json({ error: "Erro inesperado ao carregar configuracoes de pagamento." }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const session = await getPortalSession();
    if (!session || session.profile.role !== "administrador") {
      return NextResponse.json({ error: "Apenas administradores podem alterar as configuracoes." }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "As credenciais de pagamento sao gerenciadas por variaveis de ambiente no deploy.",
      },
      { status: 405 },
    );
  } catch {
    return NextResponse.json({ error: "Erro inesperado ao salvar configuracoes de pagamento." }, { status: 500 });
  }
}
