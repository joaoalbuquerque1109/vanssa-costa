import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getMercadoPagoConfig } from "@/lib/mercadopago";

type PreferenceItemInput = {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
};

type CreatePreferencePayload = {
  title?: string;
  quantity?: number;
  unit_price?: number;
  items?: PreferenceItemInput[];
  payerEmail?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  bookingId?: number;
  paymentMethod?: "all" | "pix" | "card" | "boleto" | "pix_card";
};

function resolvePaymentMethods(method: CreatePreferencePayload["paymentMethod"]) {
  if (!method || method === "all") return undefined;

  if (method === "pix") {
    return {
      excluded_payment_types: [
        { id: "ticket" },
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "prepaid_card" },
        { id: "atm" },
      ],
      installments: 1,
    };
  }

  if (method === "card") {
    return {
      excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }],
    };
  }

  if (method === "pix_card") {
    return {
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
    };
  }

  if (method === "boleto") {
    return {
      excluded_payment_types: [
        { id: "bank_transfer" },
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "prepaid_card" },
        { id: "atm" },
      ],
      installments: 1,
    };
  }

  return undefined;
}

function resolvePaymentMethodLabel(method: CreatePreferencePayload["paymentMethod"]) {
  if (method === "pix_card") return "Pix + Cartao";
  if (method === "pix") return "Pix";
  if (method === "card") return "Cartao";
  if (method === "boleto") return "Boleto";
  return "Todos";
}

