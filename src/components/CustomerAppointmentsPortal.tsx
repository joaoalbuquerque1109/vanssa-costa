"use client";

import { useEffect, useMemo, useState } from "react";
import { currency } from "@/lib/utils";

type AppointmentItem = {
  id: number;
  date: string;
  time: string;
  status: string;
  serviceName: string;
  value: number;
};

export function CustomerAppointmentsPortal() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/portal/customer-appointments", { cache: "no-store" });
        const data = (await response.json()) as { appointments?: AppointmentItem[]; error?: string };

        if (!response.ok) {
          setError(data.error ?? "Falha ao carregar agendamentos.");
          return;
        }

        setAppointments(data.appointments ?? []);
      } catch {
        setError("Erro inesperado ao carregar agendamentos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalSpent = useMemo(
    () => appointments.reduce((acc, appointment) => acc + Number(appointment.value || 0), 0),
    [appointments],
  );

  if (loading) {
    return <div className="rounded-[32px] bg-white p-8 shadow-soft">Carregando seus agendamentos...</div>;
  }

  if (error) {
    return <div className="rounded-[32px] bg-white p-8 text-red-600 shadow-soft">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-slate-900">Meus agendamentos</h2>
        <p className="mt-2 text-slate-600">Total em agendamentos: {currency(totalSpent)}</p>
      </div>

      <div className="overflow-hidden rounded-[32px] bg-white shadow-soft">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Data</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Serviço</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {appointments.length ? (
              appointments.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-slate-700">{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{item.time}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{item.serviceName}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-brand-700">{currency(item.value)}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{item.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                  Nenhum agendamento encontrado para este cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
