import { BookingWizard } from "@/components/BookingWizard";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type {
  AppointmentRow,
  BlockedDayRow,
  ProfessionalRow,
  ScheduleRow,
  ServiceProfessionalRow,
  ServiceRow,
} from "@/types/site";

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const preselectedServiceId = params.servico ? Number(params.servico) : undefined;

  let appointments: AppointmentRow[] = [];
  let services: ServiceRow[] = [];
  let professionals: ProfessionalRow[] = [];
  let serviceLinks: ServiceProfessionalRow[] = [];
  let schedules: ScheduleRow[] = [];
  let blockedDays: BlockedDayRow[] = [];

  if (supabase) {
    const today = new Date().toISOString().slice(0, 10);

    const [appointmentsRes, servicesRes, professionalsRes, linksRes, schedulesRes, blockedRes] = await Promise.all([
      supabase
        .from("agendamentos")
        .select("id,funcionario,cliente,data,hora,status,servico,obs")
        .gte("data", today)
        .in("status", ["Agendado", "Confirmado"])
        .order("data", { ascending: true }),
      supabase.from("servicos").select("id,nome,categoria,valor,foto,tempo").eq("ativo", "Sim").order("id", { ascending: true }),
      supabase.from("usuarios").select("id,nome,email,telefone,foto,ativo,atendimento,intervalo").eq("ativo", "Sim").eq("atendimento", "Sim").order("nome", { ascending: true }),
      supabase.from("servicos_func").select("id,funcionario,servico"),
      supabase.from("dias").select("id,dia,funcionario,inicio,final,inicio_almoco,final_almoco").gt("funcionario", 0),
      supabase.from("dias_bloqueio").select("id,data,funcionario").gte("data", today),
    ]);

    appointments = (appointmentsRes.data ?? []) as AppointmentRow[];
    services = (servicesRes.data ?? []) as ServiceRow[];
    professionals = (professionalsRes.data ?? []) as ProfessionalRow[];
    serviceLinks = (linksRes.data ?? []) as ServiceProfessionalRow[];
    schedules = (schedulesRes.data ?? []) as ScheduleRow[];
    blockedDays = (blockedRes.data ?? []) as BlockedDayRow[];
  }

  return (
    <BookingWizard
      services={services}
      professionals={professionals}
      serviceLinks={serviceLinks}
      schedules={schedules}
      blockedDays={blockedDays}
      preselectedServiceId={preselectedServiceId}
      appointments={appointments}
    />
  );
}
