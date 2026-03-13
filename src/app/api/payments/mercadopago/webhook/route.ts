import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getMercadoPagoConfig, mapMercadoPagoStatus, MERCADO_PAGO_API_URL } from "@/lib/mercadopago";
import { createHmac, timingSafeEqual } from "crypto";

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

function formatDateBr(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrencyBr(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function parseSignatureHeader(signatureHeader: string | null) {
  const raw = String(signatureHeader ?? "").trim();
  if (!raw) return { ts: null as string | null, v1: null as string | null };

  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of raw.split(",")) {
    const [key, value] = part.split("=", 2).map((chunk) => chunk?.trim());
    if (!key || !value) continue;
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }

  return { ts, v1 };
}

function buildSignatureManifest({
  dataId,
  requestId,
  ts,
}: {
  dataId?: string | null;
  requestId?: string | null;
  ts?: string | null;
}) {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId};`);
  if (requestId) parts.push(`request-id:${requestId};`);
  if (ts) parts.push(`ts:${ts};`);
  return parts.join("");
}

function isValidWebhookSignature({
  secret,
  signatureHeader,
  requestId,
  dataId,
}: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return false;

  const manifest = buildSignatureManifest({ dataId, requestId, ts });
  if (!manifest) return false;

  const digest = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(v1));
  } catch {
    return false;
  }
}

async function sendWhatsappMessage(phone: string | null, message: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return false;

  const baseUrl = process.env.WHATSAPP_API_URL;
  if (!baseUrl) return false;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const configRes = await supabase
    .from("config")
    .select("token,instancia")
    .limit(1)
    .maybeSingle<{ token: string | null; instancia: string | null }>();

  const token = configRes.data?.token ?? null;
  const instancia = configRes.data?.instancia ?? null;

  if (!token || !instancia) return false;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/message/sendText/${instancia}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: token,
      },
      body: JSON.stringify({
        number: digits,
        text: message,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "mercadopago" });
}

export async function POST(request: NextRequest) {
  const config = getMercadoPagoConfig();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  let payload: Record<string, unknown> = {};

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const type =
    (payload.type as string | undefined) ??
    request.nextUrl.searchParams.get("type") ??
    request.nextUrl.searchParams.get("topic") ??
    "unknown";
  const paymentIdFromPayload =
    (payload["data.id"] as string | undefined) ??
    ((payload.data as { id?: string | number } | undefined)?.id?.toString()) ??
    (payload.id as string | number | undefined)?.toString();
  const paymentIdFromQuery = request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("id");
  const paymentId = paymentIdFromPayload ?? paymentIdFromQuery ?? null;
  const liveMode = payload.live_mode;
  const isTestEvent = liveMode === false || String(liveMode ?? "").toLowerCase() === "false";
  const requestId = request.headers.get("x-request-id");
  const signatureHeader = request.headers.get("x-signature");

  const webhookSecret = String(process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "").trim();
  if (webhookSecret) {
    const validSignature = isValidWebhookSignature({
      secret: webhookSecret,
      signatureHeader,
      requestId,
      dataId: paymentIdFromQuery ?? paymentId,
    });

    if (!validSignature) {
      return NextResponse.json({ error: "Assinatura do webhook invalida." }, { status: 401 });
    }
  }

  const externalEventId = paymentId ?? request.headers.get("x-request-id") ?? `event_${crypto.randomUUID()}`;

  const existingEvent = await supabase
    .from("payment_webhook_events")
    .select("id, processing_status, retry_count")
    .eq("provider", "mercadopago")
    .eq("external_event_id", externalEventId)
    .maybeSingle<{ id: string; processing_status: string; retry_count: number }>();

  if (existingEvent.data?.processing_status === "processed") {
    return NextResponse.json({ ok: true, duplicated: true });
  }

  let eventId = existingEvent.data?.id ?? null;
  let retryCount = existingEvent.data?.retry_count ?? 0;

  if (existingEvent.data) {
    retryCount += 1;
    await supabase
      .from("payment_webhook_events")
      .update({
        payload,
        event_type: type,
        processing_status: "processing",
        retry_count: retryCount,
      })
      .eq("id", existingEvent.data.id);
  } else {
    const insertedEvent = await supabase
      .from("payment_webhook_events")
      .insert({
        provider: "mercadopago",
        external_event_id: externalEventId,
        event_type: type,
        payload,
        processing_status: "processing",
        retry_count: 0,
      })
      .select("id")
      .single<{ id: string }>();

    eventId = insertedEvent.data?.id ?? null;
  }

  try {
    if (isTestEvent) {
      if (eventId) {
        await supabase
          .from("payment_webhook_events")
          .update({
            processing_status: "processed",
            processed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", eventId);
      }

      return NextResponse.json({ ok: true, ignored: "test_event" });
    }

    if (!paymentId || (type !== "payment" && type !== "topic_payment")) {
      if (eventId) {
        await supabase
          .from("payment_webhook_events")
          .update({ processing_status: "processed", processed_at: new Date().toISOString() })
          .eq("id", eventId);
      }

      return NextResponse.json({ ok: true, ignored: true });
    }

    const accessToken = String(config.accessToken ?? "").trim();
    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado.");
    }

    const paymentResponse = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const paymentData = (await paymentResponse.json()) as {
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

    if (!paymentResponse.ok || !paymentData?.id) {
      throw new Error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago.`);
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

    if (!orderResult.data?.id) {
      throw new Error("Pedido nao encontrado para o pagamento recebido.");
    }

    const mappedStatus = mapMercadoPagoStatus(paymentData.status);
    const paidAt = paymentData.date_approved ?? null;
    const paymentMethodLabel = mapPaymentMethodLabel(paymentData.payment_type_id, paymentData.payment_method_id);
    let resolvedBookingId = orderResult.data.booking_id ?? null;

    const pendingBookingId = String(orderResult.data.metadata?.pending_booking_id ?? "").trim();
    if (mappedStatus === "paid" && !resolvedBookingId && pendingBookingId) {
      const pendingRes = await supabase
        .from("agendamentos_pendentes")
        .select("id,funcionario,cliente,data,hora,obs,servico,valor,phone,status,expires_at")
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
          status: string;
          expires_at: string;
        }>();

      if (pendingRes.error || !pendingRes.data?.id) {
        throw new Error("Pre-agendamento nao encontrado para confirmacao apos pagamento.");
      }

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

    const paymentUpsert = await supabase
      .from("payments")
      .upsert(
        {
          order_id: orderResult.data.id,
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
      .eq("id", orderResult.data.id);

    if (orderUpdate.error) {
      throw new Error("Falha ao atualizar pedido.");
    }

    let bookingInfo:
      | {
          id: number;
          data: string;
          clientes: { nome: string; cpf: string; telefone: string | null } | { nome: string; cpf: string; telefone: string | null }[] | null;
          servicos: { nome: string } | { nome: string }[] | null;
        }
      | null = null;

    if (resolvedBookingId) {
      const bookingRes = await supabase
        .from("agendamentos")
        .select("id,data,clientes(nome,cpf,telefone),servicos(nome)")
        .eq("id", resolvedBookingId)
        .maybeSingle<{
          id: number;
          data: string;
          clientes: { nome: string; cpf: string; telefone: string | null } | { nome: string; cpf: string; telefone: string | null }[] | null;
          servicos: { nome: string } | { nome: string }[] | null;
        }>();

      bookingInfo = bookingRes.data ?? null;
    }

    const clienteFromBooking = Array.isArray(bookingInfo?.clientes) ? bookingInfo?.clientes[0] : bookingInfo?.clientes;
    const servico = Array.isArray(bookingInfo?.servicos) ? bookingInfo?.servicos[0] : bookingInfo?.servicos;

    let cliente = clienteFromBooking;
    if (!cliente && orderResult.data.cliente_id) {
      const customerRes = await supabase
        .from("clientes")
        .select("nome,cpf,telefone")
        .eq("id", orderResult.data.cliente_id)
        .maybeSingle<{ nome: string; cpf: string; telefone: string | null }>();

      cliente = customerRes.data ?? null;
    }

    const metadataTitle = String(orderResult.data.metadata?.checkout_title ?? orderResult.data.description ?? "").trim();
    const resolvedServiceName = servico?.nome ?? (metadataTitle || "Servico");

    const existingFinanceiro = await supabase
      .from("pagamentos_financeiro")
      .select("payload")
      .eq("order_id", orderResult.data.id)
      .maybeSingle<{ payload: Record<string, unknown> | null }>();

    const mergedPayload = {
      ...(existingFinanceiro.data?.payload ?? {}),
      ...paymentData,
      order_id: orderResult.data.id,
      plan_id: orderResult.data.metadata?.plan_id ?? null,
      booking_id: resolvedBookingId,
      pending_booking_id: orderResult.data.metadata?.pending_booking_id ?? null,
    };

    const financeiroUpsert = await supabase.from("pagamentos_financeiro").upsert(
      {
        booking_id: resolvedBookingId,
        order_id: orderResult.data.id,
        payment_id: paymentUpsert.data.id,
        cliente_nome: cliente?.nome ?? "Cliente",
        cliente_cpf: String(cliente?.cpf ?? ""),
        data_reserva: bookingInfo?.data ?? new Date().toISOString().slice(0, 10),
        servico_nome: resolvedServiceName,
        valor: Number(paymentData.transaction_amount ?? 0),
        tipo_pagamento: paymentMethodLabel,
        status_pagamento: mappedStatus,
        sucesso: mappedStatus === "paid",
        whatsapp: cliente?.telefone ?? null,
        payload: mergedPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );

    if (financeiroUpsert.error) {
      console.error("[mp/webhook] falha ao salvar financeiro", financeiroUpsert.error);
    }

    let whatsappSent = false;

    if (mappedStatus === "paid" && bookingInfo?.id && cliente) {
      const paidValue = Number(paymentData.transaction_amount ?? 0);
      const message =
        `Ola ${cliente.nome}, seu pagamento foi confirmado!\n` +
        `CPF: ${cliente.cpf}\n` +
        `Data marcada: ${formatDateBr(bookingInfo.data)}\n` +
        `Valor pago: ${formatCurrencyBr(paidValue)}\n` +
        `Meio de pagamento: ${paymentMethodLabel}`;

      whatsappSent = await sendWhatsappMessage(cliente.telefone, message);

      const bookingUpdate = await supabase
        .from("agendamentos")
        .update({
          status: "Pago",
        })
        .eq("id", bookingInfo.id);

      if (bookingUpdate.error) {
        console.error("[mp/webhook] falha ao atualizar status do agendamento", {
          bookingId: bookingInfo.id,
          error: bookingUpdate.error,
        });
      }
    }

    if (orderResult.data.id) {
      await supabase
        .from("pagamentos_financeiro")
        .update({
          whatsapp_enviado: whatsappSent,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderResult.data.id);
    }

    if (eventId) {
      await supabase
        .from("payment_webhook_events")
        .update({
          processing_status: "processed",
          order_id: orderResult.data.id,
          payment_id: paymentUpsert.data.id,
          booking_id: resolvedBookingId,
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", eventId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (eventId) {
      await supabase
        .from("payment_webhook_events")
        .update({
          processing_status: "failed",
          error_message: error instanceof Error ? error.message : "Erro desconhecido no webhook.",
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 500 });
  }
}
