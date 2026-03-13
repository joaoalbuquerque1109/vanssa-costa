import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RouteTransitionOverlay } from "@/components/RouteTransitionOverlay";
import type { ConfigRow } from "@/types/site";

const PAGE_CONFIG: ConfigRow = {
  id: 1,
  nome: "Vanessa Costa",
  email: "vancostaracco@hotmail.com",
  telefone_whatsapp: "(83) 98751-6023",
  endereco: "Av. Gen. Edson Ramalho, 275 - Manaíra - João Pessoa/PB",
  logo: "logo.png",
  icone_site: "favicon.png",
  texto_rodape: "Atendimento premium com foco em experiência, qualidade e pontualidade.",
  img_banner_index: "hero-bg.jpg",
  texto_sobre: "Somos um espaço de beleza com atendimento humanizado e profissionais especializados.",
  imagem_sobre: "area_sobre.jpg",
  instagram: "https://www.instagram.com/vanessacostacachos/",
  mapa: "https://www.google.com/maps?q=Av.%20Gen.%20Edson%20Ramalho%2C%20275%20-%20Mana%C3%ADra%20-%20Jo%C3%A3o%20Pessoa%2FPB&z=17&output=embed",
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
        <RouteTransitionOverlay />
        <Header config={PAGE_CONFIG} />
        {children}
        <Footer config={PAGE_CONFIG} />
      </body>
    </html>
  );
}
