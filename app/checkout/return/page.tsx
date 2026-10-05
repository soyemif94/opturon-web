import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CheckoutReturnStatus } from "@/components/billing/CheckoutReturnStatus";
import { authOptions } from "@/lib/auth";

export default async function CheckoutReturnPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/checkout/return")}`);
  const role = String(session.user.tenantRole || "").trim().toLowerCase();
  if (String(session.user.accountScope || "").trim().toLowerCase() !== "client"
    || !session.user.tenantId || !["owner", "manager"].includes(role)) {
    return <main className="container-opt py-20"><h1 className="text-2xl font-semibold">No pudimos consultar este checkout</h1><p className="mt-3 text-sm text-muted">Ingresá con la cuenta propietaria o gerente del espacio.</p></main>;
  }
  return <CheckoutReturnStatus />;
}
