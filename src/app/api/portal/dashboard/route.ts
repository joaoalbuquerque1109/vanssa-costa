import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DashboardRange, getPortalSession, getRangeDates, rangeLabel, toIsoDate } from "@/lib/portal";

type AppointmentAnalyticsRow = {
  data: string;
  funcionario: number;
  servico: number;
  status: string;
  servicos: { nome: string; valor: number } | { nome: string; valor: number }[] | null;
};

const ALLOWED_RANGES = new Set<DashboardRange>(["day", "week", "month", "quarter", "semester", "year", "custom"]);

function inRange(dateISO: string, start: Date, end: Date) {
  const date = new Date(`${dateISO}T00:00:00`);
  return date >= start && date <= end;
}

function toAmount(row: AppointmentAnalyticsRow) {
  const service = Array.isArray(row.servicos) ? row.servicos[0] : row.servicos;
  return Number(service?.valor ?? 0);
}

function sumAppointments(rows: AppointmentAnalyticsRow[], start: Date, end: Date) {
  return rows
    .filter((row) => inRange(row.data, start, end))
    .reduce((acc, row) => acc + toAmount(row), 0);
}

function buildRevenueChart(rows: AppointmentAnalyticsRow[], start: Date, end: Date) {
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const byMonth = diffDays > 90;
  const bucket = new Map<string, number>();

  rows
    .filter((row) => inRange(row.data, start, end))
    .forEach((row) => {
      const date = new Date(`${row.data}T00:00:00`);
      const key = byMonth
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      bucket.set(key, (bucket.get(key) ?? 0) + toAmount(row));
    });

  return [...bucket.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, total]) => ({ label, total }));
}

export async function GET(request: NextRequest) {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const rangeParam = request.nextUrl.searchParams.get("range") as DashboardRange | null;
  const range: DashboardRange = rangeParam && ALLOWED_RANGES.has(rangeParam) ? rangeParam : "month";
  const customFrom = request.nextUrl.searchParams.get("from");
  const customTo = request.nextUrl.searchParams.get("to");
  const selectedRange = getRangeDates(range, customFrom, customTo);

  const yearRange = getRangeDates("year");
  let query = supabase
    .from("agendamentos")
    .select("data,funcionario,servico,status,servicos(nome,valor)")
    .gte("data", toIsoDate(yearRange.start))
    .lte("data", toIsoDate(selectedRange.end))
    .in("status", ["Confirmado", "Agendado", "Finalizado", "Pago"]);

  if (session.profile.role === "funcionario" && session.profile.usuario_id) {
    query = query.eq("funcionario", session.profile.usuario_id);
  }

  const appointmentsRes = await query;
  if (appointmentsRes.error) {
    return NextResponse.json({ error: "Falha ao carregar dados de rendimento." }, { status: 500 });
  }

  const appointments = (appointmentsRes.data ?? []) as AppointmentAnalyticsRow[];

  const popularMap = new Map<number, { serviceId: number; name: string; total: number }>();
  appointments
    .filter((row) => inRange(row.data, selectedRange.start, selectedRange.end))
    .forEach((row) => {
      const service = Array.isArray(row.servicos) ? row.servicos[0] : row.servicos;
      const current = popularMap.get(Number(row.servico));
      popularMap.set(Number(row.servico), {
        serviceId: Number(row.servico),
        name: service?.nome ?? "Serviço",
        total: (current?.total ?? 0) + 1,
      });
    });

  const periodMs = selectedRange.end.getTime() - selectedRange.start.getTime() + 1;
  const previousStart = new Date(selectedRange.start.getTime() - periodMs);
  const previousEnd = new Date(selectedRange.start.getTime() - 1);

  const [currentGrowth, previousGrowth] = await Promise.all([
    supabase
      .from("user_login_events")
      .select("id", { count: "exact", head: true })
      .eq("role", "cliente")
      .gte("logged_at", selectedRange.start.toISOString())
      .lte("logged_at", selectedRange.end.toISOString()),
    supabase
      .from("user_login_events")
      .select("id", { count: "exact", head: true })
      .eq("role", "cliente")
      .gte("logged_at", previousStart.toISOString())
      .lte("logged_at", previousEnd.toISOString()),
  ]);

  if (currentGrowth.error || previousGrowth.error) {
    return NextResponse.json({ error: "Falha ao calcular crescimento de clientes." }, { status: 500 });
  }

  const currentLogins = currentGrowth.count ?? 0;
  const previousLogins = previousGrowth.count ?? 0;
  const growthRate = previousLogins === 0 ? (currentLogins > 0 ? 100 : 0) : ((currentLogins - previousLogins) / previousLogins) * 100;

  return NextResponse.json({
    range,
    rangeLabel: rangeLabel(range),
    dateRange: { from: toIsoDate(selectedRange.start), to: toIsoDate(selectedRange.end) },
    popularServices: [...popularMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
    loggedCustomerGrowth: { currentLogins, previousLogins, growthRate },
    revenue: {
      year: sumAppointments(appointments, getRangeDates("year").start, selectedRange.end),
      semester: sumAppointments(appointments, getRangeDates("semester").start, selectedRange.end),
      quarter: sumAppointments(appointments, getRangeDates("quarter").start, selectedRange.end),
      month: sumAppointments(appointments, getRangeDates("month").start, selectedRange.end),
      week: sumAppointments(appointments, getRangeDates("week").start, selectedRange.end),
      day: sumAppointments(appointments, getRangeDates("day").start, selectedRange.end),
      selected: sumAppointments(appointments, selectedRange.start, selectedRange.end),
    },
    chart: buildRevenueChart(appointments, selectedRange.start, selectedRange.end),
  });
}
