
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppointmentRow, ProfessionalRow, ServiceProfessionalRow, ServiceRow, ScheduleRow, BlockedDayRow } from "@/types/site";
import { currency, profileImageSrc, serviceImageSrc, toTimeLabel } from "@/lib/utils";
import { getAvailableSlots, getProfessionalsForService, withAppointmentDurations } from "@/lib/booking";
import Image from "next/image";

type Props = {
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  serviceLinks: ServiceProfessionalRow[];
  schedules: ScheduleRow[];
  blockedDays: BlockedDayRow[];
  appointments?: AppointmentRow[];
  preselectedServiceId?: number;
};

type CustomerSuggestion = {
  id: number;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  data_nasc: string | null;
};

export function BookingWizard({
  services,
  professionals,
  serviceLinks,
  schedules,
  blockedDays,
  appointments = [],
  preselectedServiceId,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(preselectedServiceId ?? null);
  const [professionalId, setProfessionalId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<string>("");
  const [customer, setCustomer] = useState({ nome: "", telefone: "", email: "", cpf: "", dataNascimento: "", obs: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [submitState, setSubmitState] = useState<{ loading: boolean; success: string | null; error: string | null }>({
    loading: false,
    success: null,
    error: null,
  });

  const selectedService = services.find((service) => Number(service.id) === Number(serviceId));
  const selectedProfessional = professionals.find((professional) => Number(professional.id) === Number(professionalId));

  const availableProfessionals = useMemo(
    () => (serviceId ? getProfessionalsForService(serviceId, professionals, serviceLinks) : []),
    [serviceId, professionals, serviceLinks],
  );

  const slotsState = useMemo(() => {
    if (!serviceId || !professionalId || !selectedService) return { error: null, slots: [] };
    return getAvailableSlots({
      date,
      professionalId,
      serviceId,
      serviceDuration: Number(selectedService.tempo),
      professionals,
      schedules,
      blockedDays,
      appointments: withAppointmentDurations(
        appointments.filter(
          (appointment) => appointment.data === date && Number(appointment.funcionario) === Number(professionalId),
        ),
        services,
      ),
    });
  }, [appointments, blockedDays, date, professionalId, professionals, schedules, selectedService, serviceId, services]);
  const customerSearchQuery = useMemo(() => {
    const cpfDigits = customer.cpf.replace(/\D/g, "");
    if (cpfDigits.length >= 3) return cpfDigits;
    const nameQuery = customer.nome.trim();
    if (nameQuery.length >= 2) return nameQuery;
    return "";
  }, [customer.cpf, customer.nome]);

  useEffect(() => {
    if (step !== 4 || !customerSearchQuery) {
      setCustomerSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(customerSearchQuery)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { customers?: CustomerSuggestion[] };
        setCustomerSuggestions(data.customers ?? []);
      } catch {
        setCustomerSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, step]);

  const canAdvance = () => {
    if (step === 1) return Boolean(serviceId);
    if (step === 2) return Boolean(professionalId);
    if (step === 3) return Boolean(slot);
    return Boolean(customer.nome && customer.telefone && customer.email && customer.cpf && customer.dataNascimento);
  };

  const confirmBooking = async () => {
    if (!serviceId || !professionalId || !date || !slot) return;

    setSubmitState({ loading: true, success: null, error: null });

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId,
          professionalId,
          customerId: selectedCustomerId,
          date,
          time: slot,
          nome: customer.nome,
          telefone: customer.telefone,
          email: customer.email,
          cpf: customer.cpf,
          dataNascimento: customer.dataNascimento,
          obs: customer.obs,
        }),
      });

      const data = (await response.json()) as { error?: string; paymentRedirect?: string };

      if (!response.ok) {
        setSubmitState({
          loading: false,
          success: null,
          error: data.error ?? "Não foi possível confirmar o agendamento.",
        });
        return;
      }

      setSubmitState({
        loading: false,
        success: "Pagamento iniciado. Seu agendamento sera salvo apos a confirmacao do pagamento.",
        error: null,
      });

      if (data.paymentRedirect) {
        setTimeout(() => {
          router.push(data.paymentRedirect as string);
          router.refresh();
        }, 900);
      }
    } catch {
      setSubmitState({
        loading: false,
        success: null,
        error: "Erro inesperado ao confirmar agendamento.",
      });
    }
  };

  return (
    <section className="section-padding bg-[#292929] text-white">
      <div className="container-shell">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-slate-950/20 p-6 shadow-soft backdrop-blur md:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold md:text-4xl">Agendamentos</h1>
            <p className="mt-3 text-white/70">Siga as etapas abaixo para agendar seu atendimento.</p>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3 md:gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className={`step-pill ${step >= item ? "border-brand-500 bg-brand-500 text-white" : "border-white/30 text-white/60"}`}>
                  {item}
                </div>
                <span className="text-sm font-medium text-white/70">
                  {item === 1 ? "Serviço" : item === 2 ? "Profissional" : item === 3 ? "Data e Hora" : "Seus Dados"}
                </span>
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold">Escolha o Serviço Desejado</h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setServiceId(service.id);
                      setProfessionalId(null);
                      setSlot("");
                    }}
                    className={`overflow-hidden rounded-[28px] border text-left transition ${
                      serviceId === service.id ? "border-brand-500 bg-white text-slate-900" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={serviceImageSrc(service.foto)} alt={service.nome} fill className="object-cover" />
                    </div>
                    <div className="space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{service.nome}</h3>
                        <span className="text-sm">{service.tempo} min</span>
                      </div>
                      <p className={`${serviceId === service.id ? "text-brand-700" : "text-brand-100"} font-bold`}>
                        {currency(Number(service.valor))}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="mb-6 text-center text-2xl font-semibold">Escolha o Profissional</h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {availableProfessionals.map((professional) => (
                  <button
                    key={professional.id}
                    type="button"
                    onClick={() => {
                      setProfessionalId(professional.id);
                      setSlot("");
                    }}
                    className={`rounded-[28px] border p-5 text-left transition ${
                      professionalId === professional.id ? "border-brand-500 bg-white text-slate-900" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-200">
                        <Image
                          src={profileImageSrc(professional.foto)}
                          alt={professional.nome}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">{professional.nome}</h3>
                        <p className="text-sm opacity-70">Intervalo: {professional.intervalo} min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {!availableProfessionals.length ? (
                <p className="mt-6 text-center text-sm text-red-200">Nenhum profissional disponível para este serviço.</p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <h2 className="mb-6 text-center text-2xl font-semibold">Escolha a Data e Horário</h2>
                <input
                  type="date"
                  className="form-field text-slate-900"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlot("");
                  }}
                />
                <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-4">
                  {slotsState.error ? (
                    <p className="text-sm text-red-200">{slotsState.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {slotsState.slots.map((availableSlot) => (
                        <button
                          key={availableSlot}
                          type="button"
                          onClick={() => setSlot(availableSlot)}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            slot === availableSlot ? "bg-brand-500 text-white" : "bg-white/5 text-white/80 hover:bg-white/10"
                          }`}
                        >
                          {toTimeLabel(`${availableSlot}:00`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold">Resumo da Reserva</h3>
                <div className="mt-6 space-y-3 text-sm text-white/70">
                  <p><strong className="text-white">Serviço:</strong> {selectedService?.nome ?? "Nenhum serviço selecionado"}</p>
                  <p><strong className="text-white">Profissional:</strong> {selectedProfessional?.nome ?? "Nenhum profissional selecionado"}</p>
                  <p><strong className="text-white">Horário:</strong> {slot || "Nenhum horário selecionado"}</p>
                </div>
              </aside>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-center text-2xl font-semibold">Seus Dados</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="form-field"
                  placeholder="Nome"
                  value={customer.nome}
                  onChange={(e) => {
                    setSelectedCustomerId(null);
                    setCustomer({ ...customer, nome: e.target.value });
                  }}
                />
                <input
                  className="form-field"
                  placeholder="Telefone"
                  value={customer.telefone}
                  onChange={(e) => {
                    setSelectedCustomerId(null);
                    setCustomer({ ...customer, telefone: e.target.value });
                  }}
                />
                <input
                  className="form-field"
                  placeholder="E-mail"
                  type="email"
                  value={customer.email}
                  onChange={(e) => {
                    setSelectedCustomerId(null);
                    setCustomer({ ...customer, email: e.target.value });
                  }}
                />
                <input
                  className="form-field"
                  placeholder="CPF"
                  value={customer.cpf}
                  onChange={(e) => {
                    setSelectedCustomerId(null);
                    setCustomer({ ...customer, cpf: e.target.value });
                  }}
                />
                {customerSuggestions.length ? (
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">Clientes encontrados</p>
                    <div className="space-y-2">
                      {customerSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm transition hover:bg-white/10"
                          onClick={() => {
                            setSelectedCustomerId(suggestion.id);
                            setCustomer((prev) => ({
                              ...prev,
                              nome: suggestion.nome ?? prev.nome,
                              cpf: suggestion.cpf ?? prev.cpf,
                              telefone: suggestion.telefone ?? prev.telefone,
                              email: suggestion.email ?? prev.email,
                              dataNascimento: suggestion.data_nasc ?? prev.dataNascimento,
                            }));
                            setCustomerSuggestions([]);
                          }}
                        >
                          <strong className="text-white">{suggestion.nome}</strong>{" "}
                          <span className="text-white/70">CPF: {suggestion.cpf}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <input
                  className="form-field md:col-span-2"
                  placeholder="Data de nascimento"
                  type="date"
                  value={customer.dataNascimento}
                  onChange={(e) => {
                    setSelectedCustomerId(null);
                    setCustomer({ ...customer, dataNascimento: e.target.value });
                  }}
                />
                <textarea className="form-field md:col-span-2 min-h-32" placeholder="Observações" value={customer.obs} onChange={(e) => setCustomer({ ...customer, obs: e.target.value })} />
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                Informe seus dados para seguir ao pagamento. O horario sera confirmado apos aprovacao do pagamento.
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Anterior
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => canAdvance() && setStep((current) => Math.min(4, current + 1))}
                className="legacy-button disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canAdvance()}
              >
                Próximo
              </button>
            ) : (
              <button type="button" className="legacy-button" disabled={!canAdvance() || submitState.loading} onClick={confirmBooking}>
                {submitState.loading ? "Confirmando..." : "Finalizar agendamento"}
              </button>
            )}
          </div>
          {submitState.success ? <p className="mt-4 text-sm text-emerald-200">{submitState.success}</p> : null}
          {submitState.error ? <p className="mt-4 text-sm text-red-200">{submitState.error}</p> : null}
        </div>
      </div>
    </section>
  );
}


