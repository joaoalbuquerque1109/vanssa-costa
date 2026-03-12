import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPortalSession } from "@/lib/portal";

type AppointmentRow = {
  id: number;
  data: string;
  hora: string;
  status: string;
  obs: string | null;
  funcionario: number;
  cliente: number;
  servico: number;
  clientes: { nome: string } | { nome: string }[] | null;
  usuarios: { nome: string } | { nome: string }[] | null;
  servicos: { nome: string; valor: number } | { nome: string; valor: number }[] | null;
};

export async function GET() {
  const session = await getPortalSession();
  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador")) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  let query = supabase
    .from("agendamentos")
    .select("id,data,hora,status,obs,funcionario,cliente,servico,clientes(nome),usuarios(nome),servicos(nome,valor)")
    .order("data", { ascending: false })
    .order("hora", { ascending: false });

  if (session.profile.role === "funcionario" && session.profile.usuario_id) {
    query = query.eq("funcionario", session.profile.usuario_id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar agendamentos." }, { status: 500 });
  }

  const appointments = ((data ?? []) as AppointmentRow[]).map((item) => {
    const client = Array.isArray(item.clientes) ? item.clientes[0] : item.clientes;
    const professional = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
    const service = Array.isArray(item.servicos) ? item.servicos[0] : item.servicos;

    return {
      id: item.id,
      clientId: item.cliente,
      date: item.data,
      time: item.hora?.slice(0, 5),
      professionalId: item.funcionario,
      status: item.status,
      notes: item.obs,
      clientName: client?.nome ?? "Cliente",
      professionalName: professional?.nome ?? "Profissional",
      serviceName: service?.nome ?? "Serviço",
      serviceValue: Number(service?.valor ?? 0),
    };
  });

  return NextResponse.json({ appointments });
}
