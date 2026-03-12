import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireEmployeeOrAdmin } from "@/lib/panel-auth";

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";

function getRange(period: Period, from?: string | null, to?: string | null) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "daily") return { start, end };
  if (period === "weekly") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    return { start, end };
  }
  if (period === "monthly") {
    start.setDate(1);
    return { start, end };
  }
  if (period === "yearly") {
    start.setMonth(0, 1);
    return { start, end };
  }
  if (from && to) {
    return { start: new Date(`${from}T00:00:00`), end: new Date(`${to}T23:59:59.999`) };
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  const session = await requireEmployeeOrAdmin();
  if (!session) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const period = (request.nextUrl.searchParams.get("period") as Period | null) ?? "monthly";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const current = getRange(period, from, to);
  const currentMs = current.end.getTime() - current.start.getTime() + 1;
  const previous = {
    start: new Date(current.start.getTime() - currentMs),
    end: new Date(current.start.getTime() - 1),
  };

  const ordersRes = await supabase
    .from("orders")
    .select("amount,created_at,status")
    .eq("status", "paid")
    .gte("created_at", previous.start.toISOString())
    .lte("created_at", current.end.toISOString());

  const appointmentsRes = await supabase
    .from("agendamentos")
    .select("id,data,servico,servicos(nome,valor)")
    .gte("data", previous.start.toISOString().slice(0, 10))
    .lte("data", current.end.toISOString().slice(0, 10));

  const customersRes = await supabase
    .from("clientes")
    .select("id,data_cad")
    .gte("data_cad", previous.start.toISOString().slice(0, 10))
    .lte("data_cad", current.end.toISOString().slice(0, 10));

  if (ordersRes.error || appointmentsRes.error || customersRes.error) {
    return NextResponse.json({ error: "Falha ao montar dashboard." }, { status: 500 });
  }

  const orders = ordersRes.data ?? [];
  const appointments = (appointmentsRes.data ?? []) as Array<{ id: number; data: string; servico: number; servicos: { nome: string; valor: number } | { nome: string; valor: number }[] | null }>;
  const customers = customersRes.data ?? [];

  const inCurrentDateTime = (iso: string) => {
    const d = new Date(iso);
    return d >= current.start && d <= current.end;
  };
  const inPreviousDateTime = (iso: string) => {
    const d = new Date(iso);
    return d >= previous.start && d <= previous.end;
  };
  const inCurrentDate = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    return d >= current.start && d <= current.end;
  };

  let grossCurrent = orders.filter((o) => inCurrentDateTime(o.created_at)).reduce((acc, o) => acc + Number(o.amount ?? 0), 0);
  let grossPrevious = orders.filter((o) => inPreviousDateTime(o.created_at)).reduce((acc, o) => acc + Number(o.amount ?? 0), 0);

  if (grossCurrent === 0 && grossPrevious === 0) {
    const amountFromAppointments = (items: typeof appointments, fn: (date: string) => boolean) =>
      items.filter((a) => fn(a.data)).reduce((acc, a) => {
        const service = Array.isArray(a.servicos) ? a.servicos[0] : a.servicos;
        return acc + Number(service?.valor ?? 0);
      }, 0);
    grossCurrent = amountFromAppointments(appointments, inCurrentDate);
    grossPrevious = amountFromAppointments(appointments, (date) => {
      const d = new Date(`${date}T00:00:00`);
      return d >= previous.start && d <= previous.end;
    });
  }

  const appointmentsCurrent = appointments.filter((a) => inCurrentDate(a.data));
  const totalAppointments = appointmentsCurrent.length;
  const netCurrent = grossCurrent;
  const avgTicket = totalAppointments > 0 ? grossCurrent / totalAppointments : 0;
  const growthPercent = grossPrevious === 0 ? (grossCurrent > 0 ? 100 : 0) : ((grossCurrent - grossPrevious) / grossPrevious) * 100;

  const serviceMap = new Map<number, { service_id: number; name: string; quantity: number }>();
  appointmentsCurrent.forEach((a) => {
    const service = Array.isArray(a.servicos) ? a.servicos[0] : a.servicos;
    const curr = serviceMap.get(a.servico);
    serviceMap.set(a.servico, {
      service_id: a.servico,
      name: service?.nome ?? "Serviço",
      quantity: (curr?.quantity ?? 0) + 1,
    });
  });

  const serviceUsage = [...serviceMap.values()].map((item) => ({
    ...item,
    percentage: totalAppointments > 0 ? (item.quantity / totalAppointments) * 100 : 0,
  }));

  const newCustomers = customers.filter((c) => {
    if (!c.data_cad) return false;
    const d = new Date(`${c.data_cad}T00:00:00`);
    return d >= current.start && d <= current.end;
  }).length;

  return NextResponse.json({
    period,
    range: { from: current.start.toISOString(), to: current.end.toISOString() },
    revenue_line: {
      total_received: grossCurrent,
      points: appointmentsCurrent.map((a) => ({ date: a.data, value: Array.isArray(a.servicos) ? Number(a.servicos[0]?.valor ?? 0) : Number(a.servicos?.valor ?? 0) })),
    },
    revenue_growth_percent: growthPercent,
    period_cards: {
      gross_total: grossCurrent,
      net_total: netCurrent,
      average_ticket: avgTicket,
      total_appointments: totalAppointments,
    },
    service_usage: serviceUsage,
    new_customers: newCustomers,
  });
}
