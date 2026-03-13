import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function parseUuid(value: string | null) {
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const orderId = parseUuid(request.nextUrl.searchParams.get("orderId") ?? request.nextUrl.searchParams.get("order_id"));
  const externalReference = String(
    request.nextUrl.searchParams.get("externalReference") ?? request.nextUrl.searchParams.get("external_reference") ?? "",
  ).trim();

  if (!orderId && !externalReference) {
    return NextResponse.json({ error: "Informe orderId ou externalReference." }, { status: 400 });
  }

  const orderQuery = orderId
    ? supabase
        .from("orders")
        .select("id,status,mp_payment_id,paid_at")
        .eq("id", orderId)
        .maybeSingle<{ id: string; status: string; mp_payment_id: number | null; paid_at: string | null }>()
    : supabase
        .from("orders")
        .select("id,status,mp_payment_id,paid_at")
        .eq("external_reference", externalReference)
        .maybeSingle<{ id: string; status: string; mp_payment_id: number | null; paid_at: string | null }>();

  const orderResult = await orderQuery;
  if (!orderResult.data?.id) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  const paymentRes = await supabase
    .from("payments")
    .select("status,external_payment_id,paid_at")
    .eq("order_id", orderResult.data.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string; external_payment_id: string | null; paid_at: string | null }>();

  const orderStatus = String(orderResult.data.status ?? "").toLowerCase();
  const paymentStatus = String(paymentRes.data?.status ?? "").toLowerCase();
  const confirmed = orderStatus === "paid" || paymentStatus === "paid";

  return NextResponse.json({
    ok: true,
    order_id: orderResult.data.id,
    order_status: orderResult.data.status,
    payment_status: paymentRes.data?.status ?? null,
    payment_id: paymentRes.data?.external_payment_id ?? orderResult.data.mp_payment_id?.toString() ?? null,
    paid_at: paymentRes.data?.paid_at ?? orderResult.data.paid_at ?? null,
    confirmed,
  });
}