export async function POST(request: Request) {
  const config = getMercadoPagoConfig();
  const requestOrigin = new URL(request.url).origin;
  const appBaseUrl = String(config.appUrl ?? "").trim() || requestOrigin;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const configRes = await supabase
    .from("config")
    .select("access_token_mp")
    .eq("id", 1)
    .maybeSingle<{ access_token_mp: string | null }>();

  const accessToken = config.accessToken || String(configRes.data?.access_token_mp ?? "").trim();
  if (!accessToken) {
    return NextResponse.json({ error: "Access Token do Mercado Pago nao configurado." }, { status: 500 });
  }

  const payload = (await request.json()) as CreatePreferencePayload;
  const bookingId = Number(payload.bookingId ?? payload.metadata?.booking_id ?? 0);

  const items: PreferenceItemInput[] = payload.items?.length
    ? payload.items
    : [
        {
          id: `booking_${bookingId}`,
          title: payload.title ?? "Pagamento no app",
          quantity: Number(payload.quantity ?? 1),
          unit_price: Number(payload.unit_price ?? 0),
        },
      ];

  if (!items.length || items.some((item) => !item.title || item.quantity <= 0 || item.unit_price <= 0)) {
    return NextResponse.json({ error: "Itens de pagamento invalidos." }, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: "Agendamento invalido para pagamento." }, { status: 400 });
  }

  const bookingRes = await supabase
    .from("agendamentos")
    .select("id,status,cliente")
    .eq("id", bookingId)
    .limit(1)
    .maybeSingle<{ id: number; status: string; cliente: number }>();

  if (bookingRes.error || !bookingRes.data?.id) {
    return NextResponse.json({ error: "Agendamento nao encontrado para pagamento." }, { status: 404 });
  }

  const amount = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unit_price), 0);
  const externalReference = `order_${crypto.randomUUID()}`;

  const orderInsert = await supabase
    .from("orders")
    .insert({
      auth_user_id: null,
      cliente_id: bookingRes.data.cliente,
      amount,
      currency: "BRL",
      status: "pending",
      booking_id: bookingId,
      description: payload.description ?? items[0]?.title,
      external_reference: externalReference,
      metadata: {
        ...(payload.metadata ?? {}),
        booking_id: bookingId,
        payment_method: payload.paymentMethod ?? "all",
        source: "checkout_pro",
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (orderInsert.error || !orderInsert.data?.id) {
    console.error("[mp/preference] falha ao criar order", orderInsert.error);
    return NextResponse.json({ error: "Nao foi possivel criar o pedido." }, { status: 500 });
  }

  const bookingInfoRes = await supabase
    .from("agendamentos")
    .select("id,data,clientes(nome,cpf,telefone),servicos(nome)")
    .eq("id", bookingId)
    .maybeSingle<{
      id: number;
      data: string;
      clientes: { nome: string; cpf: string; telefone: string | null } | { nome: string; cpf: string; telefone: string | null }[] | null;
      servicos: { nome: string } | { nome: string }[] | null;
    }>();

  const cliente = Array.isArray(bookingInfoRes.data?.clientes) ? bookingInfoRes.data?.clientes[0] : bookingInfoRes.data?.clientes;
  const servico = Array.isArray(bookingInfoRes.data?.servicos) ? bookingInfoRes.data?.servicos[0] : bookingInfoRes.data?.servicos;

  await supabase.from("pagamentos_financeiro").upsert(
    {
      booking_id: bookingId,
      order_id: orderInsert.data.id,
      cliente_nome: cliente?.nome ?? "Cliente",
      cliente_cpf: String(cliente?.cpf ?? ""),
      data_reserva: bookingInfoRes.data?.data ?? new Date().toISOString().slice(0, 10),
      servico_nome: servico?.nome ?? (payload.title ?? "Servico"),
      valor: amount,
      tipo_pagamento: resolvePaymentMethodLabel(payload.paymentMethod),
      status_pagamento: "pending",
      sucesso: false,
      whatsapp: cliente?.telefone ?? null,
      payload: {
        source: "preference",
        payment_method: payload.paymentMethod ?? "all",
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );

  const notificationUrl = config.webhookUrl ?? `${appBaseUrl}/api/payments/mercadopago/webhook`;

  const backUrls = {
    success: `${appBaseUrl}/pagamento/resultado?status=approved&booking_id=${bookingId}&order_id=${orderInsert.data.id}`,
    failure: `${appBaseUrl}/pagamento/resultado?status=rejected&booking_id=${bookingId}&order_id=${orderInsert.data.id}`,
    pending: `${appBaseUrl}/pagamento/resultado?status=pending&booking_id=${bookingId}&order_id=${orderInsert.data.id}`,
  };
  const canUseAutoReturn = backUrls.success.startsWith("https://");

  const mpClient = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000, idempotencyKey: `pref_${orderInsert.data.id}` },
  });
  const preference = new Preference(mpClient);

  let preferenceData: { id?: string; init_point?: string; sandbox_init_point?: string };

  try {
    preferenceData = (await preference.create({
      body: {
        items: items.map((item, index) => ({
          id: item.id ?? `item_${index + 1}`,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        external_reference: externalReference,
        payer: payload.payerEmail ? { email: payload.payerEmail } : undefined,
        notification_url: notificationUrl,
        back_urls: backUrls,
        auto_return: canUseAutoReturn ? "approved" : undefined,
        metadata: {
          order_id: orderInsert.data.id,
          booking_id: bookingId,
          payment_method: payload.paymentMethod ?? "all",
          ...(payload.metadata ?? {}),
        },
        payment_methods: resolvePaymentMethods(payload.paymentMethod),
      },
    })) as { id?: string; init_point?: string; sandbox_init_point?: string };
  } catch (error) {
    console.error("[mp/preference] falha mercado pago sdk", { error, backUrls, canUseAutoReturn, appBaseUrl });
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderInsert.data.id);
    return NextResponse.json({ error: "Erro ao gerar preferencia no Mercado Pago." }, { status: 500 });
  }

  if (!preferenceData.id) {
    console.error("[mp/preference] resposta sem id", preferenceData);
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderInsert.data.id);
    return NextResponse.json({ error: "Erro ao gerar preferencia no Mercado Pago." }, { status: 500 });
  }

  const updateOrder = await supabase
    .from("orders")
    .update({
      mp_preference_id: preferenceData.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderInsert.data.id);

  if (updateOrder.error) {
    console.error("[mp/preference] falha ao salvar preference_id", updateOrder.error);
  }

  return NextResponse.json({
    id: preferenceData.id,
    order_id: orderInsert.data.id,
    preference_id: preferenceData.id,
    init_point: preferenceData.init_point,
    sandbox_init_point: preferenceData.sandbox_init_point,
    back_urls: backUrls,
  });
}
