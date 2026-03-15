"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { TestimonialRow } from "@/types/site";

export function Testimonials({ testimonials }: { testimonials: TestimonialRow[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: -1 | 1) => {
    const element = carouselRef.current;
    if (!element) return;
    const scrollAmount = Math.max(element.clientWidth * 0.85, 280);
    element.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  };

  return (
    <section className="section-padding">
      <div className="container-shell">
        <h2 className="section-title">Depoimento dos nossos Clientes</h2>

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
            {testimonials.map((testimonial) => (
              <article key={testimonial.id} className="card-shell min-w-[250px] snap-start p-6 sm:min-w-[300px] lg:min-w-[360px]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-slate-900">{testimonial.nome}</h3>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`${testimonial.id}-${index}`} size={16} className={index < Number(testimonial.nota ?? 5) ? "fill-current" : ""} />
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{testimonial.texto}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/feedback" className="legacy-button">
            Deixar meu feedback
          </Link>
        </div>
      </div>
    </section>
  );
}
