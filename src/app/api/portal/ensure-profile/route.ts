import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal";

export async function POST() {
  const session = await getPortalSession();

  if (!session) {
    return NextResponse.json({ error: "Perfil não encontrado para o usuário autenticado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, role: session.profile.role });
}
