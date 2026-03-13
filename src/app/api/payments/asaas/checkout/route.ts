import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAsaasConfig, normalizeDigits } from "@/lib/asaas";

type CheckoutItemInput = {
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

type CreateCheckoutPayload = {
  title?: string;
  quantity?: number;
  unit_price?: number;
  items?: CheckoutItemInput[];
  description?: string;
  metadata?: Record<string, unknown>;
  bookingId?: number;
  pendingBookingId?: string;
  planId?: number;
  customer?: CustomerInput;
  paymentMethod?: "all" | "pix" | "card" | "boleto" | "pix_card";
};

type ResolvedCustomer = {
  clienteId: number;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone: string | null;
  clienteEmail: string | null;
};

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPublicHttpsUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return false;
    if (hostname === "localhost" || hostname.endsWith(".local")) return false;
    if (hostname === "::1") return false;
    if (isPrivateIpv4(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveAppBaseUrl(request: Request, configuredAppUrl?: string | null) {
  const configured = String(configuredAppUrl ?? "").trim();
  if (configured) return configured.replace(/\/+$/, "");

  const forwardedHost = String(request.headers.get("x-forwarded-host") ?? "").trim();
  if (forwardedHost) {
    const forwardedProto = String(request.headers.get("x-forwarded-proto") ?? "https").trim() || "https";
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  const vercelUrl = String(process.env.VERCEL_URL ?? "").trim();
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, "");

  return new URL(request.url).origin.replace(/\/+$/, "");
}

function resolveAsaasBillingType(method: CreateCheckoutPayload["paymentMethod"]) {
  if (!method || method === "all" || method === "pix_card") return "UNDEFINED";
  if (method === "pix") return "PIX";
  if (method === "card") return "CREDIT_CARD";
  if (method === "boleto") return "BOLETO";
  return "UNDEFINED";
}

function resolvePaymentMethodLabel(method: CreateCheckoutPayload["paymentMethod"]) {
  if (method === "pix_card") return "Pix + Cartao";
  if (method === "pix") return "Pix";
  if (method === "card") return "Cartao";
  if (method === "boleto") return "Boleto";
  return "Checkout Asaas";
}

function resolveDueDate() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertCustomerFromPayload(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  customer: CustomerInput | undefined,
) {
  const nome = String(customer?.nome ?? "").trim();
  const email = String(customer?.email ?? "").trim().toLowerCase();
  const telefone = String(customer?.telefone ?? "").trim();
  const cpfDigits = normalizeDigits(customer?.cpf);
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
      clienteEmail: email,
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
    clienteEmail: email,
    error: null,
  };
}

async function createAsaasCustomer({
  apiBaseUrl,
  apiKey,
  customer,
}: {
  apiBaseUrl: string;
  apiKey: string;
  customer: ResolvedCustomer;
}) {
  const response = await fetch(`${apiBaseUrl}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "vanssa-costa-tests",
    },
    body: JSON.stringify({
      name: customer.clienteNome,
      cpfCnpj: customer.clienteCpf,
      email: customer.clienteEmail ?? undefined,
      mobilePhone: normalizeDigits(customer.clienteTelefone),
      notificationDisabled: false,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as { id?: string; errors?: { description?: string }[] };
  if (!response.ok || !payload.id) {
    throw new Error(payload.errors?.[0]?.description ?? "Falha ao criar cliente no Asaas.");
  }

  return payload.id;
}

export async function POST(request: Request) {
  const config = getAsaasConfig();
  const appBaseUrl = resolveAppBaseUrl(request, config.appUrl);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nao configurado." }, { status: 500 });
  }

  const configRes = await supabase
    .from("config")
    .select("access_token_mp")
    .eq("id", 1)
    .maybeSingle<{ access_token_mp: string | null }>();

  const apiKey = String(configRes.data?.access_token_mp ?? "").trim() || config.apiKey;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key do Asaas nao configurada." }, { status: 500 });
  }

  const payload = (await request.json()) as CreateCheckoutPayload;
  const bookingId = Number(payload.bookingId ?? payload.metadata?.booking_id ?? 0);
  const pendingBookingId = String(payload.pendingBookingId ?? payload.metadata?.pending_booking_id ?? "").trim();
  const planId = Number(payload.planId ?? payload.metadata?.plan_id ?? 0);
  const isPendingBookingCheckout = !bookingId && !!pendingBookingId;
  const isPlanCheckout = !bookingId && planId > 0;

  let resolvedTitle = payload.title ?? "Pagamento no app";
  let resolvedDescription = payload.description ?? payload.title ?? "Pagamento";
  let resolvedBookingId: number | null = null;
  let resolvedPendingBookingId: string | null = null;
  let resolvedPlanId: number | null = null;
  let resolvedRequestDate = new Date().toISOString().slice(0, 10);
  let resolvedCustomer: ResolvedCustomer | null = null;

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
    const service = Array.isArray(bookingRes.data.servicos) ? bookingRes.data.servicos[0] : bookingRes.data.servicos;
    if (service?.nome) {
      resolvedTitle = payload.title ?? service.nome;
      resolvedDescription = payload.description ?? service.nome;
    }

    const customerRes = await supabase
      .from("clientes")
      .select("id,nome,cpf,telefone,email")
      .eq("id", bookingRes.data.cliente)
      .maybeSingle<{ id: number; nome: string; cpf: string; telefone: string | null; email: string | null }>();

    if (!customerRes.data?.id) {
      return NextResponse.json({ error: "Cliente do agendamento nao encontrado." }, { status: 404 });
    }

    resolvedCustomer = {
      clienteId: customerRes.data.id,
      clienteNome: customerRes.data.nome,
      clienteCpf: String(customerRes.data.cpf ?? ""),
      clienteTelefone: customerRes.data.telefone ?? null,
      clienteEmail: customerRes.data.email ?? null,
    };
  } else if (isPendingBookingCheckout) {
    const pendingRes = await supabase
      .from("agendamentos_pendentes")
      .select("id,cliente,data,valor,status,servicos(nome)")
      .eq("id", pendingBookingId)
      .in("status", ["pending", "pending_payment"])
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
    resolvedRequestDate = pendingRes.data.data;

    const service = Array.isArray(pendingRes.data.servicos) ? pendingRes.data.servicos[0] : pendingRes.data.servicos;
    if (service?.nome) {
      resolvedTitle = payload.title ?? service.nome;
      resolvedDescription = payload.description ?? service.nome;
    }

    const customerRes = await supabase
      .from("clientes")
      .select("id,nome,cpf,telefone,email")
      .eq("id", pendingRes.data.cliente)
      .maybeSingle<{ id: number; nome: string; cpf: string; telefone: string | null; email: string | null }>();

    if (!customerRes.data?.id) {
      return NextResponse.json({ error: "Cliente do pre-agendamento nao encontrado." }, { status: 404 });
    }

    resolvedCustomer = {
      clienteId: customerRes.data.id,
      clienteNome: customerRes.data.nome,
      clienteCpf: String(customerRes.data.cpf ?? ""),
      clienteTelefone: customerRes.data.telefone ?? null,
      clienteEmail: customerRes.data.email ?? null,
    };

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
    resolvedCustomer = {
      clienteId: customerRes.clienteId,
      clienteNome: customerRes.clienteNome,
      clienteCpf: customerRes.clienteCpf,
      clienteTelefone: customerRes.clienteTelefone,
      clienteEmail: customerRes.clienteEmail,
    };
    resolvedTitle = payload.title ?? planRes.data.nome;
    resolvedDescription = payload.description ?? `Plano ${planRes.data.nome}`;
  }

  const items: CheckoutItemInput[] = payload.items?.length
    ? payload.items
    : [
        {
          id: resolvedBookingId ? `booking_${resolvedBookingId}` : resolvedPlanId ? `plan_${resolvedPlanId}` : `pending_${resolvedPendingBookingId}`,
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

  if (!resolvedCustomer) {
    return NextResponse.json({ error: "Cliente invalido para pagamento." }, { status: 400 });
  }

  if (!items.length || items.some((item) => !item.title || item.quantity <= 0 || item.unit_price <= 0)) {
    return NextResponse.json({ error: "Itens de pagamento invalidos." }, { status: 400 });
  }

  const amount = items.reduce((acc, item) => acc + Number(item.quantity) * Number(item.unit_price), 0);
  const externalReference = crypto.randomUUID();

  const orderInsert = await supabase
    .from("orders")
    .insert({
      auth_user_id: null,
      cliente_id: resolvedCustomer.clienteId,
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
        provider: "asaas",
        source: isPlanCheckout ? "plan_checkout" : isPendingBookingCheckout ? "booking_pending_checkout" : "checkout_asaas",
      },
    })
    .select("id")
    .single<{ id: string }>();

  if (orderInsert.error || !orderInsert.data?.id) {
    console.error("[asaas/checkout] falha ao criar order", orderInsert.error);
    return NextResponse.json({ error: "Nao foi possivel criar o pedido." }, { status: 500 });
  }

  await supabase.from("pagamentos_financeiro").upsert(
    {
      booking_id: resolvedBookingId,
      order_id: orderInsert.data.id,
      cliente_nome: resolvedCustomer.clienteNome,
      cliente_cpf: resolvedCustomer.clienteCpf,
      data_reserva: resolvedRequestDate,
      servico_nome: resolvedTitle,
      valor: amount,
      tipo_pagamento: resolvePaymentMethodLabel(payload.paymentMethod),
      status_pagamento: "pending",
      sucesso: false,
      whatsapp: resolvedCustomer.clienteTelefone,
      payload: {
        provider: "asaas",
        source: isPlanCheckout ? "plan_checkout" : isPendingBookingCheckout ? "booking_pending_checkout" : "checkout_asaas",
        payment_method: payload.paymentMethod ?? "all",
        pending_booking_id: resolvedPendingBookingId,
        plan_id: resolvedPlanId,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "order_id" },
  );

  const configuredWebhookUrl = String(config.webhookUrl ?? "").trim().replace(/\/+$/, "");
  const notificationUrl = configuredWebhookUrl || `${appBaseUrl}/api/payments/asaas/webhook`;
  if (!isPublicHttpsUrl(notificationUrl)) {
    return NextResponse.json(
      {
        error: "Webhook URL invalida. Configure ASAAS_WEBHOOK_URL com URL publica HTTPS.",
        webhook_url: notificationUrl,
      },
      { status: 400 },
    );
  }

  try {
    const asaasCustomerId = await createAsaasCustomer({
      apiBaseUrl: config.apiBaseUrl,
      apiKey,
      customer: resolvedCustomer,
    });

    const queryPlan = resolvedPlanId ? `&plan_id=${resolvedPlanId}` : "";
    const queryBooking = resolvedBookingId ? `&booking_id=${resolvedBookingId}` : "";
    const queryExternalReference = `&external_reference=${encodeURIComponent(externalReference)}`;
    const successUrl = `${appBaseUrl}/pagamento/resultado?status=approved${queryBooking}${queryPlan}&order_id=${orderInsert.data.id}${queryExternalReference}`;

    const paymentResponse = await fetch(`${config.apiBaseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
        "User-Agent": "vanssa-costa-tests",
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: resolveAsaasBillingType(payload.paymentMethod),
        value: amount,
        dueDate: resolveDueDate(),
        description: resolvedDescription,
        externalReference: orderInsert.data.id,
        callback: {
          successUrl,
          autoRedirect: false,
        },
      }),
      cache: "no-store",
    });

    const paymentPayload = (await paymentResponse.json()) as {
      id?: string;
      invoiceUrl?: string;
      status?: string;
      errors?: { description?: string }[];
    };

    if (!paymentResponse.ok || !paymentPayload.id || !paymentPayload.invoiceUrl) {
      throw new Error(paymentPayload.errors?.[0]?.description ?? "Falha ao criar cobranca no Asaas.");
    }

    await supabase
      .from("orders")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderInsert.data.id);

    return NextResponse.json({
      order_id: orderInsert.data.id,
      external_reference: externalReference,
      provider: "asaas",
      checkout_url: paymentPayload.invoiceUrl,
      invoice_url: paymentPayload.invoiceUrl,
      payment_id: paymentPayload.id,
      webhook_url: notificationUrl,
      status: paymentPayload.status ?? "PENDING",
    });
  } catch (error) {
    console.error("[asaas/checkout] falha ao gerar cobranca", error);
    await supabase.from("orders").update({ status: "failed" }).eq("id", orderInsert.data.id);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar checkout no Asaas." }, { status: 500 });
  }
}
