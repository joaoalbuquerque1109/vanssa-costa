"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";

export function PortalSignOutButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const onSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.assign("/acesso-cliente");
  };

  return (
    <button
      type="button"
      className={
        variant === "dark"
          ? "w-full rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          : "rounded-full border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
      }
      onClick={onSignOut}
    >
      Sair
    </button>
  );
}
