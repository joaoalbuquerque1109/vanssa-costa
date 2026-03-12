"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { ConfigRow } from "@/types/site";
import { phoneToWhatsApp } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/agendamentos", label: "Agendamentos" },
  { href: "/assinatura", label: "Assinaturas" },
  { href: "/produtos", label: "Produtos" },
  { href: "/servicos", label: "Serviços" },
  { href: "/acesso-cliente", label: "Login Portal" },
];

function KebabBarsIcon() {
  return (
    <span className="inline-flex flex-col items-center justify-center gap-1" aria-hidden="true">
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
    </span>
  );
}

export function Header({ config }: { config: ConfigRow }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  if (pathname.startsWith("/portal")) return null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-500/95 text-white backdrop-blur">
      <div className="container-shell flex min-h-20 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/sistema/img/logo.png" alt={config.nome} width={180} height={48} priority />
        </Link>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/20 p-2 text-white lg:hidden"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <KebabBarsIcon />
        </button>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-white/90 transition hover:text-white">
              {item.label}
            </Link>
          ))}
          <Link
            href={phoneToWhatsApp(config.telefone_whatsapp)}
            className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            target="_blank"
          >
            WhatsApp
          </Link>
        </nav>
      </div>

      {mobileMenuOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/50"
            aria-label="Fechar menu lateral"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-[70] flex h-full w-[84vw] max-w-xs flex-col bg-brand-900 p-5 shadow-soft">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Menu</p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 p-2 text-white"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link
              href={phoneToWhatsApp(config.telefone_whatsapp)}
              className="mt-5 inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              target="_blank"
            >
              WhatsApp
            </Link>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
