"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { currency, productImageSrc, serviceImageSrc } from "@/lib/utils";
import { BarChart3, CalendarDays, CircleDollarSign, Layers, PanelLeft, PanelLeftClose, Pencil, ShoppingBag, Trash2, Users, X } from "lucide-react";
import Image from "next/image";
import { PortalSignOutButton } from "@/components/PortalSignOutButton";

type Role = "funcionario" | "administrador";
type Range = "day" | "week" | "month" | "quarter" | "semester" | "year" | "custom";
type PanelSection = "overview" | "catalog" | "profile" | "schedule" | "appointments" | "myAgenda" | "employees" | "customers" | "plans" | "finance";

type DashboardData = {
  dateRange: { from: string; to: string };
  popularServices: Array<{ serviceId: number; name: string; total: number }>;
  loggedCustomerGrowth: { currentLogins: number; previousLogins: number; growthRate: number };
  revenue: { year: number; semester: number; quarter: number; month: number; week: number; day: number; selected: number };
  chart: Array<{ label: string; total: number }>;
};

type Service = { id: number; nome: string; foto?: string | null; categoria?: number | null; valor?: number | null; tempo?: number | null; ativo?: string | null };
type ServiceCategory = { id: number; nome: string };
type Product = { id: number; nome: string; foto?: string | null; descricao?: string | null; categoria?: number | null; valor_venda?: number | null; estoque?: number | null };
type Appointment = {
  id: number;
  clientId?: number;
  date: string;
  time: string;
  status: string;
  professionalId?: number;
  clientName: string;
  professionalName: string;
  serviceName: string;
  serviceValue: number;
  notes?: string | null;
};

type DayRow = { dia: string; inicio: string; final: string; inicio_almoco?: string; final_almoco?: string };
type Employee = { id: number; nome: string; email: string; cpf: string; telefone?: string; nivel?: string; ativo?: string };
type Profile = { nome: string; email: string; cpf: string; telefone?: string; endereco?: string };
type ProfessionalItem = { id: number; nome: string };
type BlockedDayItem = { id: number; data: string; funcionario?: number | null };
type Customer = { id: number; nome: string; cpf: string; telefone?: string | null; email?: string | null; data_nasc?: string | null };
type SidebarLink = { key: PanelSection; label: string };
type FinancePaymentRow = {
  id: number;
  cliente_nome: string;
  cliente_cpf: string;
  data_reserva: string;
  servico_nome: string;
  valor: number;
  tipo_pagamento?: string | null;
  sucesso: boolean;
  status_pagamento: string;
};
type PlanPaymentRow = {
  id: number;
  cliente_nome: string;
  cliente_cpf: string;
  servico_nome: string;
  created_at: string;
  sucesso: boolean;
};

const RANGE_LABELS: Record<Range, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Ano",
  custom: "Customizado",
};

const SECTION_TITLES: Record<PanelSection, string> = {
  overview: "Dashboard",
  catalog: "Catálogo",
  profile: "Perfil",
  schedule: "Horários",
  appointments: "Agendamentos",
  myAgenda: "Minha agenda",
  employees: "Funcionários",
  customers: "Clientes",
  plans: "Planos",
  finance: "Financeiro",
};

