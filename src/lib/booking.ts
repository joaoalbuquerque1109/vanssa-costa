
import type { AppointmentRow, BlockedDayRow, ProfessionalRow, ScheduleRow, ServiceProfessionalRow, ServiceRow } from "@/types/site";
import { toTimeLabel, weekDayMap } from "@/lib/utils";

type AppointmentWithDuration = AppointmentRow & { durationMinutes: number };
const SLOT_STEP_MINUTES = 15;
const APPOINTMENT_GAP_MINUTES = 15;

function normalizeDayLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toLocalTimeString(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

export function getProfessionalsForService(
  serviceId: number,
  professionals: ProfessionalRow[],
  links: ServiceProfessionalRow[],
) {
  const allowed = new Set(
    links.filter((link) => Number(link.servico) === Number(serviceId)).map((link) => Number(link.funcionario)),
  );
  return professionals.filter((professional) => allowed.has(Number(professional.id)));
}

function combineDateTime(dateISO: string, timeISO: string) {
  return new Date(`${dateISO}T${timeISO}`);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getAvailableSlots(params: {
  date: string;
  professionalId: number;
  serviceId: number;
  serviceDuration: number;
  professionals: ProfessionalRow[];
  schedules: ScheduleRow[];
  blockedDays: BlockedDayRow[];
  appointments: AppointmentWithDuration[];
}) {
  const { date, professionalId, serviceDuration, professionals, schedules, blockedDays, appointments } = params;
  const today = new Date();
  const targetDate = new Date(`${date}T00:00:00`);
  if (targetDate < new Date(today.toISOString().slice(0, 10) + "T00:00:00")) {
    return { error: "Escolha uma data igual ou maior que hoje.", slots: [] as string[] };
  }

  const hasGeneralBlock = blockedDays.some((blocked) => blocked.funcionario === 0 && blocked.data === date);
  if (hasGeneralBlock) return { error: "Não estaremos funcionando nesta data.", slots: [] as string[] };

  const hasProfessionalBlock = blockedDays.some(
    (blocked) => Number(blocked.funcionario) === Number(professionalId) && blocked.data === date,
  );
  if (hasProfessionalBlock) {
    return {
      error: "Este profissional não irá trabalhar nesta data. Selecione outra data ou outro profissional.",
      slots: [] as string[],
    };
  }

  const weekDay = weekDayMap[targetDate.getDay()];
  const schedule = schedules.find(
    (item) => Number(item.funcionario) === Number(professionalId) && normalizeDayLabel(item.dia) === normalizeDayLabel(weekDay),
  );

  if (!schedule) {
    return { error: "Este profissional não trabalha neste dia.", slots: [] as string[] };
  }

  const professional = professionals.find((item) => Number(item.id) === Number(professionalId));
  if (!professional) return { error: "Profissional não encontrado.", slots: [] as string[] };

  const slots: string[] = [];
  let cursor = combineDateTime(date, schedule.inicio);
  const end = combineDateTime(date, schedule.final);
  const lunchStart = schedule.inicio_almoco ? combineDateTime(date, schedule.inicio_almoco) : null;
  const lunchEnd = schedule.final_almoco ? combineDateTime(date, schedule.final_almoco) : null;

  while (cursor < end) {
    const slotStart = new Date(cursor);
    const slotEnd = addMinutes(slotStart, serviceDuration);

    const isPast =
      date === today.toISOString().slice(0, 10) && slotStart <= new Date();

    const endsAfterShift = slotEnd > end;
    const overlapsLunch =
      lunchStart && lunchEnd ? slotStart < lunchEnd && slotEnd > lunchStart : false;

    const overlapsAppointment = appointments.some((appointment) => {
      const appointmentStart = combineDateTime(appointment.data, appointment.hora);
      const appointmentEnd = addMinutes(appointmentStart, appointment.durationMinutes);
      return slotStart < addMinutes(appointmentEnd, APPOINTMENT_GAP_MINUTES) && addMinutes(slotEnd, APPOINTMENT_GAP_MINUTES) > appointmentStart;
    });

    if (!isPast && !endsAfterShift && !overlapsLunch && !overlapsAppointment) {
      slots.push(toTimeLabel(toLocalTimeString(slotStart)));
    }

    cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
  }

  return { error: null, slots };
}

export function withAppointmentDurations(
  appointments: AppointmentRow[],
  services: ServiceRow[],
): AppointmentWithDuration[] {
  const durationByService = new Map(services.map((service) => [Number(service.id), Number(service.tempo)]));
  return appointments.map((appointment) => ({
    ...appointment,
    durationMinutes: durationByService.get(Number(appointment.servico)) ?? 30,
  }));
}
