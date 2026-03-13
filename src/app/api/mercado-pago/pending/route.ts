import { NextRequest, NextResponse } from "next/server";

function buildResultadoUrl(request: NextRequest) {
  const url = new URL("/pagamento/resultado", request.url);

  const paramsToForward = [
    "status",
    "payment_id",
    "collection_id",
    "collection_status",
    "external_reference",
    "merchant_order_id",
    "preference_id",
    "order_id",
    "plan_id",
    "booking_id",
  ];

  for (const key of paramsToForward) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }

  if (!url.searchParams.get("status")) {
    url.searchParams.set("status", "pending");
  }

  return url;
}

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("payment_id");
  const externalReference = request.nextUrl.searchParams.get("external_reference");
  const orderId = request.nextUrl.searchParams.get("order_id");
  const preferenceId = request.nextUrl.searchParams.get("preference_id");

  if (!paymentId && !externalReference && !orderId && !preferenceId) {
    return NextResponse.redirect(buildResultadoUrl(request));
  }

  try {
    const reconcileResponse = await fetch(new URL("/api/payments/reconcile", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        paymentId,
        externalReference,
        orderId,
        preferenceId,
      }),
    });

    if (reconcileResponse.ok) {
      const payload = (await reconcileResponse.json()) as {
        confirmed?: boolean;
        payment_status?: string;
      };

      if (payload.confirmed || payload.payment_status === "paid") {
        return NextResponse.redirect(new URL("/?payment=success", request.url));
      }
    }
  } catch {
    // Fallback to the result page when reconciliation is temporarily unavailable.
  }

  return NextResponse.redirect(buildResultadoUrl(request));
}
