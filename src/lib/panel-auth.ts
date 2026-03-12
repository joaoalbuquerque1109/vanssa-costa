import { getPortalSession } from "@/lib/portal";

export async function requireEmployeeOrAdmin() {
  const session = await getPortalSession();

  if (!session || (session.profile.role !== "funcionario" && session.profile.role !== "administrador")) {
    return null;
  }

  return session;
}

export async function requireAdmin() {
  const session = await getPortalSession();

  if (!session || session.profile.role !== "administrador") {
    return null;
  }

  return session;
}
