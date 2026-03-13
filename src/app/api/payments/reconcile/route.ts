import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getMercadoPagoConfig, mapMercadoPagoStatus, MERCADO_PAGO_API_URL } from "@/lib/mercadopago";

type ReconcilePayload = {
  paymentId?: string | number;
  externalReference?: string;
  orderId?: string;
  preferenceId?: string;
};

type MercadoPagoPayment = {
  id: number;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string;
  external_reference?: string;
  payment_type_id?: string;
  payment_method_id?: string;
  metadata?: { order_id?: string };
};

function parseUuid(value: string | undefined | null) {
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

function mapPaymentMethodLabel(paymentTypeId?: string | null, paymentMethodId?: string | null) {
  const type = String(paymentTypeId ?? "").toLowerCase();
  const method = String(paymentMethodId ?? "").toLowerCase();

  if (type === "credit_card") return "Cartao de credito";
  if (type === "debit_card") return "Cartao de debito";
  if (type === "bank_transfer") return "Pix";
  if (type === "ticket") return "Boleto";

  if (method.includes("pix")) return "Pix";
  if (method.includes("deb")) return "Cartao de debito";
  if (method.includes("credit") || method.includes("visa") || method.includes("master")) return "Cartao de credito";
  if (method.includes("bol") || method.includes("ticket")) return "Boleto";

  return "Nao identificado";
}

async function getAccessToken(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  fallbackToken?: string | null,
) {
  const configRes = await supabase
    .from("config")
    .select("access_token_mp")
    .eq("id", 1)
    .maybeSingle<{ access_token_mp: string | null }>();

  return String(configRes.data?.access_token_mp ?? "").trim() || String(fallbackToken ?? "").trim();
}

async function fetchPaymentById(accessToken: string, paymentId: string) {
  const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) return null;

  const paymentData = (await response.json()) as MercadoPagoPayment;
  if (!response.ok || !paymentData?.id) {
    throw new Error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago.`);
  }

  return paymentData;
}

async function fetchLatestPaymentByExternalReference(accessToken: string, externalReference: string) {
  const url = new URL(`${MERCADO_PAGO_API_URL}/v1/payments/search`);
  url.searchParams.set("external_reference", externalReference);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Falha ao buscar pagamento por external_reference no Mercado Pago.");
  }

  const result = (await response.json()) as { results?: MercadoPagoPayment[] };
  return result.results?.[0] ?? null;
}

function readInput(request: NextRequest, body: ReconcilePayload) {
  const paymentId = String(
    body.paymentId ?? request.nextUrl.searchParams.get("paymentId") ?? request.nextUrl.searchParams.get("payment_id") ?? "",
  ).trim();
  const externalReference = String(
    body.externalReference ??
      request.nextUrl.searchParams.get("externalReference") ??
      request.nextUrl.searchParams.get("external_reference") ??
      "",
  ).trim();
  const orderId = String(body.orderId ?? request.nextUrl.searchParams.get("orderId") ?? request.nextUrl.searchParams.get("order_id") ?? "").trim();
  const preferenceId = String(
    body.preferenceId ?? request.nextUrl.searchParams.get("preferenceId") ?? request.nextUrl.searchParams.get("preference_id") ?? "",
  ).trim();

  return {
    paymentId: paymentId || null,
    externalReference: externalReference || null,
    orderId: parseUuid(orderId),
    preferenceId: preferenceId || null,
  };
}

async function resolvePayment(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  accessToken: string,
  input: { paymentId: string | null; externalReference: string | null; orderId: string | null; preferenceId: string | null },
) {
  if (input.paymentId) {
    return fetchPaymentById(accessToken, input.paymentId);
  }

  if (input.externalReference) {
    return fetchLatestPaymentByExternalReference(accessToken, input.externalReference);
  }

  if (input.orderId) {
    const orderRes = await supabase
      .from("orders")
      .select("external_reference,mp_payment_id")
      .eq("id", input.orderId)
      .maybeSingle<{ external_reference: string; mp_payment_id: number | null }>();

    if (orderRes.data?.mp_payment_id) {
      return fetchPaymentById(accessToken, String(orderRes.data.mp_payment_id));
    }
    if (orderRes.data?.external_reference) {
      return fetchLatestPaymentByExternalReference(accessToken, orderRes.data.external_reference);
    }
  }

  if (input.preferenceId) {
    const orderRes = await supabase
      .from("orders")
      .select("external_reference,mp_payment_id")
      .eq("mp_preference_id", input.preferenceId)
      .maybeSingle<{ external_reference: string; mp_payment_id: number | null }>();

    if (orderRes.data?.mp_payment_id) {
      return fetchPaymentById(accessToken, String(orderRes.data.mp_payment_id));
    }
    if (orderRes.data?.external_reference) {
      return fetchLatestPaymentByExternalReference(accessToken, orderRes.data.external_reference);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  let body: ReconcilePayload = {};
  try {
    body = (await request.json()) as ReconcilePayload;
  } catch {
    body = {};
  }

  const input = readInput(request, body);
  if (!input.paymentId && !input.externalReference && !input.orderId && !input.preferenceId) {
    return NextResponse.json({ error: "Informe paymentId, externalReference, orderId ou preferenceId." }, { status: 400 });
  }

  const config = getMercadoPagoConfig();
  const accessToken = await getAccessToken(supabase, config.accessToken);
  if (!accessToken) {
    return NextResponse.json({ error: "MERCADO_PAGO_ACCESS_TOKEN nao configurado." }, { status: 500 });
  }

  try {
    const paymentData = await resolvePayment(supabase, accessToken, input);

    if (!paymentData?.id) {
      return NextResponse.json({
        ok: true,
        reconciled: false,
        payment_status: "pending",
        booking_status: "pending_payment",
        message: "Pagamento ainda nao identificado no Mercado Pago.",
      });
    }

    const orderIdFromMetadata = parseUuid(paymentData.metadata?.order_id ?? null);
    const orderQuery = orderIdFromMetadata
      ? supabase
          .from("orders")
          .select("id,booking_id,cliente_id,description,metadata")
          .eq("id", orderIdFromMetadata)
          .maybeSingle<{
            id: string;
            booking_id: number | null;
            cliente_id: number | null;
            description: string | null;
            metadata: Record<string, unknown> | null;
          }>()
      : supabase
          .from("orders")
          .select("id,booking_id,cliente_id,description,metadata")
          .eq("external_reference", paymentData.external_reference ?? "")
          .maybeSingle<{
            id: string;
            booking_id: number | null;
            cliente_id: number | null;
            description: string | null;
            metadata: Record<string, unknown> | null;
          }>();

    const orderResult = await orderQuery;
    let resolvedOrder = orderResult.data ?? null;

    if (!resolvedOrder?.id && input.orderId) {
      const fallbackOrder = await supabase
        .from("orders")
        .select("id,booking_id,cliente_id,description,metadata")
        .eq("id", input.orderId)
        .maybeSingle<{
          id: string;
          booking_id: number | null;
          cliente_id: number | null;
          description: string | null;
          metadata: Record<string, unknown> | null;
        }>();
      if (fallbackOrder.data?.id) resolvedOrder = fallbackOrder.data;
    }

    if (!resolvedOrder?.id) {
      return NextResponse.json({ error: "Pedido nao encontrado para o pagamento." }, { status: 404 });
    }

    const mappedStatus = mapMercadoPagoStatus(paymentData.status);
    const paidAt = paymentData.date_approved ?? null;
    const paymentMethodLabel = mapPaymentMethodLabel(paymentData.payment_type_id, paymentData.payment_method_id);
    let resolvedBookingId = resolvedOrder.booking_id ?? null;

    const pendingBookingId = String(resolvedOrder.metadata?.pending_booking_id ?? "").trim();
    if (mappedStatus === "paid" && !resolvedBookingId && pendingBookingId) {
      const pendingRes = await supabase
        .from("agendamentos_pendentes")
        .select("id,funcionario,cliente,data,hora,obs,servico,valor,phone")
        .eq("id", pendingBookingId)
        .maybeSingle<{
          id: string;
          funcionario: number;
          cliente: number;
          data: string;
          hora: string;
          obs: string | null;
          servico: number;
          valor: number;
          phone: string | null;
        }>();

      if (pendingRes.data?.id) {
        const slotAlreadyTaken = await supabase
          .from("agendamentos")
          .select("id")
          .eq("funcionario", pendingRes.data.funcionario)
          .eq("data", pendingRes.data.data)
          .eq("hora", pendingRes.data.hora)
          .maybeSingle<{ id: number }>();

        if (slotAlreadyTaken.data?.id) {
          resolvedBookingId = slotAlreadyTaken.data.id;
        } else {
          const bookingInsert = await supabase
            .from("agendamentos")
            .insert({
              funcionario: pendingRes.data.funcionario,
              cliente: pendingRes.data.cliente,
              data: pendingRes.data.data,
              hora: pendingRes.data.hora,
              obs: pendingRes.data.obs,
              status: "Pago",
              servico: pendingRes.data.servico,
              valor_pago: Number(pendingRes.data.valor ?? 0),
              data_lanc: new Date().toISOString().slice(0, 10),
              phone: pendingRes.data.phone,
            })
            .select("id")
            .single<{ id: number }>();

          if (bookingInsert.error || !bookingInsert.data?.id) {
            throw new Error("Falha ao salvar agendamento apos pagamento aprovado.");
          }

          resolvedBookingId = bookingInsert.data.id;
        }

        await supabase.from("agendamentos_pendentes").delete().eq("id", pendingBookingId);
      }
    }

    const paymentUpsert = await supabase
      .from("payments")
      .upsert(
        {
          order_id: resolvedOrder.id,
          booking_id: resolvedBookingId,
          provider: "mercadopago",
          status: mappedStatus,
          amount: Number(paymentData.transaction_amount ?? 0),
          currency: paymentData.currency_id ?? "BRL",
          external_payment_id: String(paymentData.id),
          raw_payload: paymentData,
          paid_at: paidAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider,external_payment_id" },
      )
      .select("id")
      .single<{ id: string }>();

    if (paymentUpsert.error || !paymentUpsert.data?.id) {
      throw new Error("Falha ao persistir pagamento.");
    }

    const orderStatus = mappedStatus === "paid" ? "paid" : mappedStatus;
    const orderUpdate = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        mp_payment_id: paymentData.id,
        booking_id: resolvedBookingId,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedOrder.id);

    if (orderUpdate.error) {
      throw new Error("Falha ao atualizar pedido.");
    }

    if (resolvedBookingId && mappedStatus === "paid") {
      await supabase
        .from("agendamentos")
        .update({
          status: "Pago",
        })
        .eq("id", resolvedBookingId);
    }

    await supabase
      .from("pagamentos_financeiro")
      .update({
        booking_id: resolvedBookingId,
        payment_id: paymentUpsert.data.id,
        tipo_pagamento: paymentMethodLabel,
        status_pagamento: mappedStatus,
        sucesso: mappedStatus === "paid",
        payload: paymentData,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", resolvedOrder.id);

    console.info("[mp/reconcile] reconciled", {
      orderId: resolvedOrder.id,
      paymentId: paymentData.id,
      status: mappedStatus,
      bookingId: resolvedBookingId,
    });

    return NextResponse.json({
      ok: true,
      reconciled: true,
      order_id: resolvedOrder.id,
      payment_id: String(paymentData.id),
      payment_status: mappedStatus,
      booking_id: resolvedBookingId,
      booking_status: mappedStatus === "paid" ? "confirmed" : "pending_payment",
      confirmed: mappedStatus === "paid",
    });
  } catch (error) {
    console.error("[mp/reconcile] error", {
      message: error instanceof Error ? error.message : "Erro desconhecido.",
      hasPaymentId: Boolean(input.paymentId),
      hasExternalReference: Boolean(input.externalReference),
      orderId: input.orderId,
      preferenceId: input.preferenceId,
    });

    return NextResponse.json(
      {
        error: "Nao foi possivel reconciliar o pagamento agora.",
        payment_status: "pending",
        booking_status: "pending_payment",
      },
      { status: 500 },
    );
  }
}
