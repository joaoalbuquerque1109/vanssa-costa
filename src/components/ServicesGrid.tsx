"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CategoryRow, ServiceRow } from "@/types/site";
import { currency, serviceImageSrc } from "@/lib/utils";

export function ServicesGrid({
  services,
  categories,
  compact = false,
}: {
  services: ServiceRow[];
  categories: CategoryRow[];
  compact?: boolean;
}) {
  const items = compact ? services.slice(0, 8) : services;
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: -1 | 1) => {
    const element = carouselRef.current;
    if (!element) return;
    const scrollAmount = Math.max(element.clientWidth * 0.85, 320);
    element.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  };

  return (
    <section className="section-padding bg-slate-50">
      <div className="container-shell">
        <h2 className="section-title">Nossos Servicos</h2>
        <p className="section-subtitle">{categories.map((category) => category.nome).join(" / ")}</p>

        {compact ? (
          <>
            <div className="relative mt-12">
              <button
                type="button"
                className="absolute -left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 md:-left-5"
                onClick={() => scrollCarousel(-1)}
                aria-label="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="absolute -right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 md:-right-5"
                onClick={() => scrollCarousel(1)}
                aria-label="Proximo"
              >
                <ChevronRight size={20} />
              </button>

              <div
                ref={carouselRef}
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {items.map((service) => (
                  <article key={service.id} className="card-shell min-w-[250px] snap-start overflow-hidden sm:min-w-[280px] lg:min-w-[300px]">
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <Image src={serviceImageSrc(service.foto)} alt={service.nome} fill className="object-cover" />
                    </div>
                    <div className="space-y-3 p-5">
                      <h3 className="text-lg font-semibold text-slate-900">{service.nome}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-500 sm:text-sm">
                        <span>{service.tempo} min</span>
                        <span className="font-bold text-brand-700">{currency(Number(service.valor))}</span>
                      </div>
                      <Link href={`/agendamentos?servico=${service.id}`} className="legacy-button w-full">
                        Agendar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {items.map((service) => (
              <article key={service.id} className="card-shell overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={serviceImageSrc(service.foto)} alt={service.nome} fill className="object-cover" />
                </div>
                <div className="space-y-4 p-6">
                  <h3 className="text-xl font-semibold text-slate-900">{service.nome}</h3>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{service.tempo} min</span>
                    <span className="font-bold text-brand-700">{currency(Number(service.valor))}</span>
                  </div>
                  <Link href={`/agendamentos?servico=${service.id}`} className="legacy-button w-full">
                    Agendar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {compact ? (
          <div className="mt-10 text-center">
            <Link href="/servicos" className="legacy-button">
              Ver mais servicos
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
