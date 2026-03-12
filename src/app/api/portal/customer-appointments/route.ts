import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Portal de cliente desativado neste fluxo." }, { status: 410 });
}
