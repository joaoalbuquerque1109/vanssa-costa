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

type CustomerInput = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
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
  pendingBookingId?: string;
  planId?: number;
  customer?: CustomerInput;
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

async function upsertCustomerFromPayload(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  customer: CustomerInput | undefined,
) {
  const nome = String(customer?.nome ?? "").trim();
  const email = String(customer?.email ?? "").trim().toLowerCase();
  const telefone = String(customer?.telefone ?? "").trim();
  const cpfDigits = String(customer?.cpf ?? "").replace(/\D/g, "");
  const dataNascimento = String(customer?.dataNascimento ?? "").trim();

  if (!nome || !email || !telefone || cpfDigits.length !== 11 || !dataNascimento) {
    return { error: "Dados do cliente invalidos para compra do plano." as const };
  }

  const existingCustomer = await supabase
    .from("clientes")
    .select("id")
    .eq("cpf", cpfDigits)
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (existingCustomer.error) {
    return { error: "Nao foi possivel validar o cadastro do cliente." as const };
  }

  if (existingCustomer.data?.id) {
    const updateRes = await supabase
      .from("clientes")
      .update({
        nome,
        email,
        telefone,
        data_nasc: dataNascimento,
      })
      .eq("id", existingCustomer.data.id);

    if (updateRes.error) {
      return { error: "Nao foi possivel atualizar os dados do cliente." as const };
    }

    return {
      clienteId: existingCustomer.data.id,
      clienteNome: nome,
      clienteCpf: cpfDigits,
      clienteTelefone: telefone,
      error: null,
    };
  }

  const insertRes = await supabase
    .from("clientes")
    .insert({
      nome,
      email,
      telefone,
      cpf: cpfDigits,
      data_nasc: dataNascimento,
    })
    .select("id")
    .single<{ id: number }>();

  if (insertRes.error || !insertRes.data?.id) {
    return { error: "Nao foi possivel cadastrar o cliente para o pagamento." as const };
  }

  return {
    clienteId: insertRes.data.id,
    clienteNome: nome,
    clienteCpf: cpfDigits,
    clienteTelefone: telefone,
    error: null,
  };
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

  const accessToken = String(configRes.data?.access_token_mp ?? "").trim() || config.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Access Token do Mercado Pago nao configurado." }, { status: 500 });
  }

  const payload = (await request.json()) as CreatePreferencePayload;
  const bookingId = Number(payload.bookingId ?? payload.metadata?.booking_id ?? 0);
  const pendingBookingId = String(payload.pendingBookingId ?? payload.metadata?.pending_booking_id ?? "").trim();
  const planId = Number(payload.planId ?? payload.metadata?.plan_id ?? 0);
  const isPendingBookingCheckout = !bookingId && !!pendingBookingId;
  const isPlanCheckout = !bookingId && planId > 0;

  let resolvedTitle = payload.title ?? "Pagamento no app";
  let resolvedDescription = payload.description ?? payload.title ?? "Pagamento";
  let resolvedBookingId: number | null = null;
  let resolvedPendingBookingId: string | null = null;
  let resolvedClienteId: number | null = null;
  let resolvedClienteNome = "Cliente";
  let resolvedClienteCpf = "";
  let resolvedClienteTelefone: string | null = null;
  let resolvedPlanId: number | null = null;
  let resolvedRequestDate = new Date().toISOString().slice(0, 10);

  if (!bookingId && !isPendingBookingCheckout && !isPlanCheckout) {
    return NextResponse.json({ error: "Agendamento ou plano invalido para pagamento." }, { status: 400 });
  }

  if (bookingId) {
    const bookingRes = await supabase
      .from("agendamentos")
      .select("id,status,cliente,servicos(nome)")
      .eq("id", bookingId)
      .limit(1)
      .maybeSingle<{
        id: number;
        status: string;
        cliente: number;
        servicos: { nome: string } | { nome: string }[] | null;
      }>();

    if (bookingRes.error || !bookingRes.data?.id) {
      return NextResponse.json({ error: "Agendamento nao encontrado para pagamento." }, { status: 404 });
    }

    resolvedBookingId = bookingRes.data.id;
    resolvedClienteId = bookingRes.data.cliente;
    const service = Array.isArray(bookingRes.data.servicos) ? bookingRes.data.servicos[0] : bookingRes.data.servicos;
    if (service?.nome) {
      resolvedTitle = payload.title ?? service.nome;
      resolvedDescription = payload.description ?? service.nome;
    }

    const customerRes = await supabase
      .from("clientes")
      .select("nome,cpf,telefone")
      .eq("id", bookingRes.data.cliente)
      .maybeSingle<{ nome: string; cpf: string; telefone: string | null }>();

    if (customerRes.data) {
      resolvedClienteNome = customerRes.data.nome;
      resolvedClienteCpf = String(customerRes.data.cpf ?? "");
      resolvedClienteTelefone = customerRes.data.telefone ?? null;
    }
  } else if (isPendingBookingCheckout) {
    const pendingRes = await supabase
      .from("agendamentos_pendentes")
      .select("id,cliente,data,valor,status,servicos(nome)")
      .eq("id", pendingBookingId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle<{
        id: string;
        cliente: number;
        data: string;
        valor: number;
        status: string;
        servicos: { nome: string } | { nome: string }[] | null;
      }>();

    if (pendingRes.error || !pendingRes.data?.id) {
      return NextResponse.json({ error: "Pre-agendamento nao encontrado ou expirado." }, { status: 404 });
    }

    resolvedPendingBookingId = pendingRes.data.id;
    resolvedClienteId = pendingRes.data.cliente;
    resolvedRequestDate = pendingRes.data.data;

    const service = Array.isArray(pendingRes.data.servicos) ? pendingRes.data.servicos[0] : pendingRes.data.servicos;
    if (service?.nome) {
      resolvedTitle = payload.title ?? service.nome;
      resolvedDescription = payload.description ?? service.nome;
    }

    const customerRes = await supabase
      .from("clientes")
      .select("nome,cpf,telefone")
      .eq("id", pendingRes.data.cliente)
      .maybeSingle<{ nome: string; cpf: string; telefone: string | null }>();

    if (customerRes.data) {
      resolvedClienteNome = customerRes.data.nome;
      resolvedClienteCpf = String(customerRes.data.cpf ?? "");
      resolvedClienteTelefone = customerRes.data.telefone ?? null;
    }

    if (!payload.items?.length && Number(payload.unit_price ?? 0) <= 0) {
      payload.unit_price = Number(pendingRes.data.valor ?? 0);
    }
  } else {
    const planRes = await supabase
      .from("planos")
      .select("id,nome,preco,ativo")
      .eq("id", planId)
      .maybeSingle<{ id: number; nome: string; preco: number; ativo: string | null }>();

    if (planRes.error || !planRes.data?.id || planRes.data.ativo !== "Sim") {
      return NextResponse.json({ error: "Plano nao encontrado ou inativo." }, { status: 404 });
    }

    const customerRes = await upsertCustomerFromPayload(supabase, payload.customer);
    if (customerRes.error) {
      return NextResponse.json({ error: customerRes.error }, { status: 400 });
    }

    resolvedPlanId = planRes.data.id;
    resolvedClienteId = customerRes.clienteId;
    resolvedClienteNome = customerRes.clienteNome;
    resolvedClienteCpf = customerRes.clienteCpf;
    resolvedClienteTelefone = customerRes.clienteTelefone;
    resolvedTitle = payload.title ?? planRes.data.nome;
    resolvedDescription = payload.description ?? `Plano ${planRes.data.nome}`;
  }

  const items: PreferenceItemInput[] = payload.items?.length
    ? payload.items
    : [
        {
          id: resolvedBookingId ? `booking_${resolvedBookingId}` : `plan_${resolvedPlanId}`,
          title: resolvedTitle,
          quantity: Number(payload.quantity ?? 1),
          unit_price: Number(payload.unit_price ?? 0),
        },
      ];

  if (isPlanCheckout && (!payload.items || !payload.items.length)) {
    const planPriceRes = await supabase.from("planos").select("preco").eq("id", planId).maybeSingle<{ preco: number }>();
    if (!planPriceRes.data?.preco) {
      return NextResponse.json({ error: "Preco do plano invalido." }, { status: 400 });
    }
    items[0].unit_price = Number(planPriceRes.data.preco);
  }

  if (!items.length || items.some((item) => !item.title || item.quantity <= 0 || item.unit_price <= 0)) {
    return NextResponse.json({ error: "Itens de pagamento invalidos." }, { status: 400 });
  }

  const amount = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unit_price), 0);
  const externalReference = `order_${crypto.randomUUID()}`;

  const orderInsert = await supabase
    .from("orders")
    .insert({
      auth_user_id: null,
      cliente_id: resolvedClienteId,
      amount,
      currency: "BRL",
      status: "pending",
      booking_id: resolvedBookingId,
      description: resolvedDescription,
      external_reference: externalReference,
      metadata: {
        ...(payload.metadata ?? {}),
        booking_id: resolvedBookingId,
        pending_booking_id: resolvedPendingBookingId,
        plan_id: resolvedPlanId,
        checkout_title: resolvedTitle,
        payment_method: payload.paymentMethod ?? "all",
        source: isPlanCheckout ? "plan_checkout" : isPendingBookingCheckout ? "booking_pending_checkout" : "checkout_pro",
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (orderInsert.error || !orderInsert.data?.id) {
    console.error("[mp/preference] falha ao criar order", orderInsert.error);
    return NextResponse.json({ error: "Nao foi possivel criar o pedido." }, { status: 500 });
  }

  await supabase.from("pagamentos_financeiro").upsert(
    {
      booking_id: resolvedBookingId,
      order_id: orderInsert.data.id,
      cliente_nome: resolvedClienteNome,
      cliente_cpf: resolvedClienteCpf,
      data_reserva: resolvedRequestDate,
      servico_nome: resolvedTitle,
      valor: amount,
      tipo_pagamento: resolvePaymentMethodLabel(payload.paymentMethod),
      status_pagamento: "pending",
      sucesso: false,
      whatsapp: resolvedClienteTelefone,
      payload: {
        source: isPlanCheckout ? "plan_checkout" : isPendingBookingCheckout ? "booking_pending_checkout" : "preference",
        payment_method: payload.paymentMethod ?? "all",
        pending_booking_id: resolvedPendingBookingId,
        plan_id: resolvedPlanId,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );

  const notificationUrl = config.webhookUrl ?? `${appBaseUrl}/api/payments/mercadopago/webhook`;

  const resultBase = "/pagamento/resultado";
  const queryPlan = resolvedPlanId ? `&plan_id=${resolvedPlanId}` : "";
  const queryBooking = resolvedBookingId ? `&booking_id=${resolvedBookingId}` : "";
  const backUrls = {
    success: `${appBaseUrl}${resultBase}?status=approved${queryBooking}${queryPlan}&order_id=${orderInsert.data.id}`,
    failure: `${appBaseUrl}${resultBase}?status=rejected${queryBooking}${queryPlan}&order_id=${orderInsert.data.id}`,
    pending: `${appBaseUrl}${resultBase}?status=pending${queryBooking}${queryPlan}&order_id=${orderInsert.data.id}`,
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
          booking_id: resolvedBookingId,
          pending_booking_id: resolvedPendingBookingId,
          plan_id: resolvedPlanId,
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
