import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ public_key: process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "" });
}
