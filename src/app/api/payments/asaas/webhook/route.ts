import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAsaasConfig, mapAsaasBillingTypeLabel, mapAsaasStatus } from "@/lib/asaas";

function parseUuid(value: string | undefined | null) {
  if (!value) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
}

function formatDateBr(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrencyBr(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
  return NextResponse.json({ ok: true, provider: "asaas" });
}

export async function POST(request: NextRequest) {
  const config = getAsaasConfig();
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

  const configRes = await supabase
    .from("config")
    .select("public_key_mp")
    .eq("id", 1)
    .maybeSingle<{ public_key_mp: string | null }>();

  const configuredWebhookToken = String(configRes.data?.public_key_mp ?? "").trim() || config.webhookToken;
  const requestToken = String(request.headers.get("asaas-access-token") ?? "").trim();

  if (configuredWebhookToken && requestToken !== configuredWebhookToken) {
    return NextResponse.json({ error: "Token do webhook invalido." }, { status: 401 });
  }

  const event = String(payload.event ?? "").trim();
  const paymentData = (payload.payment ?? {}) as {
    id?: string;
    status?: string;
    value?: number;
    description?: string;
    billingType?: string;
    externalReference?: string;
    clientPaymentDate?: string | null;
    confirmedDate?: string | null;
    dateCreated?: string | null;
  };

  const externalEventId = String(payload.id ?? `${event}:${paymentData.id ?? crypto.randomUUID()}`);

  const existingEvent = await supabase
    .from("payment_webhook_events")
    .select("id, processing_status, retry_count")
    .eq("provider", "asaas")
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
        event_type: event || "unknown",
        processing_status: "processing",
        retry_count: retryCount,
      })
      .eq("id", existingEvent.data.id);
  } else {
    const insertedEvent = await supabase
      .from("payment_webhook_events")
      .insert({
        provider: "asaas",
        external_event_id: externalEventId,
        event_type: event || "unknown",
        payload,
        processing_status: "processing",
        retry_count: 0,
      })
      .select("id")
      .single<{ id: string }>();

    eventId = insertedEvent.data?.id ?? null;
  }

  try {
    const paymentId = String(paymentData.id ?? "").trim();
    const orderId = parseUuid(paymentData.externalReference ?? null);

    if (!paymentId || !orderId) {
      if (eventId) {
        await supabase
          .from("payment_webhook_events")
          .update({ processing_status: "processed", processed_at: new Date().toISOString() })
          .eq("id", eventId);
      }

      return NextResponse.json({ ok: true, ignored: true });
    }

    const orderResult = await supabase
      .from("orders")
      .select("id,booking_id,cliente_id,description,metadata")
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        booking_id: number | null;
        cliente_id: number | null;
        description: string | null;
        metadata: Record<string, unknown> | null;
      }>();

    if (!orderResult.data?.id) {
      throw new Error("Pedido nao encontrado para o evento recebido.");
    }

    const mappedStatus = mapAsaasStatus(paymentData.status);
    const paidAt = paymentData.clientPaymentDate ?? paymentData.confirmedDate ?? null;
    const paymentMethodLabel = mapAsaasBillingTypeLabel(paymentData.billingType);
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
          provider: "asaas",
          status: mappedStatus,
          amount: Number(paymentData.value ?? 0),
          currency: "BRL",
          external_payment_id: paymentId,
          raw_payload: payload,
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
    const resolvedServiceName = servico?.nome ?? (metadataTitle || paymentData.description || "Servico");

    const financeiroUpsert = await supabase.from("pagamentos_financeiro").upsert(
      {
        booking_id: resolvedBookingId,
        order_id: orderResult.data.id,
        payment_id: paymentUpsert.data.id,
        cliente_nome: cliente?.nome ?? "Cliente",
        cliente_cpf: String(cliente?.cpf ?? ""),
        data_reserva: bookingInfo?.data ?? new Date().toISOString().slice(0, 10),
        servico_nome: resolvedServiceName,
        valor: Number(paymentData.value ?? 0),
        tipo_pagamento: paymentMethodLabel,
        status_pagamento: mappedStatus,
        sucesso: mappedStatus === "paid",
        whatsapp: cliente?.telefone ?? null,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );

    if (financeiroUpsert.error) {
      console.error("[asaas/webhook] falha ao salvar financeiro", financeiroUpsert.error);
    }

    let whatsappSent = false;

    if (mappedStatus === "paid" && bookingInfo?.id && cliente) {
      const paidValue = Number(paymentData.value ?? 0);
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
        console.error("[asaas/webhook] falha ao atualizar status do agendamento", {
          bookingId: bookingInfo.id,
          error: bookingUpdate.error,
        });
      }
    }

    await supabase
      .from("pagamentos_financeiro")
      .update({
        whatsapp_enviado: whatsappSent,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderResult.data.id);

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
