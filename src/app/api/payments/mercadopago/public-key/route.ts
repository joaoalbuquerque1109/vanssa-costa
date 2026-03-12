import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const envPublicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "";
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ public_key: envPublicKey });
    }

    const configRes = await supabase
      .from("config")
      .select("public_key_mp")
      .eq("id", 1)
      .maybeSingle<{ public_key_mp: string | null }>();

    const dbPublicKey = String(configRes.data?.public_key_mp ?? "").trim();
    return NextResponse.json({ public_key: dbPublicKey || envPublicKey });
  } catch {
    return NextResponse.json({ public_key: process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "" });
  }
}
