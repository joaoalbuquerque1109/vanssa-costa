
import Image from "next/image";
import Link from "next/link";
import type { ConfigRow } from "@/types/site";
import { phoneToWhatsApp } from "@/lib/utils";

export function AboutSection({ config }: { config: ConfigRow }) {
  return (
    <section className="about-background py-16 text-white md:py-24">
      <div className="container-shell grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[32px]">
          <Image
            src={`/images/${config.imagem_sobre ?? "area_sobre.jpg"}`}
            alt="Sobre nós"
            fill
            className="object-cover"
          />
        </div>
        <div className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-100">Sobre nós</p>
          <h2 className="text-3xl font-bold md:text-4xl">Sobre Nós</h2>
          <p className="text-base leading-8 text-white/80">{config.texto_sobre}</p>
          <Link href={phoneToWhatsApp(config.telefone_whatsapp)} target="_blank" className="legacy-button">
            Mais informações
          </Link>
        </div>
      </div>
    </section>
  );
}
