import { CustomerAccess } from "@/components/CustomerAccess";
import { PageHero } from "@/components/PageHero";
import { getPortalSession } from "@/lib/portal";
import { redirect } from "next/navigation";

export default async function AcessoClientePage() {
  const session = await getPortalSession();

  if (session) {
    redirect("/portal");
  }

  return (
    <>
      <PageHero title="Acesso do Portal" subtitle="Login para administradores e funcionários." />
      <CustomerAccess />
    </>
  );
}
