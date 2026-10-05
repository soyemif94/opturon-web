import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { CheckoutStartClient } from "@/components/billing/CheckoutStartClient";

const fixedPlanKeys = new Set(["core", "growth", "distribution"]);

export default async function CheckoutStartPage({ searchParams }: { searchParams: Promise<{ planKey?: string | string[] }> }) {
  const params = await searchParams;
  const requested = Array.isArray(params.planKey) ? "" : String(params.planKey || "").trim().toLowerCase();
  if (requested === "enterprise") redirect("/contacto");
  if (!fixedPlanKeys.has(requested)) {
    return <CheckoutMessage title="No pudimos identificar el plan" detail="Volvé a planes y elegí una opción vigente." />;
  }

  const callbackUrl = `/checkout/start?planKey=${encodeURIComponent(requested)}`;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const role = String(session.user.tenantRole || "").trim().toLowerCase();
  const scope = String(session.user.accountScope || "").trim().toLowerCase();
  if (scope !== "client" || !session.user.tenantId || !session.user.id || !["owner", "manager"].includes(role)) {
    return <CheckoutMessage title="No tenés permisos para gestionar el plan" detail="Pedile a la persona propietaria del espacio que inicie el checkout." />;
  }

  return <CheckoutStartClient planKey={requested as "core" | "growth" | "distribution"} />;
}

function CheckoutMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="container-opt flex min-h-[70vh] items-center justify-center py-12">
      <Card className="max-w-xl p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
        <Link href="/" className="mt-6 inline-flex font-semibold text-brandBright underline-offset-4 hover:underline">Volver al inicio</Link>
      </Card>
    </main>
  );
}
