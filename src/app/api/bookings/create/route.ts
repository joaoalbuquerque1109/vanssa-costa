import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { phoneToWhatsApp } from "@/lib/utils";

type CreateBookingPayload = {
  serviceId: number;
  professionalId: number;
  customerId?: number | null;
  date: string;
  time: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  obs?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as CreateBookingPayload;
  const serviceId = Number(body.serviceId);
  const professionalId = Number(body.professionalId);
  const explicitCustomerId = body.customerId ? Number(body.customerId) : null;
  const date = body.date;
  const time = body.time;
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const telefone = String(body.telefone ?? "").trim();
  const cpfDigits = String(body.cpf ?? "").replace(/\D/g, "");
  const dataNascimento = String(body.dataNascimento ?? "").trim();

  if (!serviceId || !professionalId || !date || !time || !nome || !email || !telefone || cpfDigits.length !== 11 || !dataNascimento) {
    return NextResponse.json({ error: "Dados de agendamento inválidos." }, { status: 400 });
  }

  const blockedRes = await supabase
    .from("dias_bloqueio")
    .select("id,funcionario")
    .eq("data", date)
    .in("funcionario", [0, professionalId]);

  if (blockedRes.error) {
    return NextResponse.json({ error: "Não foi possível validar disponibilidade." }, { status: 500 });
  }

  const hasHoliday = (blockedRes.data ?? []).some((row) => Number(row.funcionario) === 0);
  if (hasHoliday) {
    return NextResponse.json({ error: "Não atendemos nesta data (feriado)." }, { status: 409 });
  }

  const hasVacation = (blockedRes.data ?? []).some((row) => Number(row.funcionario) === professionalId);
  if (hasVacation) {
    return NextResponse.json({ error: "Profissional indisponível nesta data (férias/folga)." }, { status: 409 });
  }

  const schedulesRes = await supabase
    .from("dias")
    .select("dia,inicio,final,inicio_almoco,final_almoco")
    .eq("funcionario", professionalId);

  if (schedulesRes.error) {
    return NextResponse.json({ error: "Não foi possível validar horário do profissional." }, { status: 500 });
  }

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const weekdayMap = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
  const weekday = weekdayMap[new Date(`${date}T00:00:00`).getDay()];
  const targetSchedule = (schedulesRes.data ?? []).find((row) => normalize(String(row.dia ?? "")) === normalize(weekday));

  if (!targetSchedule) {
    return NextResponse.json({ error: "Este profissional não trabalha neste dia." }, { status: 409 });
  }

  const serviceRes = await supabase
    .from("servicos")
    .select("id,nome,tempo")
    .eq("id", serviceId)
    .maybeSingle<{ id: number; nome: string; tempo: number }>();

  if (serviceRes.error || !serviceRes.data?.id || !serviceRes.data?.tempo) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  const toMinutes = (isoTime: string) => {
    const [hour, minute] = isoTime.slice(0, 5).split(":").map(Number);
    return hour * 60 + minute;
  };

  const startMinutes = toMinutes(time);
  const serviceDurationMinutes = Number(serviceRes.data.tempo);
  const endMinutes = startMinutes + serviceDurationMinutes;
  const shiftStartMinutes = toMinutes(String(targetSchedule.inicio));
  const shiftEndMinutes = toMinutes(String(targetSchedule.final));

  if (startMinutes < shiftStartMinutes || endMinutes > shiftEndMinutes) {
    return NextResponse.json({ error: "Horário fora da jornada do profissional." }, { status: 409 });
  }

  const lunchStart = String(targetSchedule.inicio_almoco ?? "00:00:00");
  const lunchEnd = String(targetSchedule.final_almoco ?? "00:00:00");
  if (lunchStart !== "00:00:00" && lunchEnd !== "00:00:00") {
    const lunchStartMinutes = toMinutes(lunchStart);
    const lunchEndMinutes = toMinutes(lunchEnd);
    const overlapsLunch = startMinutes < lunchEndMinutes && endMinutes > lunchStartMinutes;
    if (overlapsLunch) {
      return NextResponse.json({ error: "Horário indisponível: pausa de almoço do profissional." }, { status: 409 });
    }
  }

  const existingAppointments = await supabase
    .from("agendamentos")
    .select("id,hora,status,servicos(tempo)")
    .eq("funcionario", professionalId)
    .eq("data", date)
    .neq("status", "Cancelado");

  if (existingAppointments.error) {
    return NextResponse.json({ error: "Não foi possível validar conflitos deste horário." }, { status: 500 });
  }

  const gapMinutes = 15;
  const conflictsWithExisting = (existingAppointments.data ?? []).some((appointment) => {
    const service = Array.isArray(appointment.servicos) ? appointment.servicos[0] : appointment.servicos;
    const existingDurationMinutes = Number(service?.tempo ?? 30);
    const existingStartMinutes = toMinutes(String(appointment.hora));
    const existingEndMinutes = existingStartMinutes + existingDurationMinutes;

    return startMinutes < existingEndMinutes + gapMinutes && endMinutes + gapMinutes > existingStartMinutes;
  });

  if (conflictsWithExisting) {
    return NextResponse.json(
      { error: "Este horário conflita com outro atendimento ou com o intervalo mínimo de 15 minutos." },
      { status: 409 },
    );
  }

  let customerId = explicitCustomerId;
  if (customerId) {
    const customerById = await supabase.from("clientes").select("id").eq("id", customerId).maybeSingle<{ id: number }>();
    if (customerById.error || !customerById.data?.id) {
      return NextResponse.json({ error: "Cliente selecionado não encontrado." }, { status: 404 });
    }
  } else {
    const existingCustomer = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf", cpfDigits)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (existingCustomer.error) {
      return NextResponse.json({ error: "Não foi possível validar o cadastro do cliente." }, { status: 500 });
    }
    customerId = existingCustomer.data?.id ?? null;
  }

  if (customerId) {
    const customerUpdate = await supabase
      .from("clientes")
      .update({
        nome,
        email,
        telefone,
        data_nasc: dataNascimento,
      })
      .eq("id", customerId);

    if (customerUpdate.error) {
      return NextResponse.json({ error: "Não foi possível atualizar os dados do cliente." }, { status: 500 });
    }
  } else {
    const customerInsert = await supabase
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

    if (customerInsert.error || !customerInsert.data?.id) {
      return NextResponse.json({ error: "Não foi possível cadastrar o cliente para o agendamento." }, { status: 500 });
    }

    customerId = customerInsert.data.id;
  }

  const bookingInsert = await supabase
    .from("agendamentos")
    .insert({
      funcionario: professionalId,
      cliente: customerId,
      data: date,
      hora: `${time}:00`,
      obs: body.obs?.trim() || null,
      servico: serviceId,
      phone: telefone,
      status: "Agendado",
    })
    .select("id,status")
    .single<{ id: number; status: string }>();

  if (bookingInsert.error || !bookingInsert.data?.id) {
    if (bookingInsert.error?.code === "23505") {
      return NextResponse.json({ error: "Este horário acabou de ser reservado. Selecione outro horário." }, { status: 409 });
    }
    return NextResponse.json({ error: "Não foi possível concluir o agendamento." }, { status: 500 });
  }

  const configRes = await supabase
    .from("config")
    .select("telefone_whatsapp")
    .limit(1)
    .maybeSingle<{ telefone_whatsapp: string }>();

  const whatsappNumber = String(configRes.data?.telefone_whatsapp ?? "").trim() || "(83) 98751-6023";
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
  const whatsappText = [
    "Olá! Acabei de realizar um agendamento.",
    `Nome: ${nome}`,
    `Serviço: ${serviceRes.data.nome}`,
    `Horário: ${formattedDate} às ${time}`,
  ].join("\n");

  return NextResponse.json({
    ok: true,
    bookingId: bookingInsert.data.id,
    status: bookingInsert.data.status,
    whatsappRedirect: `${phoneToWhatsApp(whatsappNumber)}&text=${encodeURIComponent(whatsappText)}`,
  });
}
