"use client";

import { usePathname } from "next/navigation";
import type { ConfigRow } from "@/types/site";

export function Footer({ config }: { config: ConfigRow }) {
  const pathname = usePathname();
  if (pathname.startsWith("/portal")) return null;

  return (
    <footer className="bg-brand-500 py-12 text-white">
      <div className="container-shell grid gap-10 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-bold">{config.nome}</h3>
          <p className="mt-4 text-sm leading-7 text-white/80">{config.texto_rodape}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">Contatos</h4>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <p>{config.email}</p>
            <p>{config.telefone_whatsapp}</p>
            <p>{config.endereco}</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">Acessos</h4>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            <a href={config.instagram ?? "#"} target="_blank" className="block hover:text-white">
              Instagram
            </a>
            <a href="/portal" className="block hover:text-white">
              Área autenticada
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
