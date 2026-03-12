export const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const phoneToWhatsApp = (phone: string) => `https://api.whatsapp.com/send?1=pt_BR&phone=55${phone.replace(/\D/g, "")}`;

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const toTimeLabel = (time: string) => time.slice(0, 5);

export const weekDayMap: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-Feira",
  2: "Terca-Feira",
  3: "Quarta-Feira",
  4: "Quinta-Feira",
  5: "Sexta-Feira",
  6: "Sabado",
};

const isAbsoluteUrl = (value?: string | null) => Boolean(value && /^(https?:)?\/\//i.test(value));

export const serviceImageSrc = (foto?: string | null) => {
  if (!foto) return "/sistema/painel/img/servicos/sem-foto.jpg";
  return isAbsoluteUrl(foto) ? foto : `/sistema/painel/img/servicos/${foto}`;
};

export const productImageSrc = (foto?: string | null) => {
  if (!foto) return "/sistema/painel/img/produtos/sem-foto.jpg";
  return isAbsoluteUrl(foto) ? foto : `/sistema/painel/img/produtos/${foto}`;
};

export const profileImageSrc = (foto?: string | null) => {
  if (!foto) return "/sistema/painel/img/perfil/sem-foto.jpg";
  return isAbsoluteUrl(foto) ? foto : `/sistema/painel/img/perfil/${foto}`;
};
