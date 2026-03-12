"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ConfigRow, ProductRow } from "@/types/site";
import { currency, phoneToWhatsApp, productImageSrc } from "@/lib/utils";

export function ProductsGrid({
  products,
  config,
  compact = false,
}: {
  products: ProductRow[];
  config: ConfigRow;
  compact?: boolean;
}) {
  const items = compact ? products.slice(0, 8) : products;
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: -1 | 1) => {
    const element = carouselRef.current;
    if (!element) return;
    const scrollAmount = Math.max(element.clientWidth * 0.85, 320);
    element.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  };

  return (
    <section className="section-padding">
      <div className="container-shell">
        <h2 className="section-title">Nossos Produtos</h2>
        <p className="section-subtitle">
          Confira alguns de nossos produtos, damos desconto caso compre em grande quantidade.
        </p>

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
                {items.map((product) => (
                  <article key={product.id} className="card-shell min-w-[250px] snap-start overflow-hidden sm:min-w-[280px] lg:min-w-[300px]">
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <Image src={productImageSrc(product.foto)} alt={product.nome} fill className="object-cover" />
                    </div>
                    <div className="space-y-3 p-5">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{product.nome}</h3>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{product.descricao}</p>
                      </div>
                      <div className="font-bold text-brand-700">{currency(Number(product.valor_venda))}</div>
                      <Link
                        href={`${phoneToWhatsApp(config.telefone_whatsapp)}&text=${encodeURIComponent(
                          `Ola, gostaria de saber mais informacoes sobre o produto ${product.nome}`,
                        )}`}
                        target="_blank"
                        className="legacy-button w-full"
                      >
                        Comprar agora
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {items.map((product) => (
              <article key={product.id} className="card-shell overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={productImageSrc(product.foto)} alt={product.nome} fill className="object-cover" />
                </div>
                <div className="space-y-4 p-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{product.nome}</h3>
                    <p className="mt-2 text-sm text-slate-500">{product.descricao}</p>
                  </div>
                  <div className="font-bold text-brand-700">{currency(Number(product.valor_venda))}</div>
                  <Link
                    href={`${phoneToWhatsApp(config.telefone_whatsapp)}&text=${encodeURIComponent(
                      `Ola, gostaria de saber mais informacoes sobre o produto ${product.nome}`,
                    )}`}
                    target="_blank"
                    className="legacy-button w-full"
                  >
                    Comprar agora
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {compact ? (
          <div className="mt-10 text-center">
            <Link href="/produtos" className="legacy-button">
              Ver mais produtos
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