const DEFAULT_WORK_DAYS: DayRow[] = [
  { dia: "Segunda-Feira", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Terça-Feira", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Quarta-Feira", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Quinta-Feira", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Sexta-Feira", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Sábado", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
  { dia: "Domingo", inicio: "10:00:00", final: "20:00:00", inicio_almoco: "12:00:00", final_almoco: "13:00:00" },
];

function normalizeDay(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function KebabIcon() {
  return (
    <span className="inline-flex flex-col items-center justify-center gap-1" aria-hidden="true">
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
      <span className="h-1 w-1 rounded-full bg-current" />
    </span>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center overflow-y-auto bg-black/40 p-4 sm:p-6" onClick={onClose}>
      <div className="my-4 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-soft sm:my-6 sm:max-h-[calc(100vh-3rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-bold text-slate-900">{title}</h4>
          <button type="button" className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OverviewSection({
  role,
  range,
  setRange,
  dashboard,
  sidebarLinks,
  activeSection,
  setActiveSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  todayAppointments,
  lowStockProducts,
  maxChartValue,
}: {
  role: Role;
  range: Range;
  setRange: (range: Range) => void;
  dashboard: DashboardData | null;
  sidebarLinks: SidebarLink[];
  activeSection: PanelSection;
  setActiveSection: (section: PanelSection) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  todayAppointments: number;
  lowStockProducts: number;
  maxChartValue: number;
}) {
  return (
    <div className="space-y-6">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-brand-700 bg-brand-900 text-white shadow-soft transition-all duration-300 lg:flex lg:flex-col ${sidebarCollapsed ? "w-24" : "w-72"}`}>
        <div className="flex items-center justify-between border-b border-brand-700 px-4 py-4">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? "hidden" : "block"}`}>
            <Image src="/sistema/img/logo.png" alt="Logo Vanessa Costa" width={36} height={36} className="inline-block h-9 w-9 rounded-md object-cover" />
            <div className="inline-block align-middle">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Portal</p>
              <p className="text-base font-bold">Vanessa Costa</p>
            </div>
          </div>
          {sidebarCollapsed ? <Image src="/sistema/img/logo.png" alt="Logo Vanessa Costa" width={24} height={24} className="h-6 w-6 rounded object-cover" /> : null}
          <button
            type="button"
            className="rounded-xl bg-brand-700 p-2 text-white transition hover:bg-brand-500"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Abrir barra lateral" : "Fechar barra lateral"}
          >
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <nav className="space-y-2 p-3">
          {sidebarLinks.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => setActiveSection(link.key)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                activeSection === link.key ? "bg-brand-700 text-white" : "text-white/80 hover:bg-brand-700/60"
              }`}
            >
              {sidebarCollapsed ? (
                link.label.slice(0, 1)
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span>{link.label}</span>
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-brand-700 p-3">
          <PortalSignOutButton variant="dark" />
        </div>
      </aside>

      <div className="space-y-6">
        {activeSection === "overview" ? (
          <section id="overview" className="rounded-[32px] bg-white p-4 shadow-soft md:p-6">
            <div className="flex flex-wrap justify-end gap-2">
              {(Object.keys(RANGE_LABELS) as Range[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${range === item ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {RANGE_LABELS[item]}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {dashboard && activeSection === "overview" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-indigo-100 p-3 text-indigo-600"><Users size={18} /></div>
                  <div><p className="text-sm text-slate-500">Total de clientes</p><p className="text-2xl font-bold text-slate-900">{dashboard.loggedCustomerGrowth.currentLogins}</p></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-sky-100 p-3 text-sky-600"><CalendarDays size={18} /></div>
                  <div><p className="text-sm text-slate-500">Agendamentos hoje</p><p className="text-2xl font-bold text-slate-900">{todayAppointments}</p></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-600"><ShoppingBag size={18} /></div>
                  <div><p className="text-sm text-slate-500">Estoque baixo</p><p className="text-2xl font-bold text-slate-900">{lowStockProducts}</p></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-3 text-emerald-600"><CircleDollarSign size={18} /></div>
                  <div><p className="text-sm text-slate-500">Saldo do dia</p><p className="text-2xl font-bold text-slate-900">{currency(dashboard.revenue.day)}</p></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-pink-100 p-3 text-pink-600"><BarChart3 size={18} /></div>
                  <div><p className="text-sm text-slate-500">Recebido no período</p><p className="text-2xl font-bold text-slate-900">{currency(dashboard.revenue.selected)}</p></div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm text-slate-500">Crescimento de logins</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">{dashboard.loggedCustomerGrowth.growthRate.toFixed(1)}%</p>
                  <div className="h-16 w-16 rounded-full" style={{ background: `conic-gradient(#22c55e ${Math.max(0, Math.min(100, dashboard.loggedCustomerGrowth.growthRate))}%, #e2e8f0 0)` }} />
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm text-slate-500">Serviços populares</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-2xl font-bold text-slate-900">{dashboard.popularServices.length}</p>
                  <div className="h-16 w-16 rounded-full" style={{ background: `conic-gradient(#3b82f6 ${Math.min(100, dashboard.popularServices.length * 20)}%, #e2e8f0 0)` }} />
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm text-slate-500">Período</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{dashboard.dateRange.from} até {dashboard.dateRange.to}</p>
                  <div className="rounded-full bg-slate-100 p-3 text-slate-600"><Layers size={18} /></div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-8 shadow-soft">
              <h3 className="text-xl font-bold text-slate-900">Demonstrativo financeiro</h3>
              <div className="mt-6 space-y-3">
                {dashboard.chart.map((point) => (
                  <div key={point.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500"><span>{point.label}</span><span>{currency(point.total)}</span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(point.total / maxChartValue) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function EmployeeDashboard({ role }: { role: Role }) {
  const [activeSection, setActiveSection] = useState<PanelSection>(role === "administrador" ? "overview" : "profile");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [range, setRange] = useState<Range>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [myDays, setMyDays] = useState<DayRow[]>(DEFAULT_WORK_DAYS);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [blockedDays, setBlockedDays] = useState<BlockedDayItem[]>([]);
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().slice(0, 10));
  const [agendaEmployeeId, setAgendaEmployeeId] = useState<number>(0);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().slice(0, 10));
  const [vacationFrom, setVacationFrom] = useState(new Date().toISOString().slice(0, 10));
  const [vacationTo, setVacationTo] = useState(new Date().toISOString().slice(0, 10));

  const [profile, setProfile] = useState<Profile>({ nome: "", email: "", cpf: "", telefone: "", endereco: "" });
  const [newPassword, setNewPassword] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const [catalogFeedback, setCatalogFeedback] = useState<string | null>(null);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogModal, setCatalogModal] = useState<null | { type: "service" | "product"; mode: "create" | "edit"; id?: number }>(null);
  const [serviceForm, setServiceForm] = useState({ nome: "", categoriaNome: "", valor: "0", tempo: "30", ativo: "Sim", fotoFile: null as File | null });
  const [productForm, setProductForm] = useState({ nome: "", descricao: "", categoria: "", valor_venda: "0", estoque: "0", fotoFile: null as File | null });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeLinks, setEmployeeLinks] = useState<Array<{ funcionario: number; servico: number }>>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointmentCustomerFilter, setAppointmentCustomerFilter] = useState<number>(0);
  const [financeRows, setFinanceRows] = useState<FinancePaymentRow[]>([]);
  const [planRows, setPlanRows] = useState<PlanPaymentRow[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({ public_key_mp: "", access_token_mp: "" });
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false);
  const [paymentSettingsFeedback, setPaymentSettingsFeedback] = useState<string | null>(null);

  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState(false);
  const [showUpdateEmployeeModal, setShowUpdateEmployeeModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [employeeUpdateSaving, setEmployeeUpdateSaving] = useState(false);
  const [employeeUpdateFeedback, setEmployeeUpdateFeedback] = useState<string | null>(null);
  const [employeeListFeedback, setEmployeeListFeedback] = useState<string | null>(null);
  const [employeeDeleteSavingId, setEmployeeDeleteSavingId] = useState<number | null>(null);
  const [employeeCreateSaving, setEmployeeCreateSaving] = useState(false);
  const [employeeCreateFeedback, setEmployeeCreateFeedback] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    serviceIds: [] as number[],
  });
  const [newEmployee, setNewEmployee] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    serviceIds: [] as number[],
    days: DEFAULT_WORK_DAYS.map((day) => ({ ...day })) as DayRow[],
  });

  const maxChartValue = useMemo(() => Math.max(1, ...(dashboard?.chart.map((item) => item.total) ?? [0])), [dashboard]);
  const serviceNameById = useMemo(() => new Map(services.map((service) => [service.id, service.nome])), [services]);
  const categoryNameById = useMemo(() => new Map(serviceCategories.map((category) => [category.id, category.nome])), [serviceCategories]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayAppointments = useMemo(() => appointments.filter((appointment) => appointment.date === todayIso).length, [appointments, todayIso]);
  const lowStockProducts = useMemo(() => products.filter((product) => Number(product.estoque ?? 0) <= 5).length, [products]);
  const filteredAppointments = useMemo(
    () =>
      appointmentCustomerFilter
        ? appointments.filter((appointment) => Number(appointment.clientId ?? 0) === Number(appointmentCustomerFilter))
        : appointments,
    [appointments, appointmentCustomerFilter],
  );
  const sidebarLinks: SidebarLink[] =
    role === "administrador"
      ? [
          { key: "overview", label: "Visão geral" },
          { key: "catalog", label: "Catálogo" },
          { key: "profile", label: "Perfil" },
          { key: "schedule", label: "Horários" },
          { key: "myAgenda", label: "Minha agenda" },
          { key: "appointments", label: "Agendamentos" },
          { key: "employees", label: "Funcionários" },
          { key: "customers", label: "Clientes" },
          { key: "plans", label: "Planos" },
          { key: "finance", label: "Financeiro" },
        ]
      : [
          { key: "profile", label: "Perfil" },
          { key: "schedule", label: "Horários" },
          { key: "myAgenda", label: "Minha agenda" },
          { key: "appointments", label: "Agendamentos" },
        ];
  const employeeServicesById = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const link of employeeLinks) {
      const serviceName = serviceNameById.get(link.servico);
      if (!serviceName) continue;

      const current = map.get(link.funcionario) ?? [];
      current.push(serviceName);
      map.set(link.funcionario, current);
    }
    return map;
  }, [employeeLinks, serviceNameById]);
  const currentSectionTitle = SECTION_TITLES[activeSection];
  const agendaProfessionals = role === "administrador" ? professionals : professionals.filter((item) => Number(item.id) === Number(agendaEmployeeId || item.id));
  const agendaTimes = useMemo(() => {
    const times: string[] = [];
    for (let hour = 7; hour <= 20; hour += 1) {
      for (const minute of [0, 30]) {
        if (hour === 20 && minute > 0) continue;
        times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
      }
    }
    return times;
  }, []);
  const blockedByEmployeeAndDate = useMemo(
    () => new Set(blockedDays.map((item) => `${item.data}::${Number(item.funcionario ?? 0)}`)),
    [blockedDays],
  );

  const appointmentsBySlot = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const item of appointments) {
      if (item.date !== agendaDate) continue;
      const professionalId = Number(item.professionalId ?? 0);
      if (!professionalId) continue;
      map.set(`${professionalId}::${item.time}`, item);
    }
    return map;
  }, [appointments, agendaDate]);
  const selectedAgendaProfessionals = useMemo(() => {
    const filtered = agendaEmployeeId ? agendaProfessionals.filter((item) => Number(item.id) === Number(agendaEmployeeId)) : agendaProfessionals;
    if (filtered.length) return filtered;
    return professionals.length ? [professionals[0]] : [];
  }, [agendaEmployeeId, agendaProfessionals, professionals]);
  const agendaGridColumns = `80px repeat(${Math.max(1, selectedAgendaProfessionals.length)}, minmax(0, 1fr))`;

  const loadDashboard = async () => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    const response = await fetch(`/api/portal/dashboard?${params.toString()}`, { cache: "no-store" });
    if (response.ok) setDashboard((await response.json()) as DashboardData);
  };

  const loadCatalog = async () => {
    const [servicesRes, categoriesRes, productsRes, myScheduleRes, appointmentsRes, profileRes, professionalsRes, blockedDaysRes] = await Promise.all([
      fetch("/api/portal/services", { cache: "no-store" }),
      fetch("/api/portal/service-categories", { cache: "no-store" }),
      fetch("/api/portal/products", { cache: "no-store" }),
      fetch("/api/portal/my-schedule", { cache: "no-store" }),
      fetch("/api/portal/appointments", { cache: "no-store" }),
      fetch("/api/portal/my-profile", { cache: "no-store" }),
      fetch("/api/portal/professionals", { cache: "no-store" }),
      fetch("/api/portal/blocked-days", { cache: "no-store" }),
    ]);

    if (servicesRes.ok) setServices(((await servicesRes.json()) as { services: Service[] }).services ?? []);
    if (categoriesRes.ok) setServiceCategories(((await categoriesRes.json()) as { categories: ServiceCategory[] }).categories ?? []);
    if (productsRes.ok) setProducts(((await productsRes.json()) as { products: Product[] }).products ?? []);

    if (myScheduleRes.ok) {
      const days = ((await myScheduleRes.json()) as { days: DayRow[] }).days ?? [];
      const byDay = new Map(days.map((item) => [normalizeDay(item.dia), item]));
      const merged = DEFAULT_WORK_DAYS.map((day) => {
        const existing = byDay.get(normalizeDay(day.dia));
        return existing
          ? {
              dia: day.dia,
              inicio: existing.inicio ?? day.inicio,
              final: existing.final ?? day.final,
              inicio_almoco: existing.inicio_almoco ?? day.inicio_almoco,
              final_almoco: existing.final_almoco ?? day.final_almoco,
            }
          : { ...day };
      });
      setMyDays(merged);
    }

    if (appointmentsRes.ok) {
      setAppointments(((await appointmentsRes.json()) as { appointments: Appointment[] }).appointments ?? []);
    }

    if (professionalsRes.ok) {
      const data = (await professionalsRes.json()) as { professionals: ProfessionalItem[] };
      const list = data.professionals ?? [];
      setProfessionals(list);
      if (!agendaEmployeeId && list.length) {
        setAgendaEmployeeId(Number(list[0].id));
      }
    }

    if (blockedDaysRes.ok) {
      const data = (await blockedDaysRes.json()) as { blockedDays: BlockedDayItem[] };
      setBlockedDays(data.blockedDays ?? []);
    }

    if (profileRes.ok) {
      const data = (await profileRes.json()) as { profile: Profile };
      setProfile(data.profile);
    }

    if (role === "administrador") {
      const [employeesRes, customersRes, plansRes, financeRes, financeSettingsRes] = await Promise.all([
        fetch("/api/portal/admin/employees", { cache: "no-store" }),
        fetch("/api/portal/customers", { cache: "no-store" }),
        fetch("/api/portal/plans", { cache: "no-store" }),
        fetch("/api/portal/finance", { cache: "no-store" }),
        fetch("/api/portal/finance/settings", { cache: "no-store" }),
      ]);
      if (employeesRes.ok) {
        const data = (await employeesRes.json()) as { employees: Employee[]; links: Array<{ funcionario: number; servico: number }> };
        setEmployees(data.employees ?? []);
        setEmployeeLinks(data.links ?? []);
      }
      if (customersRes.ok) {
        const data = (await customersRes.json()) as { customers: Customer[] };
        setCustomers(data.customers ?? []);
      }
      if (plansRes.ok) {
        const data = (await plansRes.json()) as { rows: PlanPaymentRow[] };
        setPlanRows(data.rows ?? []);
      }
      if (financeRes.ok) {
        const data = (await financeRes.json()) as { rows: FinancePaymentRow[] };
        setFinanceRows(data.rows ?? []);
      }
      if (financeSettingsRes.ok) {
        const data = (await financeSettingsRes.json()) as { settings: { public_key_mp?: string; access_token_mp?: string } };
        setPaymentSettings({
          public_key_mp: data.settings?.public_key_mp ?? "",
          access_token_mp: data.settings?.access_token_mp ?? "",
        });
      }
    }
  };

  const savePaymentSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentSettingsFeedback(null);
    setPaymentSettingsSaving(true);
    try {
      const response = await fetch("/api/portal/finance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setPaymentSettingsFeedback(data.error ?? "Falha ao salvar chaves do Mercado Pago.");
        return;
      }

      setPaymentSettingsFeedback("Chaves do Mercado Pago salvas com sucesso.");
    } catch {
      setPaymentSettingsFeedback("Falha de conexão ao salvar as chaves. Verifique a API e tente novamente.");
    } finally {
      setPaymentSettingsSaving(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    if (!appointmentCustomerFilter) return;
    if (!customers.some((customer) => Number(customer.id) === Number(appointmentCustomerFilter))) {
      setAppointmentCustomerFilter(0);
    }
  }, [appointmentCustomerFilter, customers]);

  const uploadImage = async (file: File, folder: "services" | "products") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/portal/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { publicUrl?: string; error?: string };
    if (!response.ok || !data.publicUrl) {
      throw new Error(data.error ?? "Falha no upload da imagem.");
    }

    return data.publicUrl;
  };

  const saveMySchedule = async () => {
    await fetch("/api/portal/my-schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: myDays }),
    });
    await loadCatalog();
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFeedback(null);

    const response = await fetch("/api/portal/my-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, senha: newPassword || undefined }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setProfileFeedback(data.error ?? "Falha ao salvar perfil.");
      return;
    }

    setNewPassword("");
    setProfileFeedback("Dados atualizados com sucesso.");
    await loadCatalog();
  };

  const openCreateServiceModal = () => {
    setCatalogFeedback(null);
    setServiceForm({ nome: "", categoriaNome: "", valor: "0", tempo: "30", ativo: "Sim", fotoFile: null });
    setCatalogModal({ type: "service", mode: "create" });
  };

  const openEditServiceModal = (service: Service) => {
    setCatalogFeedback(null);
    setServiceForm({
      nome: service.nome,
      categoriaNome: service.categoria ? (categoryNameById.get(service.categoria) ?? "") : "",
      valor: String(service.valor ?? 0),
      tempo: String(service.tempo ?? 30),
      ativo: service.ativo ?? "Sim",
      fotoFile: null,
    });
    setCatalogModal({ type: "service", mode: "edit", id: service.id });
  };

  const openCreateProductModal = () => {
    setCatalogFeedback(null);
    setProductForm({ nome: "", descricao: "", categoria: "", valor_venda: "0", estoque: "0", fotoFile: null });
    setCatalogModal({ type: "product", mode: "create" });
  };

  const openEditProductModal = (product: Product) => {
    setCatalogFeedback(null);
    setProductForm({
      nome: product.nome,
      descricao: product.descricao ?? "",
      categoria: product.categoria ? String(product.categoria) : "",
      valor_venda: String(product.valor_venda ?? 0),
      estoque: String(product.estoque ?? 0),
      fotoFile: null,
    });
    setCatalogModal({ type: "product", mode: "edit", id: product.id });
  };

  const submitServiceModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalogModal || catalogModal.type !== "service") return;

    setCatalogFeedback(null);
    setCatalogSaving(true);

    try {
      const method = catalogModal.mode === "create" ? "POST" : "PUT";
      const url = catalogModal.mode === "create" ? "/api/portal/services" : `/api/portal/services/${catalogModal.id}`;

      let foto: string | undefined;
      if (serviceForm.fotoFile) {
        foto = await uploadImage(serviceForm.fotoFile, "services");
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: serviceForm.nome,
          categoria_nome: serviceForm.categoriaNome || undefined,
          valor: Number(serviceForm.valor),
          tempo: Number(serviceForm.tempo),
          ativo: serviceForm.ativo === "Não" ? "Não" : "Sim",
          ...(foto ? { foto } : {}),
        }),
      });

      const data = (await response.json()) as { error?: string; details?: string };
      if (!response.ok) {
        setCatalogFeedback(data.details ?? data.error ?? "Falha ao salvar serviço.");
        return;
      }

      setCatalogFeedback(catalogModal.mode === "create" ? "Serviço criado com sucesso." : "Serviço atualizado com sucesso.");
      setCatalogModal(null);
      await loadCatalog();
    } catch (error) {
      setCatalogFeedback(error instanceof Error ? error.message : "Falha ao salvar serviço.");
    } finally {
      setCatalogSaving(false);
    }
  };

  const submitProductModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalogModal || catalogModal.type !== "product") return;

    setCatalogFeedback(null);
    setCatalogSaving(true);

    try {
      const method = catalogModal.mode === "create" ? "POST" : "PUT";
      const url = catalogModal.mode === "create" ? "/api/portal/products" : `/api/portal/products/${catalogModal.id}`;

      let foto: string | undefined;
      if (productForm.fotoFile) {
        foto = await uploadImage(productForm.fotoFile, "products");
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: productForm.nome,
          descricao: productForm.descricao,
          categoria: productForm.categoria ? Number(productForm.categoria) : null,
          valor_venda: Number(productForm.valor_venda),
          estoque: Number(productForm.estoque),
          ...(foto ? { foto } : {}),
        }),
      });

      const data = (await response.json()) as { error?: string; details?: string };
      if (!response.ok) {
        setCatalogFeedback(data.details ?? data.error ?? "Falha ao salvar produto.");
        return;
      }

      setCatalogFeedback(catalogModal.mode === "create" ? "Produto criado com sucesso." : "Produto atualizado com sucesso.");
      setCatalogModal(null);
      await loadCatalog();
    } catch (error) {
      setCatalogFeedback(error instanceof Error ? error.message : "Falha ao salvar produto.");
    } finally {
      setCatalogSaving(false);
    }
  };

  const deleteService = async (serviceId: number) => {
    const confirmed = window.confirm("Deseja excluir este serviço?");
    if (!confirmed) return;

    setCatalogFeedback(null);
    const response = await fetch(`/api/portal/services/${serviceId}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string; softDeleted?: boolean };

    if (!response.ok) {
      setCatalogFeedback(data.error ?? "Falha ao excluir serviço.");
      return;
    }

    setCatalogFeedback(data.softDeleted ? "Serviço desativado (há vínculos existentes)." : "Serviço excluído com sucesso.");
    await loadCatalog();
  };

  const deleteProduct = async (productId: number) => {
    const confirmed = window.confirm("Deseja excluir este produto?");
    if (!confirmed) return;

    setCatalogFeedback(null);
    const response = await fetch(`/api/portal/products/${productId}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setCatalogFeedback(data.error ?? "Falha ao excluir produto.");
      return;
    }

    setCatalogFeedback("Produto excluído com sucesso.");
    await loadCatalog();
  };

  const addBlockedDay = async (date: string, funcionario: number) => {
    if (role !== "administrador") return;

    const response = await fetch("/api/portal/blocked-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: date, funcionario }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setCatalogFeedback(data.error ?? "Falha ao criar bloqueio.");
      return;
    }

    setCatalogFeedback(funcionario === 0 ? "Feriado marcado com sucesso." : "Férias/folga marcada com sucesso.");
    await loadCatalog();
  };

  const addHoliday = async () => {
    if (!holidayDate) {
      setCatalogFeedback("Selecione a data do feriado.");
      return;
    }
    await addBlockedDay(holidayDate, 0);
  };

  const addVacationRange = async () => {
    if (role !== "administrador") return;
    if (!agendaEmployeeId) {
      setCatalogFeedback("Selecione um profissional para férias.");
      return;
    }
    if (!vacationFrom || !vacationTo) {
      setCatalogFeedback("Selecione início e fim das férias.");
      return;
    }
    if (vacationFrom > vacationTo) {
      setCatalogFeedback("A data inicial das férias deve ser menor ou igual à final.");
      return;
    }

    const start = new Date(`${vacationFrom}T00:00:00`);
    const end = new Date(`${vacationTo}T00:00:00`);
    const requests: Promise<Response>[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      requests.push(
        fetch("/api/portal/blocked-days", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: cursor.toISOString().slice(0, 10), funcionario: agendaEmployeeId }),
        }),
      );
    }

    const results = await Promise.all(requests);
    const failed = results.find((response) => !response.ok);
    if (failed) {
      const data = (await failed.json()) as { error?: string };
      setCatalogFeedback(data.error ?? "Falha ao marcar período de férias.");
      return;
    }

    setCatalogFeedback("Período de férias marcado com sucesso.");
    await loadCatalog();
  };

  const removeBlockedDay = async (blockedDayId: number) => {
    if (role !== "administrador") return;

    const response = await fetch(`/api/portal/blocked-days?id=${blockedDayId}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setCatalogFeedback(data.error ?? "Falha ao remover bloqueio.");
      return;
    }

    setCatalogFeedback("Bloqueio removido com sucesso.");
    await loadCatalog();
  };

  const createEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmployeeCreateFeedback(null);
    setEmployeeCreateSaving(true);

    try {
      const response = await fetch("/api/portal/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEmployeeCreateFeedback(data.error ?? "Falha ao criar funcionário.");
        return;
      }

      setNewEmployee({
        nome: "",
        email: "",
        cpf: "",
        telefone: "",
        serviceIds: [],
        days: DEFAULT_WORK_DAYS.map((day) => ({ ...day })),
      });
      setEmployeeCreateFeedback(null);
      setShowCreateEmployeeModal(false);

      await loadCatalog();
    } finally {
      setEmployeeCreateSaving(false);
    }
  };

  const openUpdateEmployeeModal = (employee: Employee) => {
    const confirmed = window.confirm(`Deseja editar o funcionário "${employee.nome}"?`);
    if (!confirmed) return;

    setEmployeeUpdateFeedback(null);
    setEditingEmployeeId(employee.id);
    setEditingEmployee({
      nome: employee.nome,
      email: employee.email,
      cpf: employee.cpf,
      telefone: employee.telefone ?? "",
      serviceIds: employeeLinks.filter((link) => link.funcionario === employee.id).map((link) => link.servico),
    });
    setShowUpdateEmployeeModal(true);
  };

  const deleteEmployee = async (employee: Employee) => {
    const confirmed = window.confirm(`Deseja excluir o funcionário "${employee.nome}"?`);
    if (!confirmed) return;

    setEmployeeListFeedback(null);
    setEmployeeDeleteSavingId(employee.id);
    try {
      const response = await fetch(`/api/portal/admin/employees/${employee.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string; softDeleted?: boolean };
      if (!response.ok) {
        setEmployeeListFeedback(data.error ?? "Falha ao excluir funcionário.");
        return;
      }

      setEmployeeListFeedback(data.softDeleted ? "Funcionário excluído com sucesso." : "Funcionário removido com sucesso.");
      await loadCatalog();
    } finally {
      setEmployeeDeleteSavingId(null);
    }
  };

  const updateEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEmployeeId) return;
    const confirmed = window.confirm("Confirma salvar as alterações deste funcionário?");
    if (!confirmed) return;

    setEmployeeUpdateFeedback(null);
    setEmployeeUpdateSaving(true);
    try {
      const response = await fetch(`/api/portal/admin/employees/${editingEmployeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEmployee),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setEmployeeUpdateFeedback(data.error ?? "Falha ao atualizar funcionário.");
        return;
      }

      setEmployeeUpdateFeedback("Funcionário atualizado com sucesso.");
      setShowUpdateEmployeeModal(false);
      await loadCatalog();
    } finally {
      setEmployeeUpdateSaving(false);
    }
  };

  return (
    <div
      className={`min-w-0 w-full max-w-full space-y-6 overflow-x-hidden transition-all duration-300 ${
        sidebarCollapsed ? "lg:ml-24 lg:w-[calc(100%-6rem)]" : "lg:ml-72 lg:w-[calc(100%-18rem)]"
      }`}
    >
      <div className="flex items-center justify-between rounded-2xl bg-brand-900 px-4 py-3 text-white shadow-soft">
        <h2 className="text-lg font-bold md:text-xl">{currentSectionTitle}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-brand-700 p-2 text-white lg:hidden"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            <KebabIcon />
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[84vw] max-w-xs bg-brand-900 p-4 text-white shadow-soft">
            <div className="mb-4 flex items-center justify-between border-b border-brand-700 pb-3">
              <p className="text-base font-bold">Menu</p>
              <button
                type="button"
                className="rounded-lg bg-brand-700 p-2"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <nav className="space-y-2">
              {sidebarLinks.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => {
                    setActiveSection(link.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    activeSection === link.key ? "bg-brand-700 text-white" : "text-white/80 hover:bg-brand-700/60"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{link.label}</span>
                  </span>
                </button>
              ))}
            </nav>
            <div className="mt-4 border-t border-brand-700 pt-3">
              <PortalSignOutButton variant="dark" />
            </div>
          </aside>
        </div>
      ) : null}

      <OverviewSection
        role={role}
        range={range}
        setRange={setRange}
        dashboard={dashboard}
        sidebarLinks={sidebarLinks}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        todayAppointments={todayAppointments}
        lowStockProducts={lowStockProducts}
        maxChartValue={maxChartValue}
      />

      {activeSection === "catalog" ? (
      <div id="catalog" className="space-y-4 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
        <h3 className="text-xl font-bold text-slate-900">Catálogo (serviços e produtos)</h3>
        {catalogFeedback ? <p className="text-sm text-slate-600">{catalogFeedback}</p> : null}

        <details className="rounded-2xl border border-slate-200 p-4">
          <summary className="cursor-pointer font-semibold text-slate-900">Serviços</summary>
          <div className="mt-4 flex justify-end">
            <button type="button" className="legacy-button" onClick={openCreateServiceModal}>
              Adicionar serviço
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Tempo</th>
                  <th className="px-3 py-2">Ativo</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                          <Image src={serviceImageSrc(service.foto)} alt={service.nome} fill className="object-cover" />
                        </div>
                        <span>{service.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{service.categoria ? (categoryNameById.get(service.categoria) ?? `#${service.categoria}`) : "-"}</td>
                    <td className="px-3 py-2">{String(service.valor ?? 0)}</td>
                    <td className="px-3 py-2">{String(service.tempo ?? 30)}</td>
                    <td className="px-3 py-2">{service.ativo ?? "Sim"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => openEditServiceModal(service)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir serviço ${service.nome}`}
                          className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                          onClick={() => deleteService(service.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!services.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={6}>Nenhum serviço encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </details>

        <details className="rounded-2xl border border-slate-200 p-4">
          <summary className="cursor-pointer font-semibold text-slate-900">Produtos</summary>
          <div className="mt-4 flex justify-end">
            <button type="button" className="legacy-button" onClick={openCreateProductModal}>
              Adicionar produto
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Estoque</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                          <Image src={productImageSrc(product.foto)} alt={product.nome} fill className="object-cover" />
                        </div>
                        <span>{product.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{product.descricao ?? "-"}</td>
                    <td className="px-3 py-2">{product.categoria ?? "-"}</td>
                    <td className="px-3 py-2">{String(product.valor_venda ?? 0)}</td>
                    <td className="px-3 py-2">{String(product.estoque ?? 0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700" onClick={() => openEditProductModal(product)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir produto ${product.nome}`}
                          className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!products.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={6}>Nenhum produto encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      ) : null}

      {activeSection === "profile" ? (
      <div id="profile" className="rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
        <h3 className="text-xl font-bold text-slate-900">Alterar dados</h3>
        <form className="mt-4 grid gap-3" onSubmit={saveProfile}>
          <label className="text-sm font-semibold">Nome</label>
          <input className="form-field" value={profile.nome ?? ""} onChange={(e) => setProfile({ ...profile, nome: e.target.value })} required />
          <label className="text-sm font-semibold">E-mail</label>
          <input className="form-field" type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
          <label className="text-sm font-semibold">CPF</label>
          <input className="form-field" value={profile.cpf ?? ""} onChange={(e) => setProfile({ ...profile, cpf: e.target.value })} required />
          <label className="text-sm font-semibold">Telefone</label>
          <input className="form-field" value={profile.telefone ?? ""} onChange={(e) => setProfile({ ...profile, telefone: e.target.value })} />
          <label className="text-sm font-semibold">Endereço</label>
          <input className="form-field" value={profile.endereco ?? ""} onChange={(e) => setProfile({ ...profile, endereco: e.target.value })} />
          <label className="text-sm font-semibold">Nova senha (opcional)</label>
          <input className="form-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button className="legacy-button" type="submit">Salvar alterações</button>
          {profileFeedback ? <p className="text-sm text-slate-600">{profileFeedback}</p> : null}
        </form>
      </div>
      ) : null}

      {activeSection === "schedule" ? (
      <div id="schedule" className="rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
        <h3 className="text-xl font-bold text-slate-900">Meus dias e horários</h3>
        <p className="mt-2 text-sm text-slate-500">Grade fixa com os 7 dias da semana e intervalo de almoço/pausa.</p>
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-5">
            <span>Dia</span>
            <span>Hora inicial</span>
            <span>Hora final</span>
            <span>Almoço/Pausa - início</span>
            <span>Almoço/Pausa - final</span>
          </div>
          {myDays.map((day, index) => (
            <div key={`${day.dia}-${index}`} className="grid gap-2 md:grid-cols-5">
              <input className="form-field bg-slate-50" value={day.dia} readOnly />
              <input className="form-field" value={day.inicio} onChange={(e) => setMyDays((d) => d.map((x, i) => (i === index ? { ...x, inicio: e.target.value } : x)))} />
              <input className="form-field" value={day.final} onChange={(e) => setMyDays((d) => d.map((x, i) => (i === index ? { ...x, final: e.target.value } : x)))} />
              <input
                className="form-field"
                value={day.inicio_almoco ?? "12:00:00"}
                onChange={(e) => setMyDays((d) => d.map((x, i) => (i === index ? { ...x, inicio_almoco: e.target.value } : x)))}
                placeholder="Início almoço"
              />
              <input
                className="form-field"
                value={day.final_almoco ?? "13:00:00"}
                onChange={(e) => setMyDays((d) => d.map((x, i) => (i === index ? { ...x, final_almoco: e.target.value } : x)))}
                placeholder="Fim almoço"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="legacy-button w-full sm:w-auto" onClick={saveMySchedule}>Salvar horário</button>
        </div>
      </div>
      ) : null}

      {activeSection === "myAgenda" ? (
      <div id="my-agenda" className="space-y-4 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <input className="form-field w-full md:w-56" type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)} />
          {role === "administrador" ? (
            <>
              <select className="form-field w-full md:w-64" value={agendaEmployeeId} onChange={(e) => setAgendaEmployeeId(Number(e.target.value))}>
                <option value={0}>Todos os profissionais</option>
                {professionals.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </>
          ) : null}
        </div>

        {role === "administrador" ? (
          <details className="rounded-2xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Feriados e férias</summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  className="form-field"
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                />
                <button type="button" className="rounded-full bg-slate-100 px-4 py-2 text-sm" onClick={addHoliday}>
                  Marcar feriado (data única)
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  className="form-field"
                  type="date"
                  value={vacationFrom}
                  onChange={(e) => setVacationFrom(e.target.value)}
                />
                <input
                  className="form-field"
                  type="date"
                  value={vacationTo}
                  onChange={(e) => setVacationTo(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-900"
                  onClick={addVacationRange}
                  disabled={!agendaEmployeeId}
                >
                  Marcar férias (período)
                </button>
              </div>
              <p className="text-xs text-slate-500">Selecione um profissional para férias. Feriado geral bloqueia todos.</p>
            </div>
          </details>
        ) : null}

        {role === "administrador" ? (
          <details className="rounded-2xl border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold">Bloqueios do dia selecionado</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {blockedDays.filter((item) => item.data === agendaDate).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                  onClick={() => removeBlockedDay(item.id)}
                >
                  Remover {Number(item.funcionario ?? 0) === 0 ? "feriado geral" : `bloqueio #${item.funcionario}`}
                </button>
              ))}
              {!blockedDays.some((item) => item.data === agendaDate) ? <span className="text-sm text-slate-500">Nenhum bloqueio para este dia.</span> : null}
            </div>
          </details>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[680px] lg:min-w-[860px] rounded-2xl border border-slate-200">
            <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns: agendaGridColumns }}>
              <div className="px-2 py-2 text-xs font-semibold text-slate-500">Hora</div>
              {selectedAgendaProfessionals.map((professional) => (
                <div key={professional.id} className="px-2 py-2 text-sm font-semibold text-slate-800">
                  {professional.nome}
                  {blockedByEmployeeAndDate.has(`${agendaDate}::0`) || blockedByEmployeeAndDate.has(`${agendaDate}::${professional.id}`) ? (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Indisponível</span>
                  ) : null}
                </div>
              ))}
            </div>

            {agendaTimes.map((slot) => (
              <div key={slot} className="grid border-b border-slate-100" style={{ gridTemplateColumns: agendaGridColumns }}>
                <div className="px-2 py-2 text-xs text-slate-500">{slot}</div>
                {selectedAgendaProfessionals.map((professional) => {
                  const appointment = appointmentsBySlot.get(`${professional.id}::${slot}`);
                  return (
                    <div key={`${professional.id}-${slot}`} className="min-h-10 border-l border-slate-100 px-2 py-1">
                      {appointment ? (
                        <div className="rounded-xl bg-brand-100 px-2 py-1 text-xs text-brand-900">
                          <p className="font-semibold">{appointment.clientName}</p>
                          <p>{appointment.serviceName}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : null}

      {activeSection === "appointments" ? (
      <div id="appointments" className="rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-slate-900">Todos os agendamentos</h3>
          {role === "administrador" ? (
            <select
              className="form-field w-full sm:w-80"
              value={appointmentCustomerFilter || ""}
              onChange={(event) => setAppointmentCustomerFilter(event.target.value ? Number(event.target.value) : 0)}
            >
              <option value="">Todos os clientes</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nome} ({customer.cpf})
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Profissional</th>
                <th className="px-3 py-2">Serviço</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-2">{item.time}</td>
                  <td className="px-3 py-2">{item.clientName}</td>
                  <td className="px-3 py-2">{item.professionalName}</td>
                  <td className="px-3 py-2">{item.serviceName}</td>
                  <td className="px-3 py-2">{currency(item.serviceValue)}</td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))}
              {!filteredAppointments.length ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={7}>Nenhum agendamento encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

      {role === "administrador" && activeSection === "employees" ? (
        <div id="employees" className="space-y-6 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-900">Funcionários e serviços</h3>
            <button
              type="button"
              className="legacy-button"
              onClick={() => {
                setEmployeeCreateFeedback(null);
                setShowCreateEmployeeModal(true);
              }}
            >
              Adicionar funcionário
            </button>
          </div>
          {employeeListFeedback ? <p className="text-sm text-slate-600">{employeeListFeedback}</p> : null}

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Cargo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="w-[24%] px-3 py-2">Serviços</th>
                  <th className="w-28 px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{employee.nome}</td>
                    <td className="px-3 py-2">{employee.cpf}</td>
                    <td className="px-3 py-2">{employee.email}</td>
                    <td className="px-3 py-2">{employee.telefone || "-"}</td>
                    <td className="px-3 py-2">{employee.nivel || "Barbeiro"}</td>
                    <td className="px-3 py-2">{employee.ativo || "-"}</td>
                    <td className="px-3 py-2 break-words">{(employeeServicesById.get(employee.id) ?? []).join(", ") || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                          onClick={() => openUpdateEmployeeModal(employee)}
                          aria-label={`Editar ${employee.nome}`}
                          title="Editar funcionário"
                        >
                          <Pencil size={16} />
                        </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => deleteEmployee(employee)}
                        disabled={employeeDeleteSavingId === employee.id || (employee.nivel ?? "").toLowerCase() === "administrador"}
                        aria-label={`Excluir ${employee.nome}`}
                        title={employeeDeleteSavingId === employee.id ? "Excluindo..." : "Excluir funcionário"}
                      >
                        <Trash2 size={16} />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!employees.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={8}>
                      Nenhum funcionário cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

        </div>
      ) : null}

      {role === "administrador" && activeSection === "customers" ? (
        <div id="customers" className="space-y-6 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
          <h3 className="text-xl font-bold text-slate-900">Clientes cadastrados</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Nascimento</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{customer.nome}</td>
                    <td className="px-3 py-2">{customer.cpf}</td>
                    <td className="px-3 py-2">{customer.telefone || "-"}</td>
                    <td className="px-3 py-2">{customer.email || "-"}</td>
                    <td className="px-3 py-2">
                      {customer.data_nasc ? new Date(`${customer.data_nasc}T00:00:00`).toLocaleDateString("pt-BR") : "-"}
                    </td>
                  </tr>
                ))}
                {!customers.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      Nenhum cliente cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {role === "administrador" && activeSection === "finance" ? (
        <div id="finance" className="space-y-6 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
          <details className="rounded-2xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold text-slate-900">Chaves do Mercado Pago</summary>
            <form className="mt-4 grid gap-3" onSubmit={savePaymentSettings}>
              <label className="text-sm font-medium text-slate-700">Public Key</label>
              <input
                className="form-field"
                placeholder="APP_USR-..."
                value={paymentSettings.public_key_mp}
                onChange={(e) => setPaymentSettings((prev) => ({ ...prev, public_key_mp: e.target.value }))}
              />
              <label className="text-sm font-medium text-slate-700">Access Token</label>
              <input
                className="form-field"
                type="password"
                placeholder="APP_USR-..."
                value={paymentSettings.access_token_mp}
                onChange={(e) => setPaymentSettings((prev) => ({ ...prev, access_token_mp: e.target.value }))}
              />
              <div className="flex items-center gap-3">
                <button type="submit" className="legacy-button" disabled={paymentSettingsSaving}>
                  {paymentSettingsSaving ? "Salvando..." : "Salvar chaves"}
                </button>
                {paymentSettingsFeedback ? <p className="text-sm text-slate-600">{paymentSettingsFeedback}</p> : null}
              </div>
            </form>
          </details>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">Dia da reserva</th>
                  <th className="px-3 py-2">Serviço</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Tipo de pagamento</th>
                  <th className="px-3 py-2">Sucesso</th>
                </tr>
              </thead>
              <tbody>
                {financeRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.cliente_nome}</td>
                    <td className="px-3 py-2">{row.cliente_cpf}</td>
                    <td className="px-3 py-2">{new Date(`${row.data_reserva}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2">{row.servico_nome}</td>
                    <td className="px-3 py-2">{currency(Number(row.valor ?? 0))}</td>
                    <td className="px-3 py-2">{row.tipo_pagamento ?? "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.sucesso ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {row.sucesso ? "Sim" : "Não"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!financeRows.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={7}>
                      Nenhum pagamento registrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {role === "administrador" && activeSection === "plans" ? (
        <div id="plans" className="space-y-6 rounded-[32px] bg-white p-4 shadow-soft sm:p-8">
          <h3 className="text-xl font-bold text-slate-900">Solicitacoes de planos</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Nome do cliente</th>
                  <th className="px-3 py-2">CPF</th>
                  <th className="px-3 py-2">Plano</th>
                  <th className="px-3 py-2">Data da solicitacao</th>
                  <th className="px-3 py-2">Situacao</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.cliente_nome}</td>
                    <td className="px-3 py-2">{row.cliente_cpf}</td>
                    <td className="px-3 py-2">{row.servico_nome}</td>
                    <td className="px-3 py-2">{new Date(row.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.sucesso ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {row.sucesso ? "Pago" : "Nao pago"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!planRows.length ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      Nenhuma solicitacao de plano registrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Modal
        open={catalogModal?.type === "service"}
        title={catalogModal?.mode === "edit" ? "Editar serviço" : "Adicionar serviço"}
        onClose={() => setCatalogModal(null)}
      >
        <form className="grid gap-3" onSubmit={submitServiceModal}>
          {catalogFeedback ? <p className="text-sm text-slate-600">{catalogFeedback}</p> : null}
          <label className="text-sm font-semibold">Nome do serviço</label>
          <input className="form-field" value={serviceForm.nome} onChange={(e) => setServiceForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          <label className="text-sm font-semibold">Categoria</label>
          <select
            className="form-field"
            value={serviceForm.categoriaNome}
            onChange={(e) => setServiceForm((prev) => ({ ...prev, categoriaNome: e.target.value }))}
          >
            <option value="">Sem categoria</option>
            {serviceCategories.map((category) => (
              <option key={category.id} value={category.nome}>
                {category.nome}
              </option>
            ))}
          </select>
          <label className="text-sm font-semibold">Valor</label>
          <input className="form-field" value={serviceForm.valor} onChange={(e) => setServiceForm((prev) => ({ ...prev, valor: e.target.value }))} required />
          <label className="text-sm font-semibold">Tempo (min)</label>
          <input className="form-field" value={serviceForm.tempo} onChange={(e) => setServiceForm((prev) => ({ ...prev, tempo: e.target.value }))} required />
          <label className="text-sm font-semibold">Ativo</label>
          <select className="form-field" value={serviceForm.ativo} onChange={(e) => setServiceForm((prev) => ({ ...prev, ativo: e.target.value }))}>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
          <label className="text-sm font-semibold">Foto do serviço</label>
          <input type="file" accept="image/*" onChange={(e) => setServiceForm((prev) => ({ ...prev, fotoFile: e.target.files?.[0] ?? null }))} />
          <button type="submit" className="legacy-button" disabled={catalogSaving}>
            {catalogSaving ? "Salvando..." : "Salvar serviço"}
          </button>
        </form>
      </Modal>

      <Modal
        open={catalogModal?.type === "product"}
        title={catalogModal?.mode === "edit" ? "Editar produto" : "Adicionar produto"}
        onClose={() => setCatalogModal(null)}
      >
        <form className="grid gap-3" onSubmit={submitProductModal}>
          {catalogFeedback ? <p className="text-sm text-slate-600">{catalogFeedback}</p> : null}
          <label className="text-sm font-semibold">Nome do produto</label>
          <input className="form-field" value={productForm.nome} onChange={(e) => setProductForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          <label className="text-sm font-semibold">Descrição</label>
          <input className="form-field" value={productForm.descricao} onChange={(e) => setProductForm((prev) => ({ ...prev, descricao: e.target.value }))} />
          <label className="text-sm font-semibold">Categoria (id)</label>
          <input className="form-field" value={productForm.categoria} onChange={(e) => setProductForm((prev) => ({ ...prev, categoria: e.target.value }))} />
          <label className="text-sm font-semibold">Valor de venda</label>
          <input className="form-field" value={productForm.valor_venda} onChange={(e) => setProductForm((prev) => ({ ...prev, valor_venda: e.target.value }))} required />
          <label className="text-sm font-semibold">Estoque</label>
          <input className="form-field" value={productForm.estoque} onChange={(e) => setProductForm((prev) => ({ ...prev, estoque: e.target.value }))} required />
          <label className="text-sm font-semibold">Foto do produto</label>
          <input type="file" accept="image/*" onChange={(e) => setProductForm((prev) => ({ ...prev, fotoFile: e.target.files?.[0] ?? null }))} />
          <button type="submit" className="legacy-button" disabled={catalogSaving}>
            {catalogSaving ? "Salvando..." : "Salvar produto"}
          </button>
        </form>
      </Modal>

      <Modal open={showUpdateEmployeeModal} title="Editar funcionário" onClose={() => setShowUpdateEmployeeModal(false)}>
        <form onSubmit={updateEmployee} className="grid gap-3">
          {employeeUpdateFeedback ? <p className="text-sm text-slate-600">{employeeUpdateFeedback}</p> : null}
          <input className="form-field" placeholder="Nome" value={editingEmployee.nome} onChange={(e) => setEditingEmployee((prev) => ({ ...prev, nome: e.target.value }))} required />
          <input className="form-field" type="email" placeholder="E-mail" value={editingEmployee.email} onChange={(e) => setEditingEmployee((prev) => ({ ...prev, email: e.target.value }))} required />
          <input className="form-field" placeholder="CPF" value={editingEmployee.cpf} onChange={(e) => setEditingEmployee((prev) => ({ ...prev, cpf: e.target.value }))} required />
          <input className="form-field" placeholder="Telefone" value={editingEmployee.telefone} onChange={(e) => setEditingEmployee((prev) => ({ ...prev, telefone: e.target.value }))} />

          <div className="grid gap-2">
            <p className="text-sm font-semibold">Serviços permitidos</p>
            <div className="grid gap-2 md:grid-cols-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingEmployee.serviceIds.includes(service.id)}
                    onChange={(e) =>
                      setEditingEmployee((prev) => ({
                        ...prev,
                        serviceIds: e.target.checked ? [...prev.serviceIds, service.id] : prev.serviceIds.filter((id) => id !== service.id),
                      }))
                    }
                  />
                  {service.nome}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="legacy-button" disabled={employeeUpdateSaving}>
            {employeeUpdateSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </Modal>

      <Modal open={showCreateEmployeeModal} title="Adicionar funcionário" onClose={() => setShowCreateEmployeeModal(false)}>
        <form onSubmit={createEmployee} className="grid gap-3">
          {employeeCreateFeedback ? <p className="text-sm text-slate-600">{employeeCreateFeedback}</p> : null}
          <input className="form-field" placeholder="Nome" value={newEmployee.nome} onChange={(e) => setNewEmployee({ ...newEmployee, nome: e.target.value })} required />
          <input className="form-field" type="email" placeholder="E-mail" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} required />
          <input className="form-field" placeholder="CPF" value={newEmployee.cpf} onChange={(e) => setNewEmployee({ ...newEmployee, cpf: e.target.value })} required />
          <input className="form-field" placeholder="Telefone" value={newEmployee.telefone} onChange={(e) => setNewEmployee({ ...newEmployee, telefone: e.target.value })} />
          <p className="text-sm text-slate-600">Senha padrão criada: <strong>senha123</strong></p>

          <div className="grid gap-2">
            <p className="text-sm font-semibold">Serviços permitidos</p>
            <div className="grid gap-2 md:grid-cols-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newEmployee.serviceIds.includes(service.id)}
                    onChange={(e) => setNewEmployee((prev) => ({
                      ...prev,
                      serviceIds: e.target.checked ? [...prev.serviceIds, service.id] : prev.serviceIds.filter((id) => id !== service.id),
                    }))}
                  />
                  {service.nome}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="legacy-button" disabled={employeeCreateSaving}>
            {employeeCreateSaving ? "Criando..." : "Criar funcionário"}
          </button>
        </form>
      </Modal>

    </div>
  );
}
