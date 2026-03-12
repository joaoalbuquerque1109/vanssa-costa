
import Link from "next/link";
import type { BannerRow, ConfigRow } from "@/types/site";
import { phoneToWhatsApp } from "@/lib/utils";

export function HeroSection({ banners, config }: { banners: BannerRow[]; config: ConfigRow }) {
  const banner = banners[0];
  return (
    <section className="hero-background relative overflow-hidden py-24 text-white md:py-32">
      <div className="container-shell">
        <div className="max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/35 p-8 shadow-soft backdrop-blur-md md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-100">Vanessa Costa</p>
          <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">{banner?.titulo ?? config.nome}</h1>
          <p className="mt-6 text-lg leading-8 text-white/80">{banner?.descricao}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/agendamentos" className="legacy-button">Agendar agora</Link>
            <Link href={phoneToWhatsApp(config.telefone_whatsapp)} target="_blank" className="outline-button">
              Contate-nos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
