import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { ConfigRow } from "@/types/site";

const PAGE_CONFIG: ConfigRow = {
  id: 1,
  nome: "Vanessa Costa",
  email: "contato@vanessacosta.com.br",
  telefone_whatsapp: "(31) 99534-8118",
  endereco: "Rua X Número 150 - Centro - Belo Horizonte/MG",
  logo: "logo.png",
  icone_site: "favicon.png",
  texto_rodape: "Atendimento premium com foco em experiência, qualidade e pontualidade.",
  img_banner_index: "hero-bg.jpg",
  texto_sobre: "Somos um espaço de beleza com atendimento humanizado e profissionais especializados.",
  imagem_sobre: "area_sobre.jpg",
  instagram: "https://www.instagram.com/portal_hugo_cursos/",
  mapa: "",
};

export const metadata: Metadata = {
  title: PAGE_CONFIG.nome,
  description: "Site institucional com agendamento, portal e pagamento online.",
  icons: {
    icon: `/images/${PAGE_CONFIG.icone_site ?? "favicon.png"}`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <Header config={PAGE_CONFIG} />
        {children}
        <Footer config={PAGE_CONFIG} />
      </body>
    </html>
  );
}
