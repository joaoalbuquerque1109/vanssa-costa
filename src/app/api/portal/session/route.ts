import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal";

export async function GET() {
  const session = await getPortalSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    role: session.profile.role,
    email: session.email,
  });
}
