"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  if (pathname.startsWith("/portal")) return null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-500 text-white lg:bg-brand-500/95 lg:backdrop-blur">
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
      </header>

      {mounted && mobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-[84vw] max-w-xs bg-brand-500 p-4 text-white shadow-soft">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <p className="text-base font-bold">Menu</p>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 p-2"
                    aria-label="Fechar menu"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm transition text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <Link
                    href={phoneToWhatsApp(config.telefone_whatsapp)}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                    target="_blank"
                  >
                    WhatsApp
                  </Link>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
