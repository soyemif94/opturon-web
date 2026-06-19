import { PartnersAdminPrimaryAction, PartnersAdminWorkspace } from "@/components/app/PartnersAdminWorkspace";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { PARTNERS_ADMIN_ROUTE } from "@/lib/partners-admin-ui";
import { requireAppPage, requireOpturonAdminPage } from "@/lib/saas/access";
import { redirect } from "next/navigation";

type PartnersAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PartnersAdminPage({ searchParams }: PartnersAdminPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const previewMode = process.env.NODE_ENV !== "production" && String(params?.preview || "").trim().toLowerCase() === "1";

  if (previewMode) {
    const ctx = await requireAppPage();
    const isStaffPreviewUser = ctx.globalRole === "superadmin" || ctx.globalRole === "ops_admin";
    if (!isStaffPreviewUser) redirect("/app");
  } else {
    await requireOpturonAdminPage(PARTNERS_ADMIN_ROUTE);
  }

  return (
    <ClientPageShell
      title="Red de asesores"
      description="Gestiona asesores, jerarquias, clientes atribuidos y progreso comercial."
      badge="Opturon admin"
      action={<PartnersAdminPrimaryAction />}
    >
      <PartnersAdminWorkspace previewMode={previewMode} />
    </ClientPageShell>
  );
}
