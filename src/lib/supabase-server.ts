import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // In Server Components, Next.js exposes a read-only cookie store.
          // Route Handlers/Server Actions can still persist cookies normally.
        }
      },
    },
  });
};

function isInvalidRefreshTokenError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "refresh_token_not_found";
}

function isMissingSessionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "__isAuthError" in error &&
    (error as { __isAuthError?: boolean; status?: number; message?: string }).__isAuthError === true &&
    (error as { status?: number }).status === 400 &&
    String((error as { message?: string }).message ?? "").toLowerCase().includes("auth session missing")
  );
}

export async function getServerAuthUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<User | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isInvalidRefreshTokenError(error) || isMissingSessionError(error)) return null;
      throw error;
    }

    return data.user ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error) || isMissingSessionError(error)) return null;
    throw error;
  }
}
