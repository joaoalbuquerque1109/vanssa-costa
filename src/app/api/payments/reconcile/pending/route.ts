import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function resolveAppUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercelUrl = String(process.env.VERCEL_URL ?? "").trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  return null;
}

function isAuthorizedCron(request: NextRequest) {
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  if (!cronSecret) return true;

  const authHeader = String(request.headers.get("authorization") ?? "");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const appUrl = resolveAppUrl();
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL ou VERCEL_URL nao configurado." }, { status: 500 });
  }

  const ordersRes = await supabase
    .from("orders")
    .select("id,external_reference,status,created_at")
    .in("status", ["pending", "processing", "authorized"])
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<{ id: string; external_reference: string; status: string; created_at: string }[]>();

  if (ordersRes.error) {
    return NextResponse.json({ error: "Falha ao listar pedidos pendentes." }, { status: 500 });
  }

  const orders = ordersRes.data ?? [];
  let processed = 0;
  let confirmed = 0;
  let pending = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const reconcileRes = await fetch(`${appUrl}/api/payments/reconcile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          orderId: order.id,
          externalReference: order.external_reference,
        }),
      });

      const payload = (await reconcileRes.json()) as { confirmed?: boolean; payment_status?: string };
      processed += 1;
      if (payload.confirmed || payload.payment_status === "paid") {
        confirmed += 1;
      } else if (reconcileRes.ok) {
        pending += 1;
      } else {
        failed += 1;
      }
    } catch {
      processed += 1;
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    total_candidates: orders.length,
    processed,
    confirmed,
    pending,
    failed,
  });
}
