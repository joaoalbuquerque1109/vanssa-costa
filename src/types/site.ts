
export type ConfigRow = {
  id: number;
  nome: string;
  email: string;
  telefone_fixo?: string | null;
  telefone_whatsapp: string;
  endereco?: string | null;
  logo: string;
  icone?: string | null;
  logo_rel?: string | null;
  tipo_rel?: string | null;
  instagram?: string | null;
  texto_rodape?: string | null;
  img_banner_index: string;
  texto_sobre?: string | null;
  imagem_sobre?: string | null;
  icone_site?: string | null;
  mapa?: string | null;
  quantidade_cartoes?: number | null;
  texto_agendamento?: string | null;
  msg_agendamento?: string | null;
  url_video?: string | null;
  posicao_video?: string | null;
  entrada?: string | null;
};

export type BannerRow = { id: number; titulo: string; descricao: string };
export type CategoryRow = { id: number; nome: string };
export type ServiceRow = {
  id: number;
  nome: string;
  categoria: number;
  valor: number;
  foto: string;
  dias_retorno?: number | null;
  ativo?: string | null;
  comissao?: number | null;
  tempo: number;
};

export type ProfessionalRow = {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  foto?: string | null;
  ativo?: string | null;
  atendimento?: string | null;
  intervalo: number;
};

export type ScheduleRow = {
  id: number;
  dia: string;
  funcionario: number;
  inicio: string;
  final: string;
  inicio_almoco?: string | null;
  final_almoco?: string | null;
};

export type BlockedDayRow = {
  id: number;
  data: string;
  funcionario?: number | null;
};

export type ServiceProfessionalRow = {
  id: number;
  funcionario: number;
  servico: number;
};

export type ProductRow = {
  id: number;
  nome: string;
  descricao?: string | null;
  categoria?: number | null;
  valor_venda: number;
  estoque: number;
  foto: string;
};

export type TestimonialRow = {
  id: number;
  nome: string;
  texto: string;
  foto: string;
  ativo?: string | null;
};

export type SubscriptionGroupRow = { id: number; nome: string; ativo?: string | null };
export type SubscriptionItemRow = {
  id: number;
  grupo: number;
  nome: string;
  valor: number;
  ativo?: string | null;
  c1?: string | null;
  c2?: string | null;
  c3?: string | null;
  c4?: string | null;
  c5?: string | null;
  c6?: string | null;
  c7?: string | null;
  c8?: string | null;
  c9?: string | null;
  c10?: string | null;
  c11?: string | null;
  c12?: string | null;
};

export type AppointmentRow = {
  id: number;
  funcionario: number;
  cliente: number;
  data: string;
  hora: string;
  status: string;
  servico: number;
  obs?: string | null;
};

export type SiteData = {
  config: ConfigRow;
  banners: BannerRow[];
  categories: CategoryRow[];
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  serviceLinks: ServiceProfessionalRow[];
  schedules: ScheduleRow[];
  blockedDays: BlockedDayRow[];
  products: ProductRow[];
  testimonials: TestimonialRow[];
  subscriptionGroups: SubscriptionGroupRow[];
  subscriptionItems: SubscriptionItemRow[];
};
