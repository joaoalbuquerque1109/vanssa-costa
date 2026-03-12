import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { getPortalSession } from "@/lib/portal";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const session = await getPortalSession();

  if (!session) {
    redirect("/acesso-cliente");
  }

  const role = session.profile.role;

  return (
    <section className="py-4">
      <div className="w-full space-y-4 px-4 lg:px-6">
        <EmployeeDashboard role={role} />
      </div>
    </section>
  );
}
