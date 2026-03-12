import { createSupabaseServerClient } from "@/lib/supabase-server";

export type PortalRole = "funcionario" | "administrador";

export type UserProfileRow = {
  auth_user_id: string;
  role: PortalRole;
  cliente_id: number | null;
  usuario_id: number | null;
};

export type PortalSession = {
  authUserId: string;
  email: string | null;
  profile: UserProfileRow;
};

export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return null;

  let { data: profile } = await supabase
    .from("user_profiles")
    .select("auth_user_id, role, cliente_id, usuario_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<UserProfileRow>();

  if (!profile && user.email) {
    const { data: employee } = await supabase
      .from("usuarios")
      .select("id,nivel")
      .eq("email", user.email)
      .limit(1)
      .maybeSingle<{ id: number; nivel: string | null }>();

    if (employee?.id) {
      const role: PortalRole = employee.nivel?.toLowerCase() === "administrador" ? "administrador" : "funcionario";

      const { data: insertedProfile } = await supabase
        .from("user_profiles")
        .upsert(
          {
            auth_user_id: user.id,
            role,
            cliente_id: null,
            usuario_id: employee.id,
          },
          { onConflict: "auth_user_id" },
        )
        .select("auth_user_id, role, cliente_id, usuario_id")
        .maybeSingle<UserProfileRow>();

      profile = insertedProfile ?? null;
    }
  }

  if (!profile || !profile.usuario_id) return null;

  if (profile.role === "funcionario") {
    const { data: userLevel } = await supabase
      .from("usuarios")
      .select("nivel")
      .eq("id", profile.usuario_id)
      .limit(1)
      .maybeSingle<{ nivel: string | null }>();

    if (userLevel?.nivel?.toLowerCase() === "administrador") {
      const { data: upgradedProfile } = await supabase
        .from("user_profiles")
        .update({ role: "administrador", updated_at: new Date().toISOString() })
        .eq("auth_user_id", user.id)
        .select("auth_user_id, role, cliente_id, usuario_id")
        .maybeSingle<UserProfileRow>();

      profile = upgradedProfile ?? profile;
    }
  }

  return {
    authUserId: user.id,
    email: user.email ?? null,
    profile,
  };
}

export type DashboardRange = "day" | "week" | "month" | "quarter" | "semester" | "year" | "custom";

export function getRangeDates(range: DashboardRange, customFrom?: string | null, customTo?: string | null) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "day") return { start, end };

  if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    return { start, end };
  }

  if (range === "month") {
    start.setDate(1);
    return { start, end };
  }

  if (range === "quarter") {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    return { start, end };
  }

  if (range === "semester") {
    const semesterStartMonth = start.getMonth() < 6 ? 0 : 6;
    start.setMonth(semesterStartMonth, 1);
    return { start, end };
  }

  if (range === "year") {
    start.setMonth(0, 1);
    return { start, end };
  }

  if (customFrom && customTo) {
    const customStart = new Date(`${customFrom}T00:00:00`);
    const customEnd = new Date(`${customTo}T23:59:59.999`);
    if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime())) {
      return { start: customStart, end: customEnd };
    }
  }

  return { start, end };
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function rangeLabel(range: DashboardRange) {
  if (range === "day") return "Dia";
  if (range === "week") return "Semana";
  if (range === "month") return "Mês";
  if (range === "quarter") return "Trimestre";
  if (range === "semester") return "Semestre";
  if (range === "year") return "Ano";
  return "Customizado";
}
